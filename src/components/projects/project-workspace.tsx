"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { toast } from "sonner";
import { Icon, Badge } from "@/components/tf/ui";
import { GenerationCard } from "@/components/gallery/generation-card";
import { ReviewMode, type ReviewItem } from "@/components/gallery/review-mode";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductDetailsForm } from "./product-details-form";
import { BriefCard } from "./brief-card";
import { RecreateTab } from "./recreate-tab";
import { CompetitorSpyTab } from "./competitor-spy-tab";
import { CreditsPanel } from "./credits-panel";
import { CONCEPT_VARIANTS } from "@/lib/types";
import { CATEGORY_ORDER, categoryForConcept } from "@/lib/concept-categories";
import type {
  Brief,
  Concept,
  ConceptVariant,
  Generation,
  Project,
  Recreation,
  UserProfile,
  VariantLabel,
} from "@/lib/types";

interface Props {
  project: Project;
  concepts: Concept[];
  initialGenerations: Generation[];
  initialBriefs: Brief[];
  initialRecreations: Recreation[];
  enabledConceptIds: Set<string>;
  userProfile: UserProfile;
}

// Visible workspace tabs (item 9 removed Recreate + Competitor Spy from the
// bar). Those panels still exist and stay reachable via the URL hash
// (#recreate / #competitor) so they can be surfaced elsewhere later.
const VISIBLE_TABS = [
  { value: "product", label: "Product" },
  { value: "concepts", label: "Concepts" },
  { value: "briefs", label: "Briefs" },
  { value: "gallery", label: "Gallery" },
] as const;
const ALL_TAB_VALUES = [
  "product",
  "concepts",
  "briefs",
  "gallery",
  "recreate",
  "competitor",
] as const;
type TabValue = (typeof ALL_TAB_VALUES)[number];

let tempCounter = 0;
function makeTempId(prefix: string): string {
  tempCounter += 1;
  return `tmp-${prefix}-${tempCounter}`;
}

function newerFirst(a: Generation, b: Generation): number {
  return b.version - a.version;
}

function briefKey(conceptId: string, variant: ConceptVariant): string {
  return `${conceptId}:${variant}`;
}

function variantKey(conceptId: string, variant: ConceptVariant | null): string {
  return `${conceptId}:${variant ?? "A"}`;
}

// --- batch generation tuning -------------------------------------------------
// The batch runs through a durable DB-backed queue. The browser ticks
// /api/process-queue with bounded concurrency (each call claims and runs one
// job) until the queue drains; all state lives in the DB so a closed tab just
// pauses ticking. Single-image actions still call /api/generate directly.
const GEN_CONCURRENCY = 3;
const GENERATE_TIMEOUT_MS = 170_000;
const REVIEW_TIMEOUT_MS = 170_000;
const PROCESS_TIMEOUT_MS = 290_000;
const PROGRESS_POLL_MS = 2_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProgressJob {
  id: string;
  generation_id: string | null;
  concept_id: string | null;
  concept_variant: string | null;
  type: "generate" | "review" | "rewrite";
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  max_attempts: number;
  error: string | null;
}

interface ProgressState {
  counts: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
  active: number;
  jobs: ProgressJob[];
}

interface PostJsonResult {
  ok: boolean;
  status: number;
  json: Record<string, unknown>;
  timedOut: boolean;
}

async function postJson(
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<PostJsonResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, json, timedOut: false };
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "AbortError";
    return { ok: false, status: 0, json: {}, timedOut };
  } finally {
    clearTimeout(timer);
  }
}

