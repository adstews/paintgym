"use client";

// Training Floor landing wired to real navigation (the prototype's onStart/onSkip
// become real route pushes). "Train" carries the pasted URL into signup.
import { useRouter } from "next/navigation";
import { Landing } from "@/components/tf/screens";

export function TfLanding() {
  const router = useRouter();
  return (
    <div className="pg-stage pg-stage--landing">
      <div className="pg-phone">
        <div className="pg-screen">
          <div className="pg-app">
            <Landing
              onStart={(u) => router.push(u ? `/signup?url=${encodeURIComponent(u)}` : "/signup")}
              onSkip={() => router.push("/login")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
