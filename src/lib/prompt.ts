import type { ProductData, Project } from "./types";

export function fillTemplate(template: string, project: Project): string {
  const p = project.product_data ?? ({} as ProductData);
  const map: Record<string, string> = {
    product_name: p.name ?? project.name ?? "",
    client_name: project.client_name ?? "",
    description: p.description ?? "",
    features: (p.features ?? []).join(", "),
    ingredients: (p.ingredients ?? []).join(", "),
    price: p.price ?? "",
    product_image_url: (p.images ?? [])[0] ?? "",
    logo_url: project.logo_url ?? "",
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key) =>
    map[key] ?? "",
  );
}
