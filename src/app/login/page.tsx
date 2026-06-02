import { Suspense } from "react";
import { TfAuthForm } from "@/components/tf/tf-auth-form";

export const metadata = { title: "Log in — paintgym" };

export default function LoginPage() {
  return (
    <Suspense>
      <TfAuthForm mode="login" />
    </Suspense>
  );
}
