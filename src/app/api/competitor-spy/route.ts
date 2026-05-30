import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { competitorSpySchema } from "@/lib/validators/schemas";
import {
  extractProductDataFromHtml,
  fetchSiteHtml,
} from "@/lib/scrape";
import { generateCompetitiveBriefsForConcept } from "@/lib/anthropic/competitive-brief";
import { reviewImage } from "@/lib/anthropic/review-image";
import { generateImage } from "@/lib/gemini/generate-image";
import {
  checkGenerationCredits,
  deductCredits,
} from "@/lib/credits";
import {
  CONCEPT_VARIANTS,
  DEFAULT_STYLE_SETTINGS,
  GENERATION_CREDIT_COST,
} from "@/lib/types";
import type {
  CompetitorData,
  Concept,
  ConceptVariant,
  Generation,
  Project,
  StyleSettings,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function extractSiteName(html: string): string | undefined {
  const m = html.match(
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
  );
  if (m?.[1]) return m[1].trim();
  return undefined;
}

function hostBrandFromUrl(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    if (!base) return undefined;
    return base
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return undefined;
  }
}

interface RenderResult {
  generation: Generation | null;
  error?: string;
}

async function renderOne(
  supabase: SupabaseClient,
  args: {
    project_id: string;
    concept_id: string;
    variant: ConceptVariant;
    brief_text: string;
    platform: StyleSettings["platform"];
    competitor_name: string | null;
    version: number;
  },
): Promise<RenderResult> {
  const { data: row, error: insErr } = await supabase
    .from("generations")
    .insert({
      project_id: args.project_id,
      concept_id: args.concept_id,
      concept_variant: args.variant,
      prompt_text: args.brief_text,
      status: "generating",
      version: args.version,
      qa_status: "pending",
      qa_issues: [],
      is_unlocked: true,
      is_competitive: true,
      competitor_name: args.competitor_name,
    })
    .select("*")
    .single();
  if (insErr || !row) {
    return { generation: null, error: insErr?.message ?? "insert_failed" };
  }

  let imageDataUrl: string;
  try {
    const result = await generateImage({
      prompt: args.brief_text,
      platform: args.platform,
    });
    imageDataUrl = result.imageDataUrl;
  } catch (err) {
    await supabase
      .from("generations")
      .update({ status: "failed" })
      .eq("id", row.id);
    return {
      generation: null,
      error: err instanceof Error ? err.message : "image_failed",
    };
  }

  const { data: updated } = await supabase
    .from("generations")
    .update({ status: "completed", image_url: imageDataUrl })
    .eq("id", row.id)
    .select("*")
    .single();
  let current = (updated as Generation | null) ?? (row as Generation);

  try {
    const review = await reviewImage({
      imageDataUrl,
      briefText: args.brief_text,
    });
    const qa_status = review.passed
      ? "passed"
      : review.severity === "major"
        ? "major"
        : "minor";
    const { data: qaUpdated } = await supabase
      .from("generations")
      .update({
        qa_status,
        qa_severity: review.passed ? null : review.severity,
        qa_issues: review.issues,
      })
      .eq("id", current.id)
      .select("*")
      .single();
    if (qaUpdated) current = qaUpdated as Generation;
  } catch (err) {
    const { data: qaUpdated } = await supabase
      .from("generations")
      .update({
        qa_status: "minor",
        qa_severity: "minor",
        qa_issues: [
          `QA review error: ${err instanceof Error ? err.message : "unknown"}`,
        ],
      })
      .eq("id", current.id)
      .select("*")
      .single();
    if (qaUpdated) current = qaUpdated as Generation;
  }

  return { generation: current };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = competitorSpySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { project_id, competitor_url, concept_ids } = parsed.data;

  const { data: projectRow } = await supabase
    .from("projects")
    .select("*")
    .eq("id", project_id)
    .single();
  if (!projectRow || (projectRow as Project).user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const project: Project = {
    ...(projectRow as Project),
    style_settings:
      ((projectRow as Project).style_settings as StyleSettings | null) ??
      DEFAULT_STYLE_SETTINGS,
  };

  // 1) Scrape the competitor URL.
  let competitor: CompetitorData;
  try {
    const html = await fetchSiteHtml(competitor_url);
    const productData = extractProductDataFromHtml(html, competitor_url);
    const siteName = extractSiteName(html);
    const brand =
      siteName ?? hostBrandFromUrl(competitor_url) ?? productData.name;
    competitor = {
      ...productData,
      brand,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    return NextResponse.json(
      {
        error: "scrape_failed",
        message: err instanceof Error ? err.message : "Failed to fetch competitor",
      },
      { status: 502 },
    );
  }

  await supabase
    .from("projects")
    .update({ competitor_data: competitor })
    .eq("id", project_id);

  // 2) Load the concepts to write briefs for.
  const { data: conceptRows } = await supabase
    .from("concepts")
    .select("*")
    .in("id", concept_ids);
  const concepts = (conceptRows ?? []) as Concept[];
  if (concepts.length === 0) {
    return NextResponse.json(
      { error: "concepts_not_found", competitor },
      { status: 404 },
    );
  }

  // 3) Budget check: three variants per concept.
  const required = concepts.length * CONCEPT_VARIANTS.length;
  const tier = await checkGenerationCredits(user.id, required);
  if (!tier.allowed) {
    return NextResponse.json(
      {
        error: "paywall",
        message: tier.reason,
        balance: tier.balance,
        required: tier.required,
        competitor,
      },
      { status: 402 },
    );
  }

  // 4) Write competitive briefs for each concept in parallel.
  const briefResults = await Promise.allSettled(
    concepts.map(async (concept) => {
      const variants = await generateCompetitiveBriefsForConcept({
        project,
        concept,
        competitor,
      });
      return { concept, variants };
    }),
  );

  const briefFailures: { concept_id: string; message: string }[] = [];
  const conceptBriefs: {
    concept: Concept;
    variants: { variant: ConceptVariant; brief_text: string }[];
  }[] = [];
  for (let i = 0; i < briefResults.length; i++) {
    const r = briefResults[i];
    if (r.status === "fulfilled") {
      conceptBriefs.push(r.value);
    } else {
      briefFailures.push({
        concept_id: concepts[i].id,
        message:
          r.reason instanceof Error ? r.reason.message : "Brief write failed",
      });
    }
  }

  // 5) Render an image per (concept, variant). Compute next version per
  //    (concept_id, variant) inside the worker so concurrent inserts get
  //    distinct version numbers based on what is already in the table.
  const renders: Promise<RenderResult>[] = [];
  const competitor_label = competitor.brand ?? competitor.name ?? null;
  for (const { concept, variants } of conceptBriefs) {
    for (const v of variants) {
      renders.push(
        (async () => {
          const { count } = await supabase
            .from("generations")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project_id)
            .eq("concept_id", concept.id)
            .eq("concept_variant", v.variant);
          const version = (count ?? 0) + 1;
          return renderOne(supabase, {
            project_id,
            concept_id: concept.id,
            variant: v.variant,
            brief_text: v.brief_text,
            platform: project.style_settings.platform,
            competitor_name: competitor_label,
            version,
          });
        })(),
      );
    }
  }

  const renderResults = await Promise.all(renders);
  const generations: Generation[] = [];
  const renderFailures: { message: string }[] = [];
  for (const r of renderResults) {
    if (r.generation) generations.push(r.generation);
    else if (r.error) renderFailures.push({ message: r.error });
  }

  // 6) Charge per successful render.
  let new_balance: number | undefined;
  if (generations.length > 0) {
    const deducted = await deductCredits(
      user.id,
      generations.length * GENERATION_CREDIT_COST,
    );
    if (deducted.ok) new_balance = deducted.new_balance;
  }

  return NextResponse.json({
    competitor,
    generations,
    brief_failures: briefFailures,
    render_failures: renderFailures,
    new_balance,
  });
}
