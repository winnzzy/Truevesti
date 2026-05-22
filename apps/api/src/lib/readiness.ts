type ReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: "critical" | "warning";
  detail: string;
};

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function isChanged(name: string, unsafeValue: string) {
  const value = process.env[name];
  return Boolean(value && value !== unsafeValue);
}

export function getReadinessChecks(): ReadinessCheck[] {
  const cryptoProvider = process.env.CRYPTO_PROVIDER || "mock";
  const emailProvider = process.env.EMAIL_PROVIDER || "console";

  return [
    {
      key: "jwt-access",
      label: "JWT access secret",
      ok: isChanged("JWT_ACCESS_SECRET", "change-me-access"),
      severity: "critical",
      detail: "Use a long random JWT_ACCESS_SECRET outside source control."
    },
    {
      key: "jwt-refresh",
      label: "JWT refresh secret",
      ok: isChanged("JWT_REFRESH_SECRET", "change-me-refresh"),
      severity: "critical",
      detail: "Use a separate long random JWT_REFRESH_SECRET outside source control."
    },
    {
      key: "crypto-provider",
      label: "Wallet provider",
      ok: cryptoProvider !== "mock",
      severity: "critical",
      detail: "Set CRYPTO_PROVIDER to static-wallet, mnemonic-wallet, or a production custody provider."
    },
    {
      key: "crypto-secrets",
      label: "Wallet provider secrets",
      ok: cryptoProvider === "static-wallet"
        ? hasValue("MASTER_WALLET_ADDRESSES")
        : cryptoProvider === "mnemonic-wallet"
          ? hasValue("MASTER_WALLET_MNEMONIC")
          : hasValue("CRYPTO_PROVIDER_API_KEY"),
      severity: "critical",
      detail: "Configure the required wallet provider secret for the selected CRYPTO_PROVIDER."
    },
    {
      key: "webhook-secret",
      label: "Chain webhook signing",
      ok: hasValue("CHAIN_WEBHOOK_SECRET"),
      severity: "critical",
      detail: "Set CHAIN_WEBHOOK_SECRET before accepting deposit webhooks."
    },
    {
      key: "email-provider",
      label: "Email provider",
      ok:
        emailProvider === "resend"
          ? hasValue("RESEND_API_KEY") && hasValue("EMAIL_FROM")
          : emailProvider === "sendgrid"
            ? hasValue("SENDGRID_API_KEY") && hasValue("EMAIL_FROM")
            : emailProvider === "smtp"
              ? hasValue("SMTP_HOST") && hasValue("SMTP_USER") && hasValue("SMTP_PASS") && hasValue("EMAIL_FROM")
              : emailProvider === "console",
      severity: emailProvider === "console" ? "warning" : "critical",
      detail: "Configure Resend, SendGrid, or SMTP credentials (plus EMAIL_FROM) for OTP and account emails."
    },
    {
      key: "oauth",
      label: "One-click sign-in",
      ok: hasValue("GOOGLE_CLIENT_ID") || hasValue("APPLE_CLIENT_ID") || hasValue("MICROSOFT_CLIENT_ID"),
      severity: "warning",
      detail: "Configure at least one OAuth provider for one-click signup."
    },
    {
      key: "captcha",
      label: "CAPTCHA or bot protection",
      ok: hasValue("CAPTCHA_SECRET"),
      severity: "warning",
      detail: "Add CAPTCHA verification before public production signup."
    },
    {
      key: "admin-account",
      label: "Seeded admin account",
      ok: hasValue("ADMIN_EMAIL") && hasValue("ADMIN_PASSWORD"),
      severity: "critical",
      detail: "Set ADMIN_EMAIL and ADMIN_PASSWORD, then run the seed script."
    }
  ];
}