export function ProjectWorkspace({
  project: initialProject,
  concepts,
  initialGenerations,
  initialBriefs,
  initialRecreations,
  enabledConceptIds: initialEnabled,
  userProfile: initialProfile,
}: Props) {
  const [project, setProject] = useState(initialProject);
  const [generations, setGenerations] = useState(initialGenerations);
  const [briefs, setBriefs] = useState(initialBriefs);
  const [recreations, setRecreations] = useState(initialRecreations);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [profile, setProfile] = useState(initialProfile);
  const [batchBriefsLoading, setBatchBriefsLoading] = useState(false);
  const [batchImagesLoading, setBatchImagesLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [topPerformersOnly, setTopPerformersOnly] = useState(false);
  // Few-shot attribution returned by the brief API; tracked for future surfacing.
  const [, setInformedBy] = useState<Record<string, number>>({});
  // Guards against two drains running at once (e.g. resume-on-mount racing the
  // button) and against React 18 strict-mode double-invoking the resume effect.
  const drainingRef = useRef(false);
  // Set true by the Stop button so in-flight drain ticks bail out early.
  const stopRef = useRef(false);

  // Active workspace tab, persisted to the URL hash (item 7).
  const [activeTab, setActiveTab] = useState<TabValue>("product");
  // Confirm-before-generate prompts (item 11).
  const [confirmBriefs, setConfirmBriefs] = useState(false);
  const [confirmImages, setConfirmImages] = useState(false);
  // Tinder-style review overlay (item 13).
  const [reviewOpen, setReviewOpen] = useState(false);

  // Restore the tab from the hash on mount, and keep it in sync with the hash.
  useEffect(() => {
    const fromHash = (): TabValue | null => {
      const h = window.location.hash.replace(/^#/, "");
      return (ALL_TAB_VALUES as readonly string[]).includes(h)
        ? (h as TabValue)
        : null;
    };
    const initial = fromHash();
    if (initial) setActiveTab(initial);
    const onHash = () => {
      const v = fromHash();
      if (v) setActiveTab(v);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const changeTab = useCallback((next: TabValue) => {
    setActiveTab(next);
    if (typeof window !== "undefined") {
      // Default tab gets a clean URL (no hash) per the spec.
      if (next === "product") {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        window.location.hash = next;
      }
    }
  }, []);

  const conceptsById = useMemo(
    () => new Map(concepts.map((c) => [c.id, c])),
    [concepts],
  );

  const enabledConcepts = useMemo(
    () => concepts.filter((c) => enabled.has(c.id)),
    [concepts, enabled],
  );

  const briefsByKey = useMemo(() => {
    const m = new Map<string, Brief>();
    for (const b of briefs) m.set(briefKey(b.concept_id, b.variant), b);
    return m;
  }, [briefs]);

  const attemptsByKey = useMemo(() => {
    const map = new Map<string, Generation[]>();
    for (const g of generations) {
      if (!g.concept_id) continue;
      if (g.is_competitive) continue;
      const key = variantKey(
        g.concept_id,
        (g.concept_variant ?? "A") as ConceptVariant,
      );
      const arr = map.get(key) ?? [];
      arr.push(g);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort(newerFirst);
    return map;
  }, [generations]);

  const galleryConcepts = useMemo(
    () =>
      concepts.filter((c) =>
        CONCEPT_VARIANTS.some((v) => attemptsByKey.has(variantKey(c.id, v))),
      ),
    [concepts, attemptsByKey],
  );

  // Drives whether the gallery shows paired (Gemini + OpenAI) cards per concept.
  const galleryModelPref = project.style_settings.image_model ?? "gemini";

  function applyBriefs(newBriefs: Brief[]) {
    if (newBriefs.length === 0) return;
    const m = new Map(briefs.map((b) => [b.id, b]));
    for (const b of newBriefs) m.set(b.id, b);
    setBriefs(Array.from(m.values()));
  }

  function replaceBrief(updated: Brief) {
    setBriefs((arr) => {
      const i = arr.findIndex((b) => b.id === updated.id);
      if (i === -1) return [...arr, updated];
      const next = arr.slice();
      next[i] = updated;
      return next;
    });
  }

  function mergeGenerations(incoming: Generation[]) {
    if (incoming.length === 0) return;
    setGenerations((arr) => {
      const byId = new Map(arr.map((g) => [g.id, g]));
      for (const g of incoming) byId.set(g.id, g);
      return Array.from(byId.values());
    });
  }

  function updateGeneration(
    matchId: string,
    patch: Partial<Generation> & { id?: string },
  ) {
    setGenerations((arr) =>
      arr.map((row) => (row.id === matchId ? { ...row, ...patch } : row)),
    );
  }

  async function generateBriefs(conceptIds: string[]) {
    if (conceptIds.length === 0) return;
    const res = await fetch("/api/generate-briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: project.id,
        concept_ids: conceptIds,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? err.error ?? "Brief generation failed");
    }
    const json = await res.json();
    applyBriefs(json.briefs as Brief[]);
    if (json.informed_by && typeof json.informed_by === "object") {
      setInformedBy((prev) => ({
        ...prev,
        ...(json.informed_by as Record<string, number>),
      }));
    }
    const failures = (json.failures ?? []) as {
      concept_id: string;
      message: string;
    }[];
    if (failures.length > 0) {
      toast.error(
        `${failures.length} concept${failures.length === 1 ? "" : "s"} failed`,
      );
    }
  }

  async function generateAllBriefs() {
    setBatchBriefsLoading(true);
    try {
      await generateBriefs(enabledConcepts.map((c) => c.id));
      toast.success("Briefs ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Brief generation failed");
    } finally {
      setBatchBriefsLoading(false);
    }
  }

  async function regenerateBriefsForConcept(conceptId: string) {
    try {
      await generateBriefs([conceptId]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
    }
  }

  async function runReview(generationId: string) {
    updateGeneration(generationId, { qa_status: "reviewing" });
    const { ok, json, timedOut } = await postJson(
      "/api/review-image",
      { generation_id: generationId },
      REVIEW_TIMEOUT_MS,
    );
    if (!ok) {
      toast.error(
        timedOut
          ? "QA timed out — the image is fine, re-run QA from the card if you want it checked"
          : ((json.message as string) ?? (json.error as string) ?? "QA review failed"),
      );
      // Never leave the card stuck on "reviewing" — the image is usable.
      updateGeneration(generationId, {
        qa_status: "minor",
        qa_severity: "minor",
        qa_issues: [timedOut ? "QA review timed out" : "QA review error"],
      });
      return;
    }
    const updated = (json.generations ?? []) as Generation[];
    mergeGenerations(updated);
    if (json.rewrite_error) {
      toast.error(`Auto-rewrite stopped: ${json.rewrite_error}`);
    }
  }

  // Place a card, call /api/generate (bounded by a timeout), and update the card.
  // QA is intentionally NOT run here so callers can review separately — that lets
  // the batch generate fast and keeps a slow review from blocking generation.
  async function generateOneImage(
    conceptId: string,
    variant: ConceptVariant,
  ): Promise<{ id: string | null; status: "ok" | "failed" | "paywall" }> {
    const brief = briefsByKey.get(briefKey(conceptId, variant));
    if (!brief) {
      toast.error("Generate briefs for this concept first");
      return { id: null, status: "failed" };
    }
    const tempId = makeTempId(`${conceptId}-${variant}`);
    const existing = attemptsByKey.get(variantKey(conceptId, variant)) ?? [];
    const placeholder: Generation = {
      id: tempId,
      project_id: project.id,
      concept_id: conceptId,
      concept_variant: variant,
      recreation_id: null,
      variant_label: null,
      prompt_text: brief.brief_text,
      image_url: null,
      watermarked_url: null,
      is_unlocked: false,
      status: "generating",
      version: (existing[0]?.version ?? 0) + 1,
      model_used: null,
      created_at: new Date().toISOString(),
      qa_status: "pending",
      qa_issues: [],
      qa_severity: null,
      auto_rewrite_count: 0,
      is_auto_rewrite: false,
      rating: null,
      is_favorited: false,
      used_in_ad: false,
      refined_from: null,
      refinement_feedback: null,
      is_competitive: false,
      competitor_name: null,
    };
    setGenerations((g) => [placeholder, ...g]);

    const { ok, status, json, timedOut } = await postJson(
      "/api/generate",
      {
        project_id: project.id,
        concept_id: conceptId,
        concept_variant: variant,
        prompt_text: brief.brief_text,
      },
      GENERATE_TIMEOUT_MS,
    );

    if (!ok) {
      updateGeneration(tempId, { status: "failed" });
      if (status === 402) {
        toast.error((json.message as string) ?? "Out of credits");
        return { id: null, status: "paywall" };
      }
      toast.error(
        timedOut
          ? "Generation timed out"
          : ((json.message as string) ?? "Generation failed"),
      );
      return { id: null, status: "failed" };
    }

    const realId = json.id as string;
    const updatedRow = json.generation as Generation | undefined;
    updateGeneration(tempId, {
      id: realId,
      image_url: updatedRow?.image_url ?? (json.image_url as string | null),
      watermarked_url: updatedRow?.watermarked_url ?? null,
      is_unlocked: updatedRow?.is_unlocked ?? false,
      status: "completed",
      qa_status: "reviewing",
    });
    if (typeof json.new_balance === "number") {
      setProfile((p) => ({ ...p, credit_balance: json.new_balance as number }));
    }
    return { id: realId, status: "ok" };
  }

  async function generateImageForVariant(
    conceptId: string,
    variant: ConceptVariant,
  ) {
    const { id } = await generateOneImage(conceptId, variant);
    if (id) await runReview(id);
  }

  async function regenerateVariantImage(
    recreationId: string,
    variantLabel: VariantLabel,
    promptText: string,
  ) {
    const existing = generations.filter(
      (g) =>
        g.recreation_id === recreationId && g.variant_label === variantLabel,
    );
    const nextVersion =
      existing.reduce((m, g) => Math.max(m, g.version), 0) + 1;
    const tempId = makeTempId(`${recreationId}-${variantLabel}`);
    const placeholder: Generation = {
      id: tempId,
      project_id: project.id,
      concept_id: null,
      concept_variant: null,
      recreation_id: recreationId,
      variant_label: variantLabel,
      prompt_text: promptText,
      image_url: null,
      watermarked_url: null,
      is_unlocked: false,
      status: "generating",
      version: nextVersion,
      model_used: null,
      created_at: new Date().toISOString(),
      qa_status: "pending",
      qa_issues: [],
      qa_severity: null,
      auto_rewrite_count: 0,
      is_auto_rewrite: false,
      rating: null,
      is_favorited: false,
      used_in_ad: false,
      refined_from: null,
      refinement_feedback: null,
      is_competitive: false,
      competitor_name: null,
    };
    setGenerations((g) => [placeholder, ...g]);

    const { ok, status, json, timedOut } = await postJson(
      "/api/generate",
      {
        project_id: project.id,
        recreation_id: recreationId,
        variant_label: variantLabel,
        prompt_text: promptText,
      },
      GENERATE_TIMEOUT_MS,
    );
    if (!ok) {
      updateGeneration(tempId, { status: "failed" });
      if (status === 402) {
        toast.error((json.message as string) ?? "Free preview limit reached");
      } else {
        toast.error(
          timedOut
            ? "Generation timed out"
            : ((json.message as string) ?? "Generation failed"),
        );
      }
      return;
    }
    const realId = json.id as string;
    const updatedRow = json.generation as Generation | undefined;
    updateGeneration(tempId, {
      id: realId,
      image_url: updatedRow?.image_url ?? (json.image_url as string | null),
      watermarked_url: updatedRow?.watermarked_url ?? null,
      is_unlocked: updatedRow?.is_unlocked ?? false,
      status: "completed",
      qa_status: "reviewing",
    });
    if (typeof json.new_balance === "number") {
      setProfile((p) => ({ ...p, credit_balance: json.new_balance as number }));
    }
    if (realId) await runReview(realId);
  }

  function applyRecreation(recreation: Recreation, newGens: Generation[]) {
    setRecreations((arr) => [recreation, ...arr]);
    setGenerations((arr) => [...newGens, ...arr]);
  }

  // Drain the DB-backed queue: tick /api/process-queue with bounded concurrency
  // (each call claims and runs one job) while polling /api/progress for the bar.
  // Resumable by design — if this stops (tab closed), the jobs stay in the DB and
  // the next mount picks up where it left off.
  const startDrain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    stopRef.current = false;
    setBatchImagesLoading(true);
    let running = true;

    const mergeRows = (rows: Generation[]) => {
      if (rows.length === 0) return;
      setGenerations((arr) => {
        const byId = new Map(arr.map((g) => [g.id, g]));
        for (const g of rows) byId.set(g.id, g);
        return Array.from(byId.values());
      });
    };

    // Generations we've already pulled in via the poll, so we fetch each
    // finished image exactly once (item 6 — progressive loading).
    const fetchedGens = new Set<string>();

    const refreshProgress = async () => {
      try {
        const res = await fetch(`/api/progress/${project.id}`);
        if (!res.ok) return;
        const state = (await res.json()) as ProgressState;
        setProgress(state);
        // Pull in any generation whose generate job has finished but that we
        // haven't rendered yet, so cards appear one by one as they complete
        // rather than only when the long process-queue tick returns.
        const ready = state.jobs
          .filter(
            (j) =>
              j.type === "generate" &&
              j.status === "completed" &&
              j.generation_id &&
              !fetchedGens.has(j.generation_id),
          )
          .map((j) => j.generation_id as string);
        if (ready.length > 0) {
          ready.forEach((id) => fetchedGens.add(id));
          try {
            const r = await fetch("/api/generations/by-ids", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ids: ready }),
            });
            if (r.ok) {
              const j = (await r.json()) as { generations: Generation[] };
              mergeRows(j.generations ?? []);
            }
          } catch {
            // Best-effort; the process-queue tick will merge these too.
          }
        }
      } catch {
        // Progress is cosmetic; a failed poll just means a stale bar for a beat.
      }
    };

    const poll = (async () => {
      while (running) {
        await refreshProgress();
        await sleep(PROGRESS_POLL_MS);
      }
    })();

    const tick = async () => {
      while (running && !stopRef.current) {
        const { ok, json, timedOut } = await postJson(
          "/api/process-queue",
          { project_id: project.id },
          PROCESS_TIMEOUT_MS,
        );
        if (stopRef.current) break;
        if (!ok) {
          if (timedOut) continue; // a long generate held the request; keep going
          await sleep(1500);
          continue;
        }
        mergeRows((json.generations as Generation[] | undefined) ?? []);
        if (typeof json.new_balance === "number") {
          setProfile((p) => ({ ...p, credit_balance: json.new_balance as number }));
        }
        const pending = (json.remaining_pending as number) ?? 0;
        const processing = (json.remaining_processing as number) ?? 0;
        if (pending + processing === 0) {
          running = false;
          break;
        }
        // Nothing claimable this instant but work is still in flight on another
        // worker (e.g. a generate that will enqueue a review) — wait and retry.
        if (json.done) await sleep(1200);
      }
    };

    try {
      await Promise.all(Array.from({ length: GEN_CONCURRENCY }, () => tick()));
    } finally {
      running = false;
      await poll;
      await refreshProgress();
      setBatchImagesLoading(false);
      drainingRef.current = false;
    }
  }, [project.id]);

  // Stop button (item 12): cancel pending jobs server-side, flip their
  // placeholders to failed locally, and signal the drain loop to wind down.
  async function stopGeneration() {
    stopRef.current = true;
    try {
      const res = await fetch("/api/queue/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json.error as string) ?? "Could not stop generation");
        return;
      }
      const cancelledIds = (json.cancelled_generation_ids as string[]) ?? [];
      if (cancelledIds.length > 0) {
        const idSet = new Set(cancelledIds);
        setGenerations((arr) =>
          arr.map((g) =>
            idSet.has(g.id) ? { ...g, status: "failed" as const } : g,
          ),
        );
      }
      const completed = (json.completed as number) ?? 0;
      const total = (json.total as number) ?? 0;
      toast(`Generation stopped. ${completed} of ${total} images completed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not stop generation");
    }
  }

  async function generateAllImages() {
    const items: { concept_id: string; concept_variant: ConceptVariant }[] = [];
    for (const c of enabledConcepts) {
      for (const v of CONCEPT_VARIANTS) {
        if (briefsByKey.has(briefKey(c.id, v))) {
          items.push({ concept_id: c.id, concept_variant: v });
        }
      }
    }
    if (items.length === 0) return;
    if (drainingRef.current) {
      toast("Already generating");
      return;
    }

    setBatchImagesLoading(true);
    try {
      const res = await fetch("/api/queue/enqueue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, items }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json.error as string) ?? "Could not queue images");
        setBatchImagesLoading(false);
        return;
      }
      if (Array.isArray(json.generations)) {
        mergeGenerations(json.generations as Generation[]);
      }
      const queued = (json.queued as number) ?? 0;
      if (queued === 0) {
        toast(
          (json.skipped as number) > 0
            ? "Those images are already generating"
            : "Nothing to generate",
        );
        setBatchImagesLoading(false);
        return;
      }
      toast.success(`Queued ${queued} image${queued === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not queue images");
      setBatchImagesLoading(false);
      return;
    }
    await startDrain();
  }

  // Resume on mount: if the project has in-flight jobs (a batch that was running
  // when the tab closed), show their progress and continue draining.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/progress/${project.id}`);
        if (!res.ok) return;
        const json = (await res.json()) as ProgressState;
        if (cancelled) return;
        setProgress(json);
        if (json.active > 0) void startDrain();
      } catch {
        // Best-effort resume; the button is always available as a fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, startDrain]);

  async function overrideGeneration(generationId: string) {
    try {
      const res = await fetch(`/api/generations/${generationId}/override`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Override failed");
      }
      const json = await res.json();
      mergeGenerations([json.generation as Generation]);
      toast.success("Image accepted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed");
    }
  }

  function applyRatingUpdate(updated: Generation) {
    mergeGenerations([updated]);
  }

  function applyRefinedGeneration(updated: Generation, newBalance?: number) {
    mergeGenerations([updated]);
    if (typeof newBalance === "number") {
      setProfile((p) => ({ ...p, credit_balance: newBalance }));
    }
  }

  async function unlockGeneration(generationId: string) {
    try {
      const res = await fetch(`/api/generations/${generationId}/unlock`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Unlock failed");
      }
      mergeGenerations([json.generation as Generation]);
      if (json.profile) setProfile(json.profile as UserProfile);
      toast.success("Image unlocked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    }
  }

  async function unlockAll() {
    try {
      const res = await fetch(`/api/projects/${project.id}/unlock-all`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Unlock all failed");
      }
      if (Array.isArray(json.generations)) {
        mergeGenerations(json.generations as Generation[]);
      }
      if (json.profile) setProfile(json.profile as UserProfile);
      toast.success(`Unlocked ${json.unlocked_count} images`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock all failed");
    }
  }

  async function toggleConcept(conceptId: string, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(conceptId);
    else next.delete(conceptId);
    setEnabled(next);
    await fetch(`/api/projects/${project.id}/concepts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ concept_id: conceptId, enabled: on }),
    });
  }

  async function downloadAll() {
    const items = generations.filter(
      (g) =>
        g.image_url &&
        g.is_unlocked &&
        g.qa_status !== "rewriting" &&
        g.concept_id,
    );
    if (items.length === 0) {
      toast.error("Unlock images first");
      return;
    }
    for (const g of items) {
      const concept = g.concept_id ? conceptsById.get(g.concept_id) : null;
      if (!concept || !g.image_url) continue;
      const a = document.createElement("a");
      a.href = g.image_url;
      a.download = `${concept.name.toLowerCase().replace(/\s+/g, "-")}-${g.concept_variant ?? ""}-v${g.version}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  const briefsCount = useMemo(() => {
    let n = 0;
    for (const c of enabledConcepts) {
      for (const v of CONCEPT_VARIANTS) {
        if (briefsByKey.has(briefKey(c.id, v))) n += 1;
      }
    }
    return n;
  }, [enabledConcepts, briefsByKey]);

  const lockedCount = useMemo(
    () =>
      generations.filter(
        (g) => g.image_url && !g.is_unlocked && g.status === "completed",
      ).length,
    [generations],
  );

  // "both" mode renders two images per brief; every other mode renders one.
  const imagesToGenerate =
    briefsCount * (galleryModelPref === "both" ? 2 : 1);

  // item 10: once images exist for the enabled concepts, the batch button is
  // disabled (use per-image Regenerate instead). Briefs likewise.
  const hasAnyImages = useMemo(
    () =>
      generations.some(
        (g) =>
          g.concept_id &&
          g.image_url &&
          g.status === "completed" &&
          enabled.has(g.concept_id),
      ),
    [generations, enabled],
  );
  const hasAnyBriefs = briefsCount > 0;

  // Flat list of the latest image per concept/variant, for the swipe review
  // overlay (item 13). Only rendered images are included.
  const reviewableItems = useMemo<ReviewItem[]>(() => {
    const out: ReviewItem[] = [];
    for (const c of galleryConcepts) {
      for (const v of CONCEPT_VARIANTS) {
        const attempts = attemptsByKey.get(variantKey(c.id, v)) ?? [];
        const latest = attempts[0];
        if (latest && latest.image_url) {
          out.push({
            generation: latest,
            conceptName: c.name,
            conceptId: c.id,
            variant: v,
          });
        }
      }
    }
    return out;
  }, [galleryConcepts, attemptsByKey]);

  // Derive a human progress line + bar from the queue. Headline counts only the
  // generate jobs ("image 3 of 35"); QA runs as a follow-on phase.
  const queueView = useMemo(() => {
    if (!progress) return null;
    const gen = progress.jobs.filter((j) => j.type === "generate");
    const imagesTotal = gen.length;
    const imagesDone = gen.filter(
      (j) => j.status === "completed" || j.status === "failed",
    ).length;
    const imagesFailed = gen.filter((j) => j.status === "failed").length;
    const reviewsActive = progress.jobs.filter(
      (j) =>
        j.type === "review" &&
        (j.status === "pending" || j.status === "processing"),
    ).length;
    let label: string;
    if (imagesDone < imagesTotal) {
      label = `Generating image ${Math.min(imagesDone + 1, imagesTotal)} of ${imagesTotal}...`;
    } else if (reviewsActive > 0) {
      label = `Running QA on ${reviewsActive} image${reviewsActive === 1 ? "" : "s"}...`;
    } else {
      label = `Done — ${imagesTotal - imagesFailed} ready${imagesFailed > 0 ? `, ${imagesFailed} failed` : ""}`;
    }
    const pct = imagesTotal === 0 ? 0 : Math.round((imagesDone / imagesTotal) * 100);
    return { imagesTotal, imagesDone, imagesFailed, reviewsActive, label, pct };
  }, [progress]);

  const showQueueBar =
    !!queueView &&
    queueView.imagesTotal > 0 &&
    (batchImagesLoading || (progress?.active ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div className="pg-ws-head" style={{ border: 0, padding: 0, background: "transparent" }}>
        <div className="pg-ws-title">
          <h2>{project.name}</h2>
        </div>
        {(project.brand_name || project.client_name) && (
          <div className="pg-ws-stats">
            <span className="pg-ws-stat">
              {project.brand_name ?? project.client_name}
            </span>
          </div>
        )}
        <div className="pg-ws-stats" style={{ gap: 8 }}>
          <button
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={() => setConfirmBriefs(true)}
            disabled={batchBriefsLoading || enabledConcepts.length === 0 || hasAnyBriefs}
            title={
              hasAnyBriefs
                ? "Briefs already generated. Use Regenerate on individual briefs."
                : undefined
            }
          >
            {batchBriefsLoading
              ? "Writing briefs..."
              : `Generate briefs (${enabledConcepts.length})`}
          </button>
          <button
            className="pg-btn pg-btn--pop pg-btn--sm"
            onClick={() => setConfirmImages(true)}
            disabled={batchImagesLoading || briefsCount === 0 || hasAnyImages}
            title={
              hasAnyImages
                ? "Images already generated. Use Regenerate on individual images."
                : undefined
            }
          >
            {batchImagesLoading
              ? "Generating..."
              : `Generate images (${imagesToGenerate})`}
          </button>
          {batchImagesLoading && (
            <button
              className="pg-btn pg-btn--outline pg-btn--sm"
              onClick={stopGeneration}
              style={{ color: "var(--red)", borderColor: "var(--red)" }}
            >
              Stop
            </button>
          )}
          <button
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={downloadAll}
            disabled={
              generations.filter(
                (g) => g.image_url && g.is_unlocked && g.concept_id,
              ).length === 0
            }
          >
            Download all
          </button>
        </div>
      </div>

      {showQueueBar && queueView && (
        <div
          aria-live="polite"
          style={{
            border: "1.5px solid var(--ink)",
            borderRadius: 4,
            background: "#fff",
            padding: "10px 12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="pg-mono"
              style={{ fontSize: 12, fontWeight: 700 }}
            >
              {queueView.label}
            </span>
            <span className="pg-mono pg-muted" style={{ fontSize: 11 }}>
              {queueView.imagesDone}/{queueView.imagesTotal}
              {queueView.imagesFailed > 0
                ? ` · ${queueView.imagesFailed} failed`
                : ""}
            </span>
          </div>
          <div
            style={{
              marginTop: 8,
              height: 6,
              borderRadius: 999,
              background: "var(--line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${queueView.pct}%`,
                height: "100%",
                background: "var(--pop)",
                transition: "width .3s ease",
              }}
            />
          </div>
        </div>
      )}

      <CreditsPanel
        profile={profile}
        lockedCount={lockedCount}
        onProfileChange={setProfile}
        onUnlockAll={lockedCount > 0 ? unlockAll : undefined}
      />

      <div>
        {/* item 3: scrollable on small screens. item 8: active tab is filled
            with the pop color, driven directly off state. */}
        <div className="pg-tabbar" role="tablist" aria-label="Workspace sections">
          {VISIBLE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={activeTab === t.value}
              className={`pg-tab ${activeTab === t.value ? "is-on" : ""}`}
              onClick={() => changeTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "product" && (
          <div className="pt-4">
            <ProductDetailsForm
              project={project}
              onProjectChange={setProject}
            />
          </div>
        )}

        {activeTab === "concepts" && (
        <div className="space-y-3 pt-4">
          <div
            className="pg-mono pg-muted"
            style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}
          >
            {"// toggle the concepts you want briefs and images for — each concept produces one brief."}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {concepts.map((c) => {
              const on = enabled.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleConcept(c.id, !on)}
                  className="text-left"
                  style={{
                    border: `1.5px solid ${on ? "var(--ink)" : "var(--line)"}`,
                    borderRadius: 4,
                    padding: 12,
                    background: on ? "#fff" : "transparent",
                    boxShadow: on ? "var(--shadow-sm)" : "none",
                    cursor: "pointer",
                    transition: "border-color .12s, box-shadow .12s",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "var(--headline)",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {c.name}
                    </span>
                    {on && <Badge tone="pop">Enabled</Badge>}
                  </div>
                  <p
                    className="pg-muted line-clamp-2"
                    style={{ marginTop: 4, fontSize: 12 }}
                  >
                    {c.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {activeTab === "briefs" && (
        <div className="space-y-6 pt-4">
          {enabledConcepts.length === 0 ? (
            <div className="pg-empty">
              <div className="ix">
                <Icon name="flag" size={26} />
              </div>
              <h3>No briefs yet</h3>
              <p>Enable at least one concept to start writing briefs.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {enabledConcepts.flatMap((c) =>
                CONCEPT_VARIANTS.map((v) => {
                  const brief = briefsByKey.get(briefKey(c.id, v)) ?? null;
                  const attempts = attemptsByKey.get(variantKey(c.id, v)) ?? [];
                  const latest = attempts[0] ?? null;
                  return (
                    <BriefCard
                      key={`${c.id}:${v}`}
                      concept={c}
                      variant={v}
                      brief={brief}
                      latestGeneration={latest}
                      onBriefChange={replaceBrief}
                      onRegenerateConcept={() => regenerateBriefsForConcept(c.id)}
                      onGenerateImage={() => generateImageForVariant(c.id, v)}
                    />
                  );
                }),
              )}
            </div>
          )}
        </div>
        )}

        {activeTab === "gallery" && (
        <div className="space-y-6 pt-4">
          <div
            className="flex flex-wrap items-center justify-between gap-2"
            style={{
              border: "1.5px solid var(--line)",
              borderRadius: 4,
              background: "#fff",
              padding: "10px 12px",
            }}
          >
            <div className="pg-muted" style={{ fontSize: 12, maxWidth: "52ch" }}>
              Rate the images you like. High-rated briefs are used as
              few-shot examples the next time Claude writes briefs for
              the same concept.
            </div>
            <div className="flex items-center gap-2">
              {reviewableItems.length > 0 && (
                <button
                  type="button"
                  className="pg-btn pg-btn--pop pg-btn--sm"
                  onClick={() => setReviewOpen(true)}
                >
                  Review ({reviewableItems.length})
                </button>
              )}
              <button
                type="button"
                className={`pg-chip ${topPerformersOnly ? "is-on" : ""}`}
                onClick={() => setTopPerformersOnly((v) => !v)}
              >
                {topPerformersOnly ? "Showing top only" : "Top Performers only"}
              </button>
            </div>
          </div>
          {galleryConcepts.length === 0 ? (
            <div className="pg-empty">
              <div className="ix">
                <Icon name="grid" size={26} />
              </div>
              <h3>Empty wall</h3>
              <p>No images yet. Generate briefs, then images, to see them here.</p>
            </div>
          ) : (
            (() => {
              // Build the gallery cards for a single concept (handles "both"
              // mode by splitting attempts per model).
              const buildCards = (c: Concept): ReactElement[] =>
                CONCEPT_VARIANTS.flatMap((v) => {
                  const allAttempts =
                    attemptsByKey.get(variantKey(c.id, v)) ?? [];
                  if (allAttempts.length === 0) return [];
                  const groups: { suffix: string; attempts: Generation[] }[] =
                    galleryModelPref === "both"
                      ? [
                          {
                            suffix: "gemini",
                            attempts: allAttempts.filter(
                              (a) => (a.model_used ?? "gemini") === "gemini",
                            ),
                          },
                          {
                            suffix: "openai",
                            attempts: allAttempts.filter(
                              (a) => a.model_used === "openai",
                            ),
                          },
                        ]
                      : [{ suffix: "all", attempts: allAttempts }];

                  return groups.flatMap(({ suffix, attempts }) => {
                    const latest = attempts[0];
                    if (!latest) return [];
                    if (
                      topPerformersOnly &&
                      (latest.rating ?? 0) < 4 &&
                      !latest.is_favorited &&
                      !latest.used_in_ad
                    ) {
                      return [];
                    }
                    return [
                      <div className="pg-catcard" key={`${c.id}:${v}:${suffix}`}>
                        <GenerationCard
                          conceptName={c.name}
                          latest={latest}
                          attempts={attempts}
                          onRegenerate={() => generateImageForVariant(c.id, v)}
                          onReReview={() => runReview(latest.id)}
                          onOverride={() => overrideGeneration(latest.id)}
                          onUnlock={() => unlockGeneration(latest.id)}
                          onRatingChange={applyRatingUpdate}
                          onRefined={applyRefinedGeneration}
                        />
                      </div>,
                    ];
                  });
                }) as ReactElement[];

              // item 17: group concepts into Netflix-style horizontal rows.
              const rows = CATEGORY_ORDER.map((cat) => {
                const inCat = galleryConcepts.filter(
                  (c) => categoryForConcept(c.name) === cat.key,
                );
                const cards = inCat.flatMap(buildCards);
                return { cat, cards };
              }).filter((r) => r.cards.length > 0);

              if (rows.length === 0) {
                return (
                  <div className="pg-empty">
                    <div className="ix">
                      <Icon name="grid" size={26} />
                    </div>
                    <h3>Nothing here</h3>
                    <p>No images match this filter.</p>
                  </div>
                );
              }

              return rows.map(({ cat, cards }) => (
                <div key={cat.key} className="pg-catrow">
                  <div className="pg-catrow-head">
                    <h3>{cat.title}</h3>
                    <span className="count">
                      {cards.length} image{cards.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="pg-catrow-track">{cards}</div>
                </div>
              ));
            })()
          )}
        </div>
        )}

        {activeTab === "recreate" && (
        <div className="pt-4">
          <RecreateTab
            project={project}
            recreations={recreations}
            generations={generations}
            onRecreationCreated={applyRecreation}
            onGenerationsUpdated={mergeGenerations}
            onReviewGeneration={runReview}
            onOverrideGeneration={overrideGeneration}
            onUnlockGeneration={unlockGeneration}
            onRegenerateVariant={regenerateVariantImage}
            onRatingChange={applyRatingUpdate}
            onRefined={applyRefinedGeneration}
          />
        </div>
        )}

        {activeTab === "competitor" && (
        <div className="pt-4">
          <CompetitorSpyTab
            project={project}
            concepts={concepts}
            enabledConceptIds={enabled}
            generations={generations}
            profile={profile}
            onProjectChange={setProject}
            onGenerationsUpdated={mergeGenerations}
            onProfileChange={setProfile}
            onReviewGeneration={runReview}
            onOverrideGeneration={overrideGeneration}
            onUnlockGeneration={unlockGeneration}
            onRatingChange={applyRatingUpdate}
            onRefined={applyRefinedGeneration}
          />
        </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmBriefs}
        onOpenChange={setConfirmBriefs}
        title="Generate briefs"
        body={`This will generate briefs for ${enabledConcepts.length} concept${enabledConcepts.length === 1 ? "" : "s"}. Continue?`}
        confirmLabel="Generate"
        onConfirm={generateAllBriefs}
      />
      <ConfirmDialog
        open={confirmImages}
        onOpenChange={setConfirmImages}
        title="Generate images"
        body={`This will use ${imagesToGenerate} credit${imagesToGenerate === 1 ? "" : "s"} to generate ${imagesToGenerate} image${imagesToGenerate === 1 ? "" : "s"}. Continue?`}
        confirmLabel="Generate"
        onConfirm={generateAllImages}
      />

      {reviewOpen && (
        <ReviewMode
          items={reviewableItems}
          onClose={() => setReviewOpen(false)}
          onRatingChange={applyRatingUpdate}
          onRefined={applyRefinedGeneration}
          onRegenerate={generateImageForVariant}
        />
      )}
    </div>
  );
}
