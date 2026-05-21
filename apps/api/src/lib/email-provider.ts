export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(message: EmailMessage) {
  // Swap this adapter for Resend, SendGrid, or SES in production.
  console.info({ to: message.to, subject: message.subject }, "email queued");
}

