import { db } from '@ecokuku/db';

const AT_BASE_SANDBOX = 'https://api.sandbox.africastalking.com';
const AT_BASE_PROD = 'https://api.africastalking.com';

async function getConfig(): Promise<{ apiKey: string; username: string; baseUrl: string } | null> {
  // Prefer environment variables (for CI / server-managed config)
  const envKey = process.env.AFRICAS_TALKING_API_KEY;
  const envUser = process.env.AFRICAS_TALKING_USERNAME;
  if (envKey && envUser) {
    const env = process.env.AFRICAS_TALKING_ENV || 'sandbox';
    return { apiKey: envKey, username: envUser, baseUrl: env === 'production' ? AT_BASE_PROD : AT_BASE_SANDBOX };
  }

  // Fall back to database settings (configured via Settings page)
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: ['at_api_key', 'at_username', 'at_env'] } },
    });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    if (m.at_api_key && m.at_username) {
      const base = (m.at_env || 'sandbox') === 'production' ? AT_BASE_PROD : AT_BASE_SANDBOX;
      return { apiKey: m.at_api_key, username: m.at_username, baseUrl: base };
    }
  } catch { /* non-fatal */ }

  return null;
}

export async function sendSMS(to: string, message: string): Promise<{ sent: boolean; error?: string }> {
  const config = await getConfig();
  if (!config) {
    console.log(`[SMS SKIPPED — not configured] To: ${to} | ${message}`);
    return { sent: false, error: 'SMS not configured. Add Africa\'s Talking keys in Settings → Integrations.' };
  }
  try {
    const params = new URLSearchParams({ username: config.username, to, message });
    const res = await fetch(`${config.baseUrl}/version1/messaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        apiKey: config.apiKey,
      },
      body: params.toString(),
    });
    const data = await res.json();
    console.log(`[SMS] To: ${to} | Status: ${res.status}`, data);
    return { sent: res.ok };
  } catch (err) {
    console.error('[SMS ERROR]', err);
    return { sent: false, error: 'SMS send failed' };
  }
}

export async function notifyDriverAssigned(
  driverPhone: string, driverName: string,
  orderNumber: string, customerName: string,
  deliveryArea: string, items: string,
) {
  const msg = `EcoKuku: Hi ${driverName}, you've been assigned order ${orderNumber}. Customer: ${customerName}. Deliver to: ${deliveryArea || 'TBD'}. Items: ${items}. Please confirm pickup.`;
  return sendSMS(driverPhone, msg);
}

export async function notifyCustomerPickedUp(
  customerPhone: string, orderNumber: string,
  driverName: string, driverPhone: string,
) {
  const msg = `EcoKuku: Your order ${orderNumber} is on the way! Driver: ${driverName} (${driverPhone}). Call if you need to reach them.`;
  return sendSMS(customerPhone, msg);
}

export async function notifyCustomerDelivered(customerPhone: string, orderNumber: string) {
  const msg = `EcoKuku: Order ${orderNumber} delivered — thank you for your business! Order again at ecokuku.co.ke`;
  return sendSMS(customerPhone, msg);
}
