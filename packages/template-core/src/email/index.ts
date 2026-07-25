// ── SparrowBase Email Module (Edge-Native via Resend API) ──
// Uses c.env.RESEND_API_KEY from Cloudflare Worker bindings (NOT process.env).

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via the Resend API.
 * @param options - Email options (to, subject, html, from)
 * @param resendApiKey - The Resend API key from c.env.RESEND_API_KEY
 */
export async function sendEmail(options: EmailOptions, resendApiKey?: string): Promise<{ success: boolean; simulated?: boolean; data?: any }> {
  if (!resendApiKey) {
    console.warn(`[SparrowBase Email] RESEND_API_KEY not set. Simulating email to ${options.to}: "${options.subject}"`);
    return { success: true, simulated: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from || 'SparrowBase <noreply@sparrowbase.dev>',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SparrowBase Email] Resend API Error (${response.status}): ${errorText}`);
    throw new Error(`Resend API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return { success: true, data };
}

// ── Pre-built Email Templates ──

const BRAND_COLOR = '#10b981';
const BRAND_NAME = 'SparrowBase';

function wrapTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111113;border:1px solid #222;border-radius:12px;overflow:hidden;">
    <div style="padding:24px 32px;background:linear-gradient(135deg,${BRAND_COLOR}22,#111113);border-bottom:1px solid #222;">
      <h1 style="margin:0;font-size:20px;color:${BRAND_COLOR};font-weight:700;">🦜 ${BRAND_NAME}</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#e5e5e5;font-weight:600;">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #222;text-align:center;">
      <p style="margin:0;font-size:12px;color:#666;">© ${new Date().getFullYear()} ${BRAND_NAME} — Edge Backend Platform</p>
    </div>
  </div>
</body>
</html>`;
}

/** Email verification OTP code */
export function verificationEmailHtml(code: string): string {
  return wrapTemplate('Verify Your Email', `
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Enter this code to verify your email address. It expires in 10 minutes.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:16px 40px;background:#1a1a1d;border:2px solid ${BRAND_COLOR};border-radius:8px;font-size:32px;font-weight:900;letter-spacing:8px;color:#fff;">${code}</span>
    </div>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">If you didn't create an account, you can safely ignore this email.</p>
  `);
}

/** Password reset email */
export function passwordResetEmailHtml(resetUrl: string): string {
  return wrapTemplate('Reset Your Password', `
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to reset your password. This link expires in 1 hour.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:${BRAND_COLOR};color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">Reset Password</a>
    </div>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">If you didn't request this, you can safely ignore this email.</p>
  `);
}

/** Welcome email after signup/verification */
export function welcomeEmailHtml(name: string): string {
  return wrapTemplate(`Welcome, ${name}!`, `
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your account is verified and ready to go. Here's what you can do next:
    </p>
    <ul style="color:#a3a3a3;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
      <li>Create your first project with <code style="background:#1a1a1d;padding:2px 6px;border-radius:4px;color:${BRAND_COLOR};">npx sparrowbase init</code></li>
      <li>Deploy to Cloudflare Workers in under 60 seconds</li>
      <li>Browse the <a href="https://sparrowbase.dev" style="color:${BRAND_COLOR};">documentation</a></li>
    </ul>
  `);
}

/** Payment failed alert */
export function paymentFailedEmailHtml(): string {
  return wrapTemplate('Payment Failed', `
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 16px;">
      We weren't able to process your latest payment. Your Pro features will remain active for a few more days, but please update your payment method to avoid interruption.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://sparrowbase.dev/billing" style="display:inline-block;padding:14px 32px;background:#f43f5e;color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">Update Payment Method</a>
    </div>
  `);
}

/** Subscription canceled */
export function subscriptionCanceledEmailHtml(): string {
  return wrapTemplate('Subscription Canceled', `
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your Pro subscription has been canceled. Your account has been moved back to the free tier.
    </p>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      You can still use SparrowBase with Cloudflare's generous free tier (100k requests/day, 5M D1 reads/day). If you'd like to re-subscribe at any time, visit your billing page.
    </p>
  `);
}

/** Welcome to Pro email */
export function welcomeToProEmailHtml(): string {
  return wrapTemplate('Welcome to Pro! 🎉', `
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your Pro subscription is now active. You've unlocked:
    </p>
    <ul style="color:#a3a3a3;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
      <li>10M+ requests/month on Cloudflare Workers</li>
      <li>Premium SaaS templates & admin panels</li>
      <li>Priority support & architecture review</li>
      <li>Advanced AI rules packs</li>
    </ul>
    <p style="color:#a3a3a3;font-size:14px;">Thank you for supporting SparrowBase!</p>
  `);
}
