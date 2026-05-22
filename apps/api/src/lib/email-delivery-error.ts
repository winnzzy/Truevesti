export class EmailDeliveryError extends Error {
  code = "EMAIL_DELIVERY_FAILED";
  status: number;
  userMessage: string;

  constructor(status: number, userMessage: string, detail: string) {
    super(detail);
    this.name = "EmailDeliveryError";
    this.status = status;
    this.userMessage = userMessage;
  }
}

export function mapResendFailure(status: number, body: string) {
  let parsed: { message?: string } = {};
  try {
    parsed = JSON.parse(body) as { message?: string };
  } catch {
    parsed = {};
  }

  const providerMessage = parsed.message ?? body;
  console.error({ status, providerMessage }, "Resend email delivery failed");

  const lower = providerMessage.toLowerCase();

  if (
    status === 403 &&
    (lower.includes("only send testing emails") || lower.includes("your own email"))
  ) {
    return new EmailDeliveryError(
      status,
      "Resend test mode only delivers OTP emails to the email address on your Resend account. Sign up with that email, or verify a domain at resend.com/domains.",
      providerMessage
    );
  }

  if (lower.includes("from") && (lower.includes("invalid") || lower.includes("not verified"))) {
    return new EmailDeliveryError(
      status,
      "The sender address is not allowed. Use onboarding@resend.dev or a verified domain address in EMAIL_FROM.",
      providerMessage
    );
  }

  if (status === 422) {
    return new EmailDeliveryError(
      status,
      "Email could not be sent because the recipient or sender address was rejected. Check EMAIL_FROM and try again.",
      providerMessage
    );
  }

  return new EmailDeliveryError(
    status,
    "Verification email could not be delivered. Check Render logs for details or try again later.",
    providerMessage
  );
}
