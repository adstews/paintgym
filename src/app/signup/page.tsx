import type { Metadata } from "next";
import { Suspense } from "react";
import { TfAuthForm } from "@/components/tf/tf-auth-form";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Sign up free",
  description:
    "Create a free Paintgym account. Write ad briefs for 49 concepts free, and generate AI ad creatives in minutes.",
  path: "/signup",
});

export default function SignupPage() {
  return (
    <Suspense>
      <TfAuthForm mode="signup" />
    </Suspense>
  );
}
