export const KYC_STATUS = {
  NOT_SUBMITTED: "NOT_SUBMITTED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type KycStatus = (typeof KYC_STATUS)[keyof typeof KYC_STATUS];

export const KYC_STATUS_FILTER_OPTIONS = [
  { value: KYC_STATUS.PENDING, label: "Pending" },
  { value: KYC_STATUS.APPROVED, label: "Approved" },
  { value: KYC_STATUS.REJECTED, label: "Rejected" },
  { value: "ALL", label: "All" },
] as const;

export function isKycStatus(value: string): value is KycStatus {
  return Object.values(KYC_STATUS).includes(value as KycStatus);
}

export function normalizeKycStatus(value: string | null | undefined): KycStatus {
  return value && isKycStatus(value) ? value : KYC_STATUS.NOT_SUBMITTED;
}

export function isApprovedKycStatus(value: string | null | undefined) {
  return normalizeKycStatus(value) === KYC_STATUS.APPROVED;
}

export function kycStatusLabel(value: string | null | undefined) {
  const status = normalizeKycStatus(value);
  if (status === KYC_STATUS.APPROVED) return "Approved";
  if (status === KYC_STATUS.PENDING) return "Pending Review";
  if (status === KYC_STATUS.REJECTED) return "Rejected";
  return "Not Submitted";
}
