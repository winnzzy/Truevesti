"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { AuthLink } from "@/components/auth-shell";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      await apiRequest("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setSent(true);
      setStatus("If an account exists for this email, a reset code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process request");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <h2 className="text-2xl font-semibold text-white">Check your email</h2>
        <p className="mt-3 text-sm text-slate-300">
          We sent a 6-digit reset code to <span className="font-semibold text-white">{email}</span>.
          Enter it on the next page to set a new password.
        </p>
        <div className="mt-6">
          <AuthLink href={`/auth/reset-password?email=${encodeURIComponent(email)}`}>
            Enter reset code
          </AuthLink>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Didn't receive it?{" "}
          <button
            className="text-mint hover:underline"
            onClick={() => { setSent(false); setStatus(""); }}
            type="button"
          >
            Try again
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-white">Forgot password</h2>
      <p className="mt-2 text-sm text-slate-400">
        Enter the email address associated with your account and we'll send a reset code.
      </p>
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
        <button
          className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending..." : "Send reset code"}
        </button>
        {status ? <p className="rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
        {error ? <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </form>
      <p className="mt-6 text-sm text-slate-400">
        Remember your password? <AuthLink href="/auth/login">Sign in</AuthLink>
      </p>
    </>
  );
}