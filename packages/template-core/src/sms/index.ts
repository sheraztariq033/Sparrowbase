// ── SparrowBase SMS Module (Edge-Native via Twilio & Plivo) ──

export interface SmsOptions {
  to: string;
  message: string;
  from?: string;
  provider?: 'twilio' | 'plivo';
}

export interface SmsEnv {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  PLIVO_AUTH_ID?: string;
  PLIVO_AUTH_TOKEN?: string;
  PLIVO_PHONE_NUMBER?: string;
  SMS_PROVIDER?: 'twilio' | 'plivo';
}

/**
 * Send an SMS text message (OTP or alert) via Twilio or Plivo.
 */
export async function sendSms(
  options: SmsOptions,
  env: SmsEnv = {}
): Promise<{ success: boolean; simulated?: boolean; provider: string; data?: any }> {
  const provider = options.provider || env.SMS_PROVIDER || 'twilio';

  // 1. ── TWILIO PROVIDER ──
  if (provider === 'twilio') {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const fromNumber = options.from || env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn(`[SparrowBase SMS] Twilio credentials not set. Simulating SMS to ${options.to}: "${options.message}"`);
      return { success: true, simulated: true, provider: 'twilio' };
    }

    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
    const formData = new URLSearchParams();
    formData.append('To', options.to);
    formData.append('From', fromNumber);
    formData.append('Body', options.message);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Twilio SMS Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return { success: true, provider: 'twilio', data };
  }

  // 2. ── PLIVO PROVIDER ──
  const authId = env.PLIVO_AUTH_ID;
  const authToken = env.PLIVO_AUTH_TOKEN;
  const fromNumber = options.from || env.PLIVO_PHONE_NUMBER;

  if (!authId || !authToken || !fromNumber) {
    console.warn(`[SparrowBase SMS] Plivo credentials not set. Simulating SMS to ${options.to}: "${options.message}"`);
    return { success: true, simulated: true, provider: 'plivo' };
  }

  const authHeader = 'Basic ' + btoa(`${authId}:${authToken}`);
  const res = await fetch(`https://api.plivo.com/v1/Account/${authId}/Message/`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      src: fromNumber,
      dst: options.to,
      text: options.message,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Plivo SMS Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return { success: true, provider: 'plivo', data };
}
