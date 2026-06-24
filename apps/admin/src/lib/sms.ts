const AT_API_URL_SANDBOX = 'https://api.sandbox.africastalking.com';
const AT_API_URL_PROD = 'https://api.africastalking.com';

function getConfig() {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const username = process.env.AFRICAS_TALKING_USERNAME;
  const env = process.env.AFRICAS_TALKING_ENV || 'sandbox';
  if (!apiKey || !username) return null;
  return { apiKey, username, baseUrl: env === 'production' ? AT_API_URL_PROD : AT_API_URL_SANDBOX };
}

export async function sendSMS(to: string, message: string): Promise<{ sent: boolean; error?: string }> {
  const config = getConfig();
  if (!config) {
    console.log(`[SMS SKIPPED - no config] To: ${to} | ${message}`);
    return { sent: false, error: 'SMS not configured' };
  }
  try {
    const params = new URLSearchParams({ username: config.username, to, message });
    const res = await fetch(`${config.baseUrl}/version1/messaging`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', apiKey: config.apiKey },
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

export async function notifyDriverAssigned(driverPhone: string, driverName: string, orderNumber: string, customerName: string, deliveryArea: string, items: string) {
  const msg = `EcoKuku: Hi ${driverName}, you've been assigned order ${orderNumber}. Customer: ${customerName}. Deliver to: ${deliveryArea || 'TBD'}. Items: ${items}. Please confirm pickup.`;
  return sendSMS(driverPhone, msg);
}

export async function notifyCustomerPickedUp(customerPhone: string, orderNumber: string, driverName: string, driverPhone: string) {
  const msg = `EcoKuku: Your order ${orderNumber} is on the way! Driver: ${driverName} (${driverPhone}). Call if you need to reach them.`;
  return sendSMS(customerPhone, msg);
}

export async function notifyCustomerDelivered(customerPhone: string, orderNumber: string) {
  const msg = `EcoKuku: Order ${orderNumber} delivered — thank you for your business! Rate us and order again at ecokuku.co.ke`;
  return sendSMS(customerPhone, msg);
}
