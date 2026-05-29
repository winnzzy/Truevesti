"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; phone: string; country: string }>({ firstName: "", lastName: "", phone: "", country: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    apiRequest<{ user: { profile?: { firstName?: string | null; lastName?: string | null; phone?: string | null; country?: string | null } | null } }>("/auth/profile")
      .then(d => {
        const p = d.user.profile;
        setProfile({
          firstName: p?.firstName || "",
          lastName: p?.lastName || "",
          phone: p?.phone || "",
          country: p?.country || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone || undefined,
          country: profile.country || undefined,
        }),
      });
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

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
      <h2 className="text-xl font-bold text-white">Account Settings</h2>

      {/* Profile Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static p-6">
        <h3 className="mb-4 text-sm font-bold text-slate-300">Profile Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">First Name</label>
              <input type="text" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Last Name</label>
              <input type="text" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Phone Number</label>
              <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 234 567 890" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Country</label>
              <input type="text" value={profile.country} onChange={e => setProfile({ ...profile, country: e.target.value })} placeholder="Your country" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          {success && <p className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{success}</p>}
          <button onClick={handleSaveProfile} disabled={saving} className="rounded-xl bg-gradient-to-r from-mint to-emerald-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
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

      {/* Notification Preferences */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static p-6">
        <h3 className="mb-4 text-sm font-bold text-slate-300">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { label: "Deposit Updates", desc: "Get notified about deposit confirmations", enabled: true },
            { label: "Withdrawal Updates", desc: "Get notified about withdrawal status", enabled: true },
            { label: "Investment Updates", desc: "Get notified about investment maturity", enabled: true },
            { label: "KYC Updates", desc: "Get notified about verification status", enabled: true },
            { label: "Support Messages", desc: "Get notified about support replies", enabled: true },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
              <div>
                <p className="text-sm font-medium text-white">{pref.label}</p>
                <p className="text-xs text-slate-500">{pref.desc}</p>
              </div>
              <div className={`relative h-6 w-11 rounded-full ${pref.enabled ? "bg-mint" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${pref.enabled ? "left-[22px]" : "left-0.5"}`} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}