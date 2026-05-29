"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface ProfileData {
  user: {
    id: string;
    email: string;
    createdAt?: string;
    lastLoginAt?: string;
  };
}

export default function SecurityPage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    apiRequest<ProfileData>("/auth/profile")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function handleChangePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setChangingPw(true);
    setPwError("");
    setPwSuccess("");
    try {
      await apiRequest("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      setPwSuccess("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-mint/20 border-t-mint" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Security</h2>

      {/* Account Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static p-6">
        <h3 className="mb-4 text-sm font-bold text-slate-300">Account Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">Account Created</p>
            <p className="mt-1 text-sm font-semibold text-white">{data?.user?.createdAt ? shortDate(data.user.createdAt) : "—"}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">Last Login</p>
            <p className="mt-1 text-sm font-semibold text-white">{data?.user?.lastLoginAt ? shortDate(data.user.lastLoginAt) : "—"}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">Email</p>
            <p className="mt-1 text-sm font-semibold text-white">{data?.user?.email}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">Account ID</p>
            <p className="mt-1 text-sm font-semibold text-white font-mono">{data?.user?.id?.slice(0, 16)}...</p>
          </div>
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-static p-6">
        <h3 className="mb-4 text-sm font-bold text-slate-300">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Current Password</label>
            <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">New Password</label>
              <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Confirm New Password</label>
              <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
            </div>
          </div>
          {pwError && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{pwError}</p>}
          {pwSuccess && <p className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{pwSuccess}</p>}
          <button onClick={handleChangePassword} disabled={changingPw} className="rounded-xl bg-gradient-to-r from-mint to-emerald-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50">
            {changingPw ? "Changing..." : "Change Password"}
          </button>
        </div>
      </motion.div>

      {/* Two-Factor Authentication (Future) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300">Two-Factor Authentication</h3>
            <p className="mt-1 text-xs text-slate-500">Add an extra layer of security to your account</p>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">Coming Soon</span>
        </div>
      </motion.div>
    </div>
  );
}