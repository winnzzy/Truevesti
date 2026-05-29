"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  glow?: "mint" | "gold" | "none";
  hover?: boolean;
  onClick?: () => void;
}

export function PremiumCard({ children, className = "", delay = 0, glow = "none", hover = true, onClick }: PremiumCardProps) {
  const glowClass = glow === "mint" ? "glow-mint-sm" : glow === "gold" ? "glow-gold" : "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className={`glass-card ${hover ? "cursor-pointer" : ""} ${glowClass} ${className}`}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : undefined}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  trend?: { value: number; positive: boolean };
  delay?: number;
  accent?: "mint" | "gold" | "blue";
}

export function StatCard({ label, value, icon, trend, delay = 0, accent = "mint" }: StatCardProps) {
  const accentColors = {
    mint: "from-mint/20 to-mint/5",
    gold: "from-gold/20 to-gold/5",
    blue: "from-blue-400/20 to-blue-400/5",
  };
  const iconColors = {
    mint: "text-mint",
    gold: "text-gold",
    blue: "text-blue-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card group relative overflow-hidden p-5"
    >
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${accentColors[accent]} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${iconColors[accent]}`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trend.positive ? "text-emerald-400" : "text-red-400"}`}>
              <svg className={`h-3 w-3 ${trend.positive ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="mt-4 text-sm font-medium text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}