"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiRequest, writeSession, type AuthSession } from "@/lib/api";
import { Card } from "@/components/card";

type Mode = "login" | "register";
type Country = { name: string; iso: string; dialCode: string };

const countries: Country[] = [
  { name: "Nigeria", iso: "NG", dialCode: "+234" },
  { name: "United States", iso: "US", dialCode: "+1" },
  { name: "Canada", iso: "CA", dialCode: "+1" },
  { name: "United Kingdom", iso: "GB", dialCode: "+44" },
  { name: "Ghana", iso: "GH", dialCode: "+233" },
  { name: "Kenya", iso: "KE", dialCode: "+254" },
  { name: "South Africa", iso: "ZA", dialCode: "+27" },
  { name: "India", iso: "IN", dialCode: "+91" },
  { name: "Australia", iso: "AU", dialCode: "+61" },
  { name: "Germany", iso: "DE", dialCode: "+49" },
  { name: "France", iso: "FR", dialCode: "+33" },
  { name: "Spain", iso: "ES", dialCode: "+34" },
  { name: "Mexico", iso: "MX", dialCode: "+52" },
  { name: "Brazil", iso: "BR", dialCode: "+55" },
  { name: "China", iso: "CN", dialCode: "+86" },
  { name: "Japan", iso: "JP", dialCode: "+81" }
];

function formatPhone(phone: string, dialCode: string) {
  const raw = phone.replace(/\D/g, "");
  const codeDigits = dialCode.replace(/\D/g, "");
  if (!raw) return "";
  if (raw.startsWith(codeDigits)) return `+${raw}`;
  return `+${codeDigits}${raw}`;
}

export function AuthClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState<Country>(countries[0]);
  const [phone, setPhone] = useState("");
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const status = params.get("status");
    if (error) setError(error);
    if (status) setStatus(status);
  }, []);


  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      if (mode === "register") {
        await apiRequest<{ id: string; email: string }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            country: country.name,
            phone: phone ? formatPhone(phone, country.dialCode) : undefined,
            acceptedRisk
          })
        });
      }

      const session = await apiRequest<AuthSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      writeSession(session);
      setStatus(`Signed in as ${session.user.email} (${session.user.role})`);
      router.push(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="grid grid-cols-2 rounded-md border border-white/10 bg-white/5 p-1 text-sm font-semibold">
        {(["login", "register"] as const).map((item) => (
          <button
            className={`focus-ring rounded px-3 py-2 ${mode === item ? "bg-mint text-ink" : "text-slate-300"}`}
            key={item}
            onClick={() => setMode(item)}
            type="button"
          >
            {item === "login" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        {/* OAuth provider buttons removed to simplify signup */}
        {mode === "login" ? (
          <button
            className="focus-ring mt-4 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20"
            type="button"
            onClick={() => setMode("register")}
          >
            Sign up with email instead
          </button>
        ) : (
          <button
            className="focus-ring mt-4 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20"
            type="button"
            onClick={() => setMode("login")}
          >
            Already have an account? Sign in
          </button>
        )}
        <p className="mt-4 text-sm text-slate-400">
          Or continue with your email address and password below.
        </p>
        <div className="flex items-center gap-3 text-xs uppercase text-slate-500">
          <span className="h-px flex-1 bg-white/10" />
          Email
          <span className="h-px flex-1 bg-white/10" />
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
            minLength={mode === "register" ? 12 : undefined}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {mode === "register" ? (
          <>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Country
                <select
                  className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
                  onChange={(event) => setCountry(countries.find((item) => item.iso === event.target.value) ?? countries[0])}
                  required
                  value={country.iso}
                >
                  {countries.map((item) => (
                    <option key={item.iso} value={item.iso} className="bg-slate-900 text-white">
                      {item.name} ({item.dialCode})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Phone
                <div className="mt-2 flex rounded-md border border-white/10 bg-white/10 text-white">
                  <span className="flex items-center px-4 text-slate-300">{country.dialCode}</span>
                  <input
                    className="focus-ring w-full rounded-r-md border-0 bg-transparent px-4 py-3 text-white outline-none"
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="8012345678"
                    type="tel"
                    value={phone}
                  />
                </div>
              </label>
            </div>
            <label className="flex gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <input checked={acceptedRisk} onChange={(event) => setAcceptedRisk(event.target.checked)} required type="checkbox" />
              I accept the investment risk disclosure.
            </label>
          </>
        ) : null}
        <button className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink" disabled={isSubmitting}>
          {isSubmitting ? "Working..." : "Continue"}
        </button>
        {status ? <p className="rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
        {error ? <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </form>
    </Card>
  );
}
