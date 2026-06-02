import { Suspense } from "react";
import { TfAuthForm } from "@/components/tf/tf-auth-form";

export const metadata = { title: "Start training — paintgym" };

export default function SignupPage() {
  return (
    <Suspense>
      <TfAuthForm mode="signup" />
    </Suspense>
  );
}
