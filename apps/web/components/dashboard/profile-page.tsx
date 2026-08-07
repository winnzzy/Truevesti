"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";
import { KYC_STATUS, kycStatusLabel, normalizeKycStatus, type KycStatus } from "../../lib/verification-status";

interface ProfileData {
  user: {
    id: string;
    email: string;
    role: string;
    emailVerifiedAt?: string | null;
    phoneVerifiedAt?: string | null;
    createdAt?: string;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      country?: string | null;
      timezone?: string | null;
    } | null;
  };
}

interface KycStatusResponse {
  status: string;
}

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>(KYC_STATUS.NOT_SUBMITTED);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", country: "" });

  useEffect(() => {
    Promise.all([
      apiRequest<ProfileData>("/auth/profile").then(d => {
        setData(d);
        setForm({
          firstName: d.user.profile?.firstName || "",
          lastName: d.user.profile?.lastName || "",
          phone: d.user.profile?.phone || "",
          country: d.user.profile?.country || "",
        });
      }),
      apiRequest<{ checks: KycStatusResponse[] }>("/kyc/status").then(d => {
        setKycStatus(normalizeKycStatus(d.checks?.[0]?.status));
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          country: form.country || undefined,
        }),
      });
      setSuccess("Profile updated successfully");
      setEditing(false);
      // Refresh data
      const fresh = await apiRequest<ProfileData>("/auth/profile");
      setData(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-mint/20 border-t-mint" />
      </div>
    );
  }

  const user = data?.user;
  const profile = user?.profile;
  const initials = ((profile?.firstName?.[0] || "") + (profile?.lastName?.[0] || "")).toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  const kycDisplayText = kycStatusLabel(kycStatus);
  const kycColor = kycStatus === KYC_STATUS.APPROVED ? "text-emerald-400 bg-emerald-500/10" : kycStatus === KYC_STATUS.PENDING ? "text-yellow-400 bg-yellow-500/10" : kycStatus === KYC_STATUS.REJECTED ? "text-red-400 bg-red-500/10" : "text-slate-400 bg-white/5";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">My Profile</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="rounded-xl bg-mint/20 px-5 py-2.5 text-sm font-semibold text-mint transition hover:bg-mint/30">
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static overflow-hidden p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-mint/30 to-gold/30 text-3xl font-bold text-white">
            {initials}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-white">
              {profile?.firstName || ""} {profile?.lastName || ""}
              {!profile?.firstName && "Investor"}
            </h3>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${kycColor}`}>
                {kycDisplayText === "Approved" ? "✅" : kycDisplayText === "Pending Review" ? "⏳" : kycDisplayText === "Rejected" ? "❌" : "⚠️"} {kycDisplayText}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 capitalize">{user?.role?.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{success}</p>}

      {/* Profile Details / Edit Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-static p-6">
        <h3 className="mb-4 text-sm font-bold text-slate-300">Personal Information</h3>
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">First Name</label>
                <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Last Name</label>
                <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Country</label>
                <input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Your country" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-to-r from-mint to-emerald-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => { setEditing(false); setError(""); setSuccess(""); }} className="rounded-xl bg-white/5 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Full Name", value: `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Not set" },
              { label: "Email", value: user?.email || "Not set" },
              { label: "Phone", value: profile?.phone || "Not set" },
              { label: "Country", value: profile?.country || "Not set" },
              { label: "Account ID", value: user?.id?.slice(0, 8) + "..." || "—" },
              { label: "Registration Date", value: user?.createdAt ? shortDate(user.createdAt) : "—" },
              { label: "Investor Level", value: "Bronze Investor" },
              { label: "Verification Status", value: kycDisplayText },
            ].map((field) => (
              <div key={field.label} className="rounded-xl bg-white/[0.03] p-4">
                <p className="text-xs text-slate-500">{field.label}</p>
                <p className="mt-1 text-sm font-semibold text-white">{field.value}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
