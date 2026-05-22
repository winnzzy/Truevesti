import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your verified email to access investments, deposits, withdrawals, and notifications."
    >
      <Suspense fallback={<p className="text-slate-400">Loading sign-in form...</p>}>
        <LoginClient />
      </Suspense>
    </AuthShell>
  );
}
