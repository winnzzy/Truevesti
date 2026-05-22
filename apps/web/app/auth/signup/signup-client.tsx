"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { AuthLink } from "@/components/auth-shell";

export function SignupClient() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const result = await apiRequest<{
        message: string;
        email: string;
        otpSent: boolean;
      }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          acceptedRisk
        })
      });

      setStatus(result.message);
      router.push(`/auth/verify?email=${encodeURIComponent(result.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-white">Create your account</h2>
      <p className="mt-2 text-sm text-slate-400">We will email you a 6-digit code to verify your address.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">
            First name
            <input
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
              onChange={(event) => setFirstName(event.target.value)}
              required
              value={firstName}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Last name
            <input
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
              onChange={(event) => setLastName(event.target.value)}
              required
              value={lastName}
            />
          </label>
        </div>
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
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <span className="mt-1 block text-xs text-slate-500">At least 8 characters with a letter and a number.</span>
        </label>
        <label className="flex gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
          <input checked={acceptedRisk} onChange={(event) => setAcceptedRisk(event.target.checked)} required type="checkbox" />
          I accept the investment risk disclosure.
        </label>
        <button className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>
        {status ? <p className="rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
        {error ? <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </form>
      <p className="mt-6 text-sm text-slate-400">
        Already have an account? <AuthLink href="/auth/login">Sign in</AuthLink>
      </p>
    </>
  );
}
