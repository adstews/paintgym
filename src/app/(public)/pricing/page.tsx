import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Pricing — paintgym" };

const TIERS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "free forever",
    points: [
      "1 active project",
      "17 default concepts",
      "20 generations per month",
    ],
    cta: "Start free",
  },
  {
    name: "Studio",
    price: "$49",
    cadence: "per month",
    points: [
      "Unlimited projects",
      "Custom concepts and templates",
      "500 generations per month",
      "Batch download",
    ],
    cta: "Start trial",
    featured: true,
  },
  {
    name: "Agency",
    price: "Contact",
    cadence: "annual",
    points: [
      "Everything in Studio",
      "Team workspaces",
      "Bring your own Gemini key",
      "Priority support",
    ],
    cta: "Talk to us",
  },
];

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
      <main className="mx-auto max-w-5xl px-4 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
          <p className="text-muted-foreground">
            Pick a plan that matches your studio.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              className={t.featured ? "border-foreground/40 shadow-md" : ""}
            >
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{t.price}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.cadence}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ul className="space-y-1 text-muted-foreground">
                  {t.points.map((p) => (
                    <li key={p}>· {p}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={buttonVariants({ className: "w-full" })}
                >
                  {t.cta}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
