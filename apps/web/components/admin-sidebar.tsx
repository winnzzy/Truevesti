"use client";

import { clsx } from "clsx";

export type AdminSection =
  | "overview"
  | "users"
  | "deposits"
  | "withdrawals"
  | "plans"
  | "investments"
  | "kyc"
  | "support"
  | "wallets"
  | "audit";

const NAV_ITEMS: { key: AdminSection; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "users", label: "Users", icon: "👥" },
  { key: "deposits", label: "Deposits", icon: "💰" },
  { key: "withdrawals", label: "Withdrawals", icon: "💸" },
  { key: "plans", label: "Investment Plans", icon: "📈" },
  { key: "investments", label: "Investments", icon: "🏦" },
  { key: "kyc", label: "KYC Review", icon: "🪪" },
  { key: "support", label: "Support Tickets", icon: "🎧" },
  { key: "wallets", label: "Company Wallets", icon: "🔑" },
  { key: "audit", label: "Audit Logs", icon: "📋" }
];

type AdminSidebarProps = {
  active: AdminSection;
  onNavigate: (section: AdminSection) => void;
  counts?: Partial<Record<AdminSection, number>>;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function AdminSidebar({ active, onNavigate, counts, collapsed, onToggleCollapse }: AdminSidebarProps) {
  return (
    <aside
      className={clsx(
        "flex h-full flex-col border-r border-white/10 bg-ink/80 backdrop-blur-md transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        {!collapsed && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">Admin</p>
            <p className="text-sm font-semibold text-white">Operations</p>
          </div>
        )}
        <button
          className="focus-ring rounded-md p-1.5 text-slate-400 hover:text-white"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            {collapsed ? (
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm7 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
            )}
          </svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const count = counts?.[item.key];
          return (
            <button
              key={item.key}
              className={clsx(
                "focus-ring flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                active === item.key
                  ? "border-r-2 border-mint bg-white/[0.06] font-semibold text-white"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              )}
              onClick={() => onNavigate(item.key)}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {count != null && count > 0 && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold">
                      {count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}