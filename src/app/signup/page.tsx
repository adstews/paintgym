import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign up — paintgym" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
