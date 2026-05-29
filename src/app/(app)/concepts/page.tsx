import { createClient } from "@/lib/supabase/server";
import { ConceptLibrary } from "@/components/concepts/concept-library";
import type { Concept } from "@/lib/types";

export const metadata = { title: "Concepts — paintgym" };

export default async function ConceptsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("concepts")
    .select("*")
    .order("sort_order", { ascending: true });
  return <ConceptLibrary concepts={(data ?? []) as Concept[]} />;
}
