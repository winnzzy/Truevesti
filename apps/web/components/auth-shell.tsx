import Link from "next/link";
import { Nav } from "@/components/nav";
import { Card } from "@/components/card";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <>
      <Nav />
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">Account access</p>
          <h1 className="text-4xl font-semibold text-white">{title}</h1>
          <p className="mt-4 leading-8 text-slate-300">{subtitle}</p>
          {footer ? <div className="mt-6 text-sm text-slate-400">{footer}</div> : null}
        </div>
        <Card>{children}</Card>
      </main>
    </>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="font-semibold text-mint hover:text-white" href={href}>
      {children}
    </Link>
  );
}
