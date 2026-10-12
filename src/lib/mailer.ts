import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'islamiaschool1official@gmail.com';

function transport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('Missing SMTP_USER/SMTP_PASS');

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user, pass },
  });
}

export async function sendCredentialsEmail(input: {
  to: string;
  name: string;
  roleLabel: string;
  username: string;
  password: string;
}) {
  const t = transport();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const subject = `Islamia Public School - ${input.roleLabel} Portal Login`;

  const text = `اسلامیہ پبلک سکول - لاگ اِن تفصیل

Name: ${input.name}
Role: ${input.roleLabel}

Login URL: ${appUrl}
Username (Email): ${input.username}
Password: ${input.password}

Please change your password after first login.
`;

  await t.sendMail({
    from: FROM_EMAIL,
    to: input.to,
    subject,
    text,
  });
}
