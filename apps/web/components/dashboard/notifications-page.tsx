"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  DEPOSIT: "💰",
  WITHDRAWAL: "💸",
  KYC: "🛡️",
  INVESTMENT: "📈",
  SUPPORT: "💬",
  SYSTEM: "🔔",
};

const typeColors: Record<string, string> = {
  DEPOSIT: "text-emerald-400 bg-emerald-500/10",
  WITHDRAWAL: "text-gold bg-gold/10",
  KYC: "text-blue-400 bg-blue-500/10",
  INVESTMENT: "text-purple-400 bg-purple-500/10",
  SUPPORT: "text-cyan-400 bg-cyan-500/10",
  SYSTEM: "text-slate-400 bg-white/5",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    apiRequest<{ notifications: Notification[] }>("/notifications")
      .then(d => setNotifications(d.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  async function markAsRead(id: string) {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  }

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter.toUpperCase());
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-mint/20 border-t-mint" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-mint px-2 text-xs font-bold text-ink">{unreadCount}</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "deposit", "withdrawal", "kyc", "investment", "support"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter === f ? "bg-mint text-ink" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card-static p-12 text-center">
          <span className="text-4xl">🔔</span>
          <p className="mt-4 text-sm text-slate-400">No notifications yet</p>
          <p className="mt-1 text-xs text-slate-500">You'll see deposit, withdrawal, KYC, and investment updates here</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => !n.read && markAsRead(n.id)}
              className={`glass-card-static cursor-pointer p-4 transition hover:bg-white/[0.06] ${!n.read ? "border-l-2 border-l-mint" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${typeColors[n.type] || typeColors.SYSTEM}`}>
                  <span className="text-lg">{typeIcons[n.type] || typeIcons.SYSTEM}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${n.read ? "text-slate-300" : "text-white"}`}>{n.title}</p>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-mint" />}
                  </div>
                  {n.body && <p className="mt-1 text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-slate-600">{shortDate(n.createdAt)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}