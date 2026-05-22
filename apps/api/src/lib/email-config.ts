export class EmailConfigurationError extends Error {
  code = "EMAIL_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export function getEmailProviderName() {
  return (process.env.EMAIL_PROVIDER || "console").toLowerCase();
}

export function validateEmailConfiguration() {
  const provider = getEmailProviderName();

  if (provider === "console") {
    return { ok: true as const, provider, mode: "console" as const };
  }

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey) {
      throw new EmailConfigurationError(
        "RESEND_API_KEY is missing. Add it in Render environment variables, or set EMAIL_PROVIDER=console to log OTP codes in server logs."
      );
    }
    // Resend test sender — use plain address; display names can fail validation on some accounts.
    return { ok: true as const, provider, mode: "resend" as const, from: from || "onboarding@resend.dev" };
  }

  if (provider === "sendgrid") {
    if (!process.env.SENDGRID_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim()) {
      throw new EmailConfigurationError("SENDGRID_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=sendgrid");
    }
    return { ok: true as const, provider, mode: "sendgrid" as const };
  }

  if (provider === "smtp") {
    if (!process.env.SMTP_HOST?.trim() || !process.env.SMTP_USER?.trim() || !process.env.SMTP_PASS?.trim() || !process.env.EMAIL_FROM?.trim()) {
      throw new EmailConfigurationError("SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM are required when EMAIL_PROVIDER=smtp");
    }
    return { ok: true as const, provider, mode: "smtp" as const };
  }

  throw new EmailConfigurationError(`Unsupported EMAIL_PROVIDER: ${provider}`);
}
