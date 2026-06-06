// Renders a JSON-LD structured-data block. Content is built by us from static
// data, so dangerouslySetInnerHTML is safe here.
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
