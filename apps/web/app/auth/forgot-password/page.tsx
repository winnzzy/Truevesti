import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordClient } from "./forgot-password-client";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email to receive a password reset code."
    >
      <Suspense fallback={<p className="text-slate-400">Loading...</p>}>
        <ForgotPasswordClient />
      </Suspense>
    </AuthShell>
  );
}