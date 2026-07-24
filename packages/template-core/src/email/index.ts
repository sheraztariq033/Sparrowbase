export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions, resendApiKey?: string) {
  const apiKey = resendApiKey || (globalThis as any).process?.env?.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(`[SparrowBase Email] RESEND_API_KEY missing. Simulating email to ${options.to}: "${options.subject}"`);
    return { success: true, simulated: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
    throw new Error(`Resend API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return { success: true, data };
}
