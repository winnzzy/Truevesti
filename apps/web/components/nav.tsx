"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, logoutSession, readSession, writeSession, type AuthSession } from "@/lib/api";

const publicLinks = [
  ["Home", "/"],
  ["About", "/about"],
  ["Plans", "/plans"],
  ["Pricing", "/pricing"],
  ["FAQ", "/faq"],
  ["Legal", "/legal"]
];

export function Nav() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleStorage() {
      setSession(readSession());
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const s = readSession();
      if (!s) return;
      try {
        const data = await apiRequest<{ user: AuthSession["user"] }>("/auth/me");
        if (!mounted) return;
        const updated = { ...s, user: data.user };
        writeSession(updated);
        setSession(updated);
      } catch {
        // ignore; apiRequest will attempt refresh if needed
      }
    }
    void hydrate();
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    try {
      await logoutSession();
    } finally {
      setSession(null);
      window.location.href = "/";
    }
  }

  const links = session
    ? [
      ["Dashboard", "/dashboard"],
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Pricing", "/pricing"],
      ...(session.user.role === "ADMIN" ? [["Admin", "/admin"]] : []),
      ["FAQ", "/faq"],
      ["Legal", "/legal"]
    ]
    : publicLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href={session ? "/dashboard" : "/"} className="text-xl font-semibold tracking-wide text-white">
          Truevesti
        </Link>
        <div className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-white">
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <button
              className="focus-ring hidden rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
              onClick={signOut}
              type="button"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="focus-ring hidden rounded-md bg-mint px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white sm:inline-flex"
            >
              Sign in
            </Link>
          )}
          <button
            aria-expanded={isOpen}
            aria-label="Toggle navigation"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-white md:hidden"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <span className="grid gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
        </div>
      </nav>
      {isOpen ? (
        <div className="border-t border-white/10 px-5 py-4 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-2 text-sm text-slate-300">
            {links.map(([label, href]) => (
              <Link
                className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white"
                href={href}
                key={href}
                onClick={() => setIsOpen(false)}
              >
                {label}
              </Link>
            ))}
            {session ? (
              <button
                className="focus-ring mt-2 rounded-md border border-white/20 px-3 py-2 text-left font-semibold text-white"
                onClick={signOut}
                type="button"
              >
                Sign out
              </button>
            ) : (
              <Link
                className="focus-ring mt-2 rounded-md bg-mint px-3 py-2 font-semibold text-ink"
                href="/auth/login"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
