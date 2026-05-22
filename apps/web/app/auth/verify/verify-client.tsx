"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { AuthLink } from "@/components/auth-shell";

export function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const queryEmail = searchParams.get("email");
    if (queryEmail) setEmail(queryEmail);
  }, [searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const result = await apiRequest<{ message: string; verified: boolean }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, code })
      });
      setStatus(result.message);
      router.push(`/auth/login?email=${encodeURIComponent(email)}&verified=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    setIsResending(true);
    setError("");
    setStatus("");

    try {
      const result = await apiRequest<{ message: string }>("/auth/otp/resend", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setStatus(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend code");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-white">Verify your email</h2>
      <p className="mt-2 text-sm text-slate-400">Enter the 6-digit code sent to your inbox. Codes expire after a few minutes.</p>
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
          Verification code
          <input
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 tracking-[0.35em] text-white"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            pattern="[0-9]{6}"
            placeholder="123456"
            required
            value={code}
          />
        </label>
        <button className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Verifying..." : "Verify email"}
        </button>
        <button
          className="focus-ring w-full rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          disabled={isResending || !email}
          onClick={() => void resendCode()}
          type="button"
        >
          {isResending ? "Sending..." : "Resend code"}
        </button>
        {status ? <p className="rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
        {error ? <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </form>
      <p className="mt-6 text-sm text-slate-400">
        Wrong email? <AuthLink href="/auth/signup">Start over</AuthLink>
      </p>
    </>
  );
}
