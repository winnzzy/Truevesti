"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { AuthLink } from "@/components/auth-shell";

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword })
      });
      setStatus("Password reset successfully. Redirecting to sign in...");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-white">Set new password</h2>
      <p className="mt-2 text-sm text-slate-400">
        Enter the 6-digit code sent to your email and choose a new password.
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
        <label className="block text-sm text-slate-300">
          Reset code
          <input
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-center text-lg tracking-[0.3em] text-white"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            pattern="\d{6}"
            placeholder="000000"
            required
            type="text"
            value={code}
          />
        </label>
        <label className="block text-sm text-slate-300">
          New password
          <input
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Confirm password
          <input
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        <button
          className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Resetting..." : "Reset password"}
        </button>
        {status ? <p className="rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
        {error ? <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </form>
      <p className="mt-6 text-sm text-slate-400">
        <AuthLink href="/auth/forgot-password">Request a new code</AuthLink>
      </p>
      <p className="mt-2 text-sm text-slate-400">
        <AuthLink href="/auth/login">Back to sign in</AuthLink>
      </p>
    </>
  );
}