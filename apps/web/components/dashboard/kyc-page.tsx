"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "../../lib/api";

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface KycCheck {
  id: string;
  status: string;
  provider: string;
  createdAt: string;
  reason?: string | null;
}

export default function KycPage() {
  const [kycChecks, setKycChecks] = useState<KycCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState<"passport" | "national_id" | "drivers_license">("passport");
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    country: "",
    address: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const latestStatus = kycChecks.length > 0 ? kycChecks[0].status : "NOT_SUBMITTED";
  const isVerified = latestStatus === "VERIFIED" || latestStatus === "APPROVED";
  const isPending = latestStatus === "PENDING";
  const isRejected = latestStatus === "REJECTED";
  const canSubmit = !isVerified && !isPending;

  function fetchKyc() {
    setLoading(true);
    apiRequest<{ checks: KycCheck[] }>("/kyc/status")
      .then(d => setKycChecks(d.checks || []))
      .catch(() => setKycChecks([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchKyc(); }, []);

  async function handleSubmit() {
    if (!form.fullName || !form.dateOfBirth || !form.country || !form.address) {
      setError("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest("/kyc/submit", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          country: form.country,
          address: form.address,
          documentType: docType,
        }),
      });
      setSuccess("KYC submitted successfully! Your documents are under review.");
      setShowForm(false);
      setForm({ fullName: "", dateOfBirth: "", country: "", address: "" });
      setDocFile(null);
      setSelfieFile(null);
      fetchKyc();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-mint/20 border-t-mint" />
      </div>
    );
  }

  const statusConfig = {
    APPROVED: { label: "Approved", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: "✅", desc: "Your identity has been verified. You have full access to all platform features." },
    VERIFIED: { label: "Approved", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: "✅", desc: "Your identity has been verified. You have full access to all platform features." },
    PENDING: { label: "Pending Review", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: "⏳", desc: "Your documents are being reviewed. This usually takes 1-3 business days." },
    REJECTED: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: "❌", desc: "Your verification was rejected. Please review the reason and resubmit." },
    NOT_SUBMITTED: { label: "Not Submitted", color: "text-slate-400 bg-white/5 border-white/10", icon: "⚠️", desc: "Please complete identity verification to unlock all platform features." },
  };

  const config = statusConfig[latestStatus as keyof typeof statusConfig] || statusConfig.NOT_SUBMITTED;
  const rejectionReason = kycChecks[0]?.reason;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">KYC Verification</h2>

      {/* Status Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`glass-card-static overflow-hidden p-6 border ${config.color.split(" ").slice(1).join(" ")}`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <h3 className={`text-lg font-bold ${config.color.split(" ")[0]}`}>{config.label}</h3>
            <p className="mt-1 text-sm text-slate-400">{config.desc}</p>
            {kycChecks.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">Submitted: {shortDate(kycChecks[0].createdAt)}</p>
            )}
            {isRejected && rejectionReason && (
              <div className="mt-3 rounded-lg bg-red-500/10 px-4 py-2">
                <p className="text-xs font-bold text-red-400">Admin Note:</p>
                <p className="text-sm text-red-300">{rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Previous Submissions */}
      {kycChecks.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-static p-6">
          <h3 className="mb-4 text-sm font-bold text-slate-300">Submission History</h3>
          <div className="space-y-2">
            {kycChecks.slice(1).map((check, i) => (
              <div key={check.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                <div>
                  <span className={`text-xs font-bold ${(check.status === "VERIFIED" || check.status === "APPROVED") ? "text-emerald-400" : check.status === "PENDING" ? "text-yellow-400" : check.status === "REJECTED" ? "text-red-400" : "text-slate-400"}`}>
                    {check.status}
                  </span>
                  {check.reason && <p className="mt-0.5 text-[10px] text-slate-500">Reason: {check.reason}</p>}
                </div>
                <span className="text-xs text-slate-500">{shortDate(check.createdAt)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Submit Button */}
      {canSubmit && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button onClick={() => setShowForm(!showForm)} className="w-full rounded-xl bg-gradient-to-r from-mint to-emerald-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90">
            {isRejected ? "Resubmit KYC" : "Submit KYC Verification"}
          </button>
        </motion.div>
      )}

      {/* KYC Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card-static space-y-5 p-6">
              <h3 className="text-lg font-bold text-white">Personal Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Full Name *</label>
                  <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Date of Birth *</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Country *</label>
                  <input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Address *</label>
                  <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Document Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: "passport" as const, label: "Passport", icon: "📕" },
                    { id: "national_id" as const, label: "National ID", icon: "🪪" },
                    { id: "drivers_license" as const, label: "Driver's License", icon: "🚗" },
                  ]).map(dt => (
                    <button key={dt.id} onClick={() => setDocType(dt.id)} className={`rounded-xl border p-3 text-center transition ${docType === dt.id ? "border-mint bg-mint/10 text-mint" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"}`}>
                      <span className="text-xl">{dt.icon}</span>
                      <p className="mt-1 text-xs font-medium">{dt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Upload Document *</label>
                <input ref={docInputRef} type="file" accept="image/*,.pdf" onChange={e => setDocFile(e.target.files?.[0] || null)} className="hidden" />
                <button onClick={() => docInputRef.current?.click()} className="w-full rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center transition hover:border-mint/30 hover:bg-white/[0.06]">
                  <span className="text-2xl">📄</span>
                  <p className="mt-1 text-sm text-slate-300">{docFile ? docFile.name : "Click to upload document"}</p>
                  <p className="text-xs text-slate-500">JPG, PNG or PDF</p>
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Selfie Verification (Optional)</label>
                <input ref={selfieInputRef} type="file" accept="image/*" onChange={e => setSelfieFile(e.target.files?.[0] || null)} className="hidden" />
                <button onClick={() => selfieInputRef.current?.click()} className="w-full rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center transition hover:border-mint/30 hover:bg-white/[0.06]">
                  <span className="text-2xl">🤳</span>
                  <p className="mt-1 text-sm text-slate-300">{selfieFile ? selfieFile.name : "Click to upload selfie"}</p>
                  <p className="text-xs text-slate-500">JPG or PNG</p>
                </button>
              </div>

              {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
              {success && <p className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{success}</p>}

              <button onClick={handleSubmit} disabled={submitting} className="w-full rounded-xl bg-gradient-to-r from-mint to-emerald-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Verification"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}