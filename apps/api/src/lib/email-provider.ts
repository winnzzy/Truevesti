import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

function getEmailProvider() {
  return (process.env.EMAIL_PROVIDER || "console").toLowerCase();
}

async function sendWithResend(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Truevesti <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
}

async function sendWithSendGrid(message: EmailMessage) {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error("SENDGRID_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=sendgrid");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: message.to }] }],
      from: { email: from },
      subject: message.subject,
      content: [{ type: "text/html", value: message.html }]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendGrid failed (${response.status}): ${body}`);
  }
}

async function sendWithSmtp(message: EmailMessage) {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM are required when EMAIL_PROVIDER=smtp");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html
  });
}

export async function sendEmail(message: EmailMessage) {
  const provider = getEmailProvider();

  if (provider === "console") {
    console.info({ to: message.to, subject: message.subject }, "email queued (console provider)");
    return;
  }

  if (provider === "resend") {
    await sendWithResend(message);
    return;
  }

  if (provider === "sendgrid") {
    await sendWithSendGrid(message);
    return;
  }

  if (provider === "smtp") {
    await sendWithSmtp(message);
    return;
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}. Use resend, sendgrid, smtp, or console.`);
}
