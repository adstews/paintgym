import type { Project, ProductData } from "@/lib/types";

// Fields a project must fill in before any brief or image can be generated.
// Price is the critical one: a blank price was making Claude hallucinate a
// number, so we hard-block generation until it (and the other core inputs) are
// set. The fallbacks mirror what brief-context actually feeds Claude.

export interface RequiredField {
  key: "brand_name" | "product_name" | "product_description" | "price_point";
  label: string;
}

export const REQUIRED_FIELDS: RequiredField[] = [
  { key: "brand_name", label: "Brand or company name" },
  { key: "product_name", label: "Product or service name" },
  { key: "product_description", label: "What it does" },
  { key: "price_point", label: "Price point" },
];

// Minimal shape we validate against — works with a full Project or a partial.
export interface ValidatableProject {
  brand_name?: string | null;
  client_name?: string | null;
  product_name?: string | null;
  product_description?: string | null;
  price_point?: string | null;
  product_data?: ProductData | null;
}

function present(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// Resolve each required field the same way brief-context does (project field
// first, then the scraped product_data fallback), then report what's missing.
export function getMissingRequiredFields(
  project: ValidatableProject,
): RequiredField[] {
  const data = project.product_data ?? {};
  const resolved: Record<RequiredField["key"], boolean> = {
    brand_name: present(project.brand_name) || present(project.client_name),
    product_name: present(project.product_name) || present(data.name),
    product_description:
      present(project.product_description) || present(data.description),
    price_point: present(project.price_point) || present(data.price),
  };
  return REQUIRED_FIELDS.filter((f) => !resolved[f.key]);
}

export function missingFieldsMessage(missing: RequiredField[]): string {
  if (missing.length === 0) return "";
  const labels = missing.map((f) => f.label).join(", ");
  return `Please fill in ${labels} in Product Details before generating.`;
}

// Convenience for Project rows.
export function getMissingRequiredFieldsForProject(
  project: Project,
): RequiredField[] {
  return getMissingRequiredFields(project);
}
