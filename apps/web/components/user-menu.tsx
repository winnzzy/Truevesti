"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { logoutSession, userDisplayName, type AuthUser } from "../lib/api";

interface UserMenuProps {
  user: AuthUser | null;
  initials: string;
  onNavigate?: (section: string) => void;
}

export default function UserMenu({ user, initials, onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    try {
      await logoutSession();
    } catch {
      // ignore
    }
    router.push("/");
  }

  function handleMenuClick(section: string) {
    setOpen(false);
    if (onNavigate) {
      onNavigate(section);
    } else {
      router.push(`/dashboard/${section}`);
    }
  }

  const menuItems = [
    { label: "My Profile", section: "profile", icon: "👤" },
    { label: "Account Settings", section: "settings", icon: "⚙️" },
    { label: "KYC Verification", section: "kyc", icon: "🛡️" },
    { label: "Security", section: "security", icon: "🔒" },
    { label: "Notifications", section: "notifications", icon: "🔔" },
  ];

  const displayName = userDisplayName(user);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint/30 to-gold/30 text-sm font-bold text-white transition hover:from-mint/50 hover:to-gold/50 hover:shadow-lg hover:shadow-mint/20"
      >
        {initials}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl"
            style={{
              background: "rgba(8, 17, 31, 0.85)",
              backdropFilter: "blur(24px) saturate(1.8)",
              WebkitBackdropFilter: "blur(24px) saturate(1.8)",
            }}
          >
            {/* User Info Header */}
            <div className="border-b border-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-mint/30 to-gold/30 text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item, i) => (
                <motion.div
                  key={item.section}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    onClick={() => handleMenuClick(item.section)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Sign Out */}
            <div className="border-t border-white/[0.06] p-2">
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <span className="text-base">🚪</span>
                <span>Sign Out</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}