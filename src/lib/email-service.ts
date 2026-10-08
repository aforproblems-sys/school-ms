export interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Pluggable Email Service Abstraction
 * Configured via environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 * Works gracefully if no SMTP configuration is present without throwing or blocking operations.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'School Management System <noreply@school.edu>';

  if (!host || !user) {
    console.log(`[Email Service Simulated] To: ${params.to} | Subject: "${params.subject}"`);
    return { success: true, simulated: true };
  }

  try {
    // Dynamic import to support optional nodemailer dependency
    const nodemailer = await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ 'nodemailer' as any).catch(() => null);

    if (!nodemailer) {
      console.log(`[Email Service Logged] To: ${params.to} | Subject: "${params.subject}"`);
      return { success: true, simulated: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html || `<p>${params.text}</p>`,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service Error]', error);
    return { success: false };
  }
}

// ------------------- Domain Email Templates -------------------

export async function sendWelcomeEmail(toEmail: string, userName: string, roleName: string) {
  return sendEmail({
    to: toEmail,
    subject: 'Welcome to International Academy of Excellence',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Welcome, ${userName}!</h2>
        <p>Your account has been activated as <strong>${roleName}</strong> in our School Portal.</p>
        <p>You can now sign in to view your dashboard, attendance, schedules, and fee records.</p>
        <br/>
        <p>Best Regards,<br/>School Administration</p>
      </div>
    `,
  });
}

export async function sendFeeReceiptEmail(toEmail: string, studentName: string, receiptNo: string, amountPaid: number, remainingBalance: number) {
  return sendEmail({
    to: toEmail,
    subject: `Official Fee Payment Receipt: ${receiptNo}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Fee Payment Confirmation</h2>
        <p>Dear Parent / Student,</p>
        <p>Payment of <strong>$${amountPaid.toFixed(2)}</strong> for <strong>${studentName}</strong> was received successfully.</p>
        <p><strong>Receipt Number:</strong> ${receiptNo}<br/>
        <strong>Remaining Balance:</strong> $${remainingBalance.toFixed(2)}</p>
        <br/>
        <p>Thank you,<br/>Finance Department</p>
      </div>
    `,
  });
}

export async function sendResultPublishedEmail(toEmail: string, studentName: string, examName: string) {
  return sendEmail({
    to: toEmail,
    subject: `Examination Results Published: ${examName}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Examination Results Published</h2>
        <p>Dear Parent / Student,</p>
        <p>The final results for <strong>${examName}</strong> for student <strong>${studentName}</strong> have been published.</p>
        <p>Please log in to your portal to download the complete report card.</p>
        <br/>
        <p>Best Regards,<br/>Academic Department</p>
      </div>
    `,
  });
}
