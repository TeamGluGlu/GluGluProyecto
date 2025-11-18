// apps/api/src/lib/mailer.ts
import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
  console.warn('[mailer] Faltan variables de entorno SMTP/Mail. Revisa .env');
}

export function buildTransport() {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_SECURE || 'false') === 'true', // true: 465, false: 587/25
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendMail(to: string[], subject: string, html: string) {
  const transporter = buildTransport();
  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to: to.join(','),
    subject,
    html,
  });
  return info;
}
