import type { Metadata } from "next";
import { Suspense } from "react";
import { TfAuthForm } from "@/components/tf/tf-auth-form";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Log in",
  description:
    "Log in to Paintgym to generate AI ad creatives for your products.",
  path: "/login",
});

export default function LoginPage() {
  return (
    <Suspense>
      <TfAuthForm mode="login" />
    </Suspense>
  );
}
