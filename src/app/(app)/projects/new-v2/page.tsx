import { ProjectWizard } from "@/components/projects/wizard/project-wizard";

// New multi-step project creation flow. Auth is enforced by the (app) layout.
// The original NewProjectDialog + ProductDetailsForm flow is untouched.
export default function NewProjectWizardPage() {
  return <ProjectWizard />;
}
