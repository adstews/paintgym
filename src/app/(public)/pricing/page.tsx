import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CREDIT_PACKS, INITIAL_FREE_CREDITS } from "@/lib/types";

export const metadata = { title: "Pricing — paintgym" };

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function perCreditPrice(cents: number, credits: number): string {
  return `$${(cents / 100 / credits).toFixed(2)}`;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            paintgym
          </Link>
          <Link href="/signup" className={buttonVariants()}>
            Start generating
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-16 space-y-10">
        <section className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Pay per image, never per seat
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            One credit per image. Credits never expire. New accounts get{" "}
            {INITIAL_FREE_CREDITS} free credits so you can try the full pipeline
            before you pay.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKS.map((p) => (
            <Card
              key={p.id}
              className={cn(
                "relative",
                p.most_popular && "border-foreground/60 shadow-md",
              )}
            >
              {p.most_popular && (
                <Badge className="absolute -top-2 right-4">Most popular</Badge>
              )}
              <CardHeader className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {p.label}
                </div>
                <CardTitle className="text-base">
                  {p.credits} credits
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">
                    {formatPrice(p.amount_cents)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    one time
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {perCreditPrice(p.amount_cents, p.credits)} per credit
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ul className="space-y-1 text-muted-foreground">
                  <li>· {p.credits} image generations</li>
                  <li>· Credits never expire</li>
                  <li>· Failed renders are never charged</li>
                  {p.id === "agency" && <li>· Best for full campaign batches</li>}
                  {p.id === "full_project" && <li>· Sized for one full project</li>}
                </ul>
                <Link
                  href="/signup"
                  className={buttonVariants({
                    className: "w-full",
                    variant: p.most_popular ? "default" : "outline",
                  })}
                >
                  Start with {p.label}
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-lg border p-6 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            What a credit gets you
          </h2>
          <ul className="mt-2 space-y-1">
            <li>· One Gemini image generation, with Claude-written brief.</li>
            <li>· Claude QA review on every image.</li>
            <li>· Automatic fresh rewrites if QA finds major issues, free.</li>
            <li>· Variant mode (three takes per concept). Each is one credit.</li>
            <li>· Recreate from example (five variants). Each is one credit.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
