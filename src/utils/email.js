const nodemailer = require('nodemailer');
const { BrevoClient } = require('@getbrevo/brevo');
const { nodeEnv, smtp, brevo } = require('../config/env');

const stripQuotes = (value) => (value || '').replace(/^["']|["']$/g, '').trim();

const getSenderMeta = (overrideName) => ({
  email: stripQuotes(
    process.env.EMAIL_FROM ||
      process.env.SENDER_EMAIL ||
      smtp?.from ||
      smtp?.user ||
      brevo?.from
  ),
  name:
    stripQuotes(overrideName) ||
    stripQuotes(process.env.EMAIL_FROM_NAME) ||
    stripQuotes(brevo?.fromName) ||
    'Bookstore',
});

const hasSmtpConfig = () =>
  Boolean(smtp?.host && (smtp?.user || process.env.SMTP_USER) && (smtp?.pass || process.env.SMTP_PASS));

const getBrevoClient = () => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured on the server.');
  }
  return new BrevoClient({ apiKey });
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const storeEmailTemplate = ({ storeName, content }) => {
  const brand = escapeHtml(storeName || 'Store');
  return `
<!DOCTYPE html><html>
<head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#1e1b4b,#3b3294);padding:32px 40px}
  .header h1{color:#fff;margin:0;font-size:22px}
  .header p{color:#c7d2fe;margin:6px 0 0;font-size:13px}
  .body{padding:32px 40px;color:#374151;line-height:1.75;font-size:15px}
  .btn{display:inline-block;padding:13px 30px;background:#3b3294;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600;margin:20px 0}
  .otp-box{display:inline-block;padding:16px 40px;background:#eef2ff;border:2px dashed #818cf8;border-radius:12px;font-size:36px;font-weight:800;letter-spacing:12px;color:#1e1b4b;margin:20px 0}
  .divider{height:1px;background:#f0f0f0;margin:20px 0}
  .muted{color:#6b7280;font-size:13px}
  .footer{background:#f9fafb;padding:20px 40px;text-align:center;color:#9ca3af;font-size:12px}
  table.items{width:100%;border-collapse:collapse;margin:16px 0}
  table.items th,table.items td{padding:10px 8px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
  table.items th{color:#6b7280;font-weight:600}
</style>
</head>
<body>
  <div class="wrap">
    <div class="header"><h1>${brand}</h1><p>Order updates</p></div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} ${brand} · All rights reserved</div>
  </div>
</body></html>`;
};

/** Legacy BookVerse template (OTP / auth) */
const emailTemplate = (content) => storeEmailTemplate({ storeName: 'BookVerse', content });

const cloudEmailHint =
  'Disable Brevo IP whitelist: Brevo → Settings → Security → Authorized IPs → turn OFF blocking for API keys.';

const sendViaNodemailer = async ({ to, subject, html, senderEmail, senderName, replyTo }) => {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: Boolean(smtp.secure),
    auth: {
      user: smtp.user || process.env.SMTP_USER,
      pass: smtp.pass || process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    replyTo: replyTo || undefined,
    subject,
    html,
  });
};

const sendViaBrevo = async ({ to, subject, html, senderEmail, senderName, replyTo }) => {
  const client = getBrevoClient();
  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: Array.isArray(to) ? to.map((e) => ({ email: e })) : [{ email: to }],
    subject,
    htmlContent: html,
  };
  if (replyTo) {
    payload.replyTo = { email: replyTo, name: senderName };
  }
  await client.transactionalEmails.sendTransacEmail(payload);
};

/**
 * Send HTML email via Nodemailer (SMTP) when configured, otherwise Brevo.
 * Options: { to, subject, html, text, fromName, replyTo }
 * Also supports: sendEmail(to, subject, html)
 */
const sendEmail = async (toOrOptions, subjectMaybe, htmlMaybe) => {
  let to;
  let subject;
  let html;
  let fromName;
  let replyTo;

  if (toOrOptions && typeof toOrOptions === 'object' && !Array.isArray(toOrOptions)) {
    to = toOrOptions.to;
    subject = toOrOptions.subject;
    html =
      toOrOptions.html ||
      (toOrOptions.text
        ? `<p>${String(toOrOptions.text).replace(/\n/g, '<br/>')}</p>`
        : '');
    fromName = toOrOptions.fromName;
    replyTo = toOrOptions.replyTo;
  } else {
    to = toOrOptions;
    subject = subjectMaybe;
    html = htmlMaybe;
  }

  const { email: senderEmail, name: senderName } = getSenderMeta(fromName);
  if (!senderEmail) {
    throw new Error('EMAIL_FROM / SENDER_EMAIL / SMTP_USER must be configured.');
  }

  const canSkip =
    nodeEnv === 'development' &&
    !process.env.BREVO_API_KEY?.trim() &&
    !hasSmtpConfig();

  if (canSkip) {
    console.log('[email:dev-fallback]', { to, subject, fromName: senderName });
    return { skipped: true };
  }

  try {
    if (hasSmtpConfig()) {
      await sendViaNodemailer({
        to,
        subject,
        html,
        senderEmail,
        senderName,
        replyTo,
      });
    } else {
      await sendViaBrevo({
        to,
        subject,
        html,
        senderEmail,
        senderName,
        replyTo,
      });
    }
  } catch (err) {
    const isCloud = Boolean(
      process.env.RENDER ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.NODE_ENV === 'production'
    );
    const message = err?.message || String(err);
    if (isCloud && !hasSmtpConfig()) {
      throw new Error(`Email failed: ${message}. ${cloudEmailHint}`);
    }
    throw err;
  }

  return { sent: true };
};

/** OTP verification email for Dashboard registration */
const sendOTPEmail = async (to, storeName, otp, expiryMinutes = 10) => {
  const subject = 'Verify Your Email – BookVerse OTP';
  const html = emailTemplate(`
      <p>Hi <strong>${escapeHtml(storeName)}</strong>,</p>
      <p>Use the OTP below to verify your store owner email and finish registration:</p>
      <div style="text-align:center"><div class="otp-box">${escapeHtml(otp)}</div></div>
      <p style="text-align:center;color:#6b7280;font-size:13px">
        Expires in <strong>${expiryMinutes} minutes</strong>. Do not share it with anyone.
      </p>
      <div class="divider"></div>
      <p style="color:#9ca3af;font-size:13px">If you didn't create this account, ignore this email.</p>
    `);

  if (nodeEnv === 'development') {
    console.log(`[otp:dev] ${to} → ${otp} (expires ${expiryMinutes}m)`);
  }

  return sendEmail({
    to,
    subject,
    html,
    fromName: 'BookVerse',
  });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendViaBrevo,
  emailTemplate,
  storeEmailTemplate,
  escapeHtml,
  getSenderMeta,
  hasSmtpConfig,
};
