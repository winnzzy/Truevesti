import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordClient } from "./reset-password-client";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set new password"
      subtitle="Enter the reset code from your email and choose a new password."
    >
      <Suspense fallback={<p className="text-slate-400">Loading...</p>}>
        <ResetPasswordClient />
      </Suspense>
    </AuthShell>
  );
}