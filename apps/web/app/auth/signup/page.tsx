import { AuthShell } from "@/components/auth-shell";
import { SignupClient } from "./signup-client";

export default function SignupPage() {
  return (
    <AuthShell
      title="Join Truevesti"
      subtitle="Create an account with your name, email, and password. Email verification is required before you can access the investor dashboard."
    >
      <SignupClient />
    </AuthShell>
  );
}
