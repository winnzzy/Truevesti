import { Nav } from "@/components/nav";
import { StatusPill } from "@/components/status-pill";
import { AuthClient } from "./auth-client";

export default function AuthPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">Account access</p>
          <h1 className="text-4xl font-semibold text-white">Secure access</h1>
          <p className="mt-4 leading-8 text-slate-300">
            Email verification, OTP, Google OAuth, refresh-token rotation, and device tracking are wired into the backend architecture.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatusPill tone="mint">Risk consent</StatusPill>
            <StatusPill>OAuth hooks</StatusPill>
            <StatusPill tone="gold">KYC-ready</StatusPill>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["Investor profile", "Capture identity details and disclosure acceptance before investment actions."],
              ["Session controls", "Access tokens, refresh rotation, and role-aware redirects keep workflows separated."]
            ].map(([title, copy]) => (
              <div className="feature-strip" key={title}>
                <span>{title}</span>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </div>
        <AuthClient />
      </main>
    </>
  );
}
