import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const FRAMEWORKS = [
  "One Core Idea",
  "Three Main Benefits",
  "Bold Claim",
  "Us vs Them",
  "Comparison Chart",
  "Before & After",
  "Old vs New",
  "Social Proof",
  "Price Drop",
  "Stat-Based",
  "Press Screenshot",
  "Platform Native",
  "Comedic / Satire",
  "Notes App",
  "Sticky Notes",
  "Meme Based",
  "Low-Fi",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <span className="font-semibold tracking-tight">paintgym</span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonVariants()}>
              Start generating
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-24 text-center space-y-8">
          <span className="inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">
            AI-powered static ad creative
          </span>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            From product URL to a wall of ad concepts in minutes.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            paintgym turns any product page into a library of static Meta and
            Instagram ad creative, generated with the latest image models.
            Seventeen proven frameworks, ready to publish.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Start generating
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 grid gap-6 sm:grid-cols-3">
          <Feature
            title="Paste a product URL"
            body="We pull name, price, description, ingredients, and product imagery automatically."
          />
          <Feature
            title="Pick your frameworks"
            body="Start from 35 proven static ad formats, or write your own prompt templates."
          />
          <Feature
            title="Generate, refine, download"
            body="Each concept becomes a high-resolution image. Regenerate or version any frame."
          />
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">
            Seventeen frameworks, ready to remix.
          </h2>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {FRAMEWORKS.map((f) => (
              <div
                key={f}
                className="rounded-lg border px-3 py-2 text-sm bg-card"
              >
                {f}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          paintgym
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
