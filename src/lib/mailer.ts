import nodemailer from 'nodemailer';

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function hasSmtpEnv() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM
  );
}

function getTransporter() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!hasSmtpEnv()) {
    // dev fallback
    console.log('[Mailer] SMTP env missing. Email not sent. Subject:', opts.subject);
    console.log('[Mailer] To:', opts.to);
    console.log('[Mailer] Text:', opts.text || '');
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM!,
    ...opts,
  });
}

/**
 * Backward-compatible function (aapke staff/student actions isko use kar rahe hain)
 * We accept ANY args to avoid type mismatch.
 */
export async function sendCredentialsEmail(...args: any[]) {
  // Support both: sendCredentialsEmail({to, email, password, fullName})
  // and positional: sendCredentialsEmail(to, email, password, fullName?)
  let to = '';
  let email = '';
  let password = '';
  let fullName = '';

  if (args.length === 1 && typeof args[0] === 'object' && args[0]) {
    to = String(args[0].to || '');
    email = String(args[0].email || args[0].username || '');
    password = String(args[0].password || '');
    fullName = String(args[0].fullName || args[0].name || '');
  } else {
    to = String(args[0] || '');
    email = String(args[1] || '');
    password = String(args[2] || '');
    fullName = String(args[3] || '');
  }

  const appUrl = getAppUrl();

  const subject = 'Your School MS login credentials';
  const html = `
    <p>Assalam-o-Alaikum ${fullName ? fullName : ''}</p>
    <p>Your account has been created.</p>
    <p><b>Login:</b> ${email}</p>
    <p><b>Password:</b> ${password}</p>
    <p><a href="${appUrl}">Open School MS</a></p>
  `;
  const text = `Login: ${email}\nPassword: ${password}\nOpen: ${appUrl}`;

  await sendMail({ to, subject, html, text });
}
