"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, ApiRequestError, readSession, writeSession, type AuthSession } from "@/lib/api";
import { AuthLink } from "@/components/auth-shell";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const existing = readSession();
    if (existing?.accessToken) {
      router.replace(existing.user.role === "ADMIN" ? "/admin" : "/dashboard");
      return;
    }

    const queryEmail = searchParams.get("email");
    if (queryEmail) setEmail(queryEmail);
    if (searchParams.get("verified") === "1") {
      setStatus("Email verified. Sign in to continue.");
    }
  }, [router, searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const session = await apiRequest<AuthSession & { message?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      writeSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user
      });

      setStatus(session.message ?? "Signed in successfully");
      router.push(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      if (err instanceof ApiRequestError && err.code === "EMAIL_NOT_VERIFIED") {
        setStatus("Check your inbox for a verification code or resend one.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-white">Sign in</h2>
      <p className="mt-2 text-sm text-slate-400">Use the email and password from signup after verification.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm text-slate-300">
          Email
          <input
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <input
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <button className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        {status ? <p className="rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
        {error ? (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-200">
            <p>{error}</p>
            {error.toLowerCase().includes("verify") ? (
              <p className="mt-2">
                <AuthLink href={`/auth/verify?email=${encodeURIComponent(email)}`}>Verify email</AuthLink>
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
      <p className="mt-6 text-sm text-slate-400">
        Need an account? <AuthLink href="/auth/signup">Sign up</AuthLink>
      </p>
    </>
  );
}
