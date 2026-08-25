// ── SparrowBase Email Module (Dual Provider: Resend [Default] + Brevo) ──
// Supports Resend (3,000/mo free) and Brevo (300/day free) over Edge fetch().

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  provider?: 'resend' | 'brevo';
}

export interface EmailEnv {
  RESEND_API_KEY?: string;
  BREVO_API_KEY?: string;
  EMAIL_PROVIDER?: 'resend' | 'brevo';
}

export async function sendEmail(
  options: EmailOptions,
  env?: EmailEnv | string
): Promise<{ success: boolean; simulated?: boolean; provider: string; data?: any }> {
  const envObj: EmailEnv = typeof env === 'string' ? { RESEND_API_KEY: env } : env || {};
  const provider = options.provider || envObj.EMAIL_PROVIDER || 'resend';

  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const fromAddress = options.from || 'SparrowBase <noreply@sparrowbase.dev>';

  // 1. BREVO PROVIDER
  if (provider === 'brevo') {
    const brevoApiKey = envObj.BREVO_API_KEY;
    if (!brevoApiKey) {
      console.warn(`[SparrowBase Email] BREVO_API_KEY not set. Simulating Brevo email to ${options.to}: "${options.subject}"`);
      return { success: true, simulated: true, provider: 'brevo' };
    }

    const senderMatch = fromAddress.match(/^(.*?)\s*<(.+?)>$/) || [null, 'SparrowBase', fromAddress];
    const senderName = senderMatch[1] || 'SparrowBase';
    const senderEmail = senderMatch[2] || fromAddress;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: toList.map((email) => ({ email })),
        subject: options.subject,
        htmlContent: options.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return { success: true, provider: 'brevo', data };
  }

  // 2. RESEND PROVIDER [DEFAULT]
  const resendApiKey = envObj.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn(`[SparrowBase Email] RESEND_API_KEY not set. Simulating Resend email to ${options.to}: "${options.subject}"`);
    return { success: true, simulated: true, provider: 'resend' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: toList,
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return { success: true, provider: 'resend', data };
}
