import type { Metadata } from "next";
import { TrainingFloorApp } from "@/components/tf/app";

export const metadata: Metadata = {
  title: "paintgym — Training Floor (preview)",
};

// Preview mount for the Training Floor redesign. The whole experience is a
// self-contained client app (its own internal view router), so one route
// renders all screens. Production adoption replaces the real routes + wires
// the backend; this /tf route lets us preview the full redesign in isolation.
export default function TrainingFloorPreviewPage() {
  return <TrainingFloorApp />;
}
