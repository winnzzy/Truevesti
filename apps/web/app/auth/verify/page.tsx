import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { VerifyClient } from "./verify-client";

export default function VerifyPage() {
  return (
    <AuthShell
      title="Confirm your email"
      subtitle="Email verification protects your account and unlocks sign-in to the dashboard."
    >
      <Suspense fallback={<p className="text-slate-400">Loading verification form...</p>}>
        <VerifyClient />
      </Suspense>
    </AuthShell>
  );
}
