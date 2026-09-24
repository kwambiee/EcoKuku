/**
 * Safaricom Daraja API client
 * Docs: https://developer.safaricom.co.ke/
 *
 * Required env vars:
 *   MPESA_CONSUMER_KEY       — from Daraja app
 *   MPESA_CONSUMER_SECRET    — from Daraja app
 *   MPESA_SHORTCODE          — your Paybill number (or Till for Buy Goods)
 *   MPESA_PASSKEY            — from Daraja (for STK push only)
 *   MPESA_ENVIRONMENT        — "sandbox" | "production"  (default: production)
 *   NEXT_PUBLIC_APP_URL      — e.g. https://admin.kwambokapoultry.co.ke
 */

const ENV = (process.env.MPESA_ENVIRONMENT || 'production') === 'sandbox' ? 'sandbox' : 'production';
const BASE_URL = ENV === 'sandbox'
  ? 'https://sandbox.safaricom.co.ke'
  : 'https://api.safaricom.co.ke';

// ── Auth token (cached per process; Daraja tokens last ~1 hour) ───────────────
let _token: string | null = null;
let _tokenExpiry = 0;

export async function getDarajaToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const key    = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  if (!key || !secret) throw new Error('MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET not set');

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Daraja token request failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  _token = data.access_token as string;
  _tokenExpiry = Date.now() + (parseInt(data.expires_in, 10) - 60) * 1000; // refresh 1 min early
  return _token;
}

// ── Register C2B Callback URLs (one-time setup) ───────────────────────────────
export async function registerC2BUrls() {
  const token     = await getDarajaToken();
  const shortCode = process.env.MPESA_SHORTCODE!;
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.kwambokapoultry.co.ke';

  const payload = {
    ShortCode:       shortCode,
    ResponseType:    'Completed',           // auto-accept; use Cancelled if you want validation
    ConfirmationURL: `${appUrl}/api/mpesa/c2b`,
    ValidationURL:   `${appUrl}/api/mpesa/c2b`,
  };

  const res = await fetch(`${BASE_URL}/mpesa/c2b/v2/registerurl`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`C2B URL registration failed: ${JSON.stringify(data)}`);
  return data;
}

// ── STK Push (Lipa na M-Pesa Online) ─────────────────────────────────────────
export interface StkPushParams {
  phone:            string;   // 254XXXXXXXXX format
  amount:           number;   // whole shillings
  accountReference: string;   // e.g. order number shown to customer
  description:      string;   // shown on customer's phone (max 13 chars)
}

export async function stkPush(params: StkPushParams) {
  const token     = await getDarajaToken();
  const shortCode = process.env.MPESA_SHORTCODE!;
  const passKey   = process.env.MPESA_PASSKEY!;
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.kwambokapoultry.co.ke';

  if (!passKey) throw new Error('MPESA_PASSKEY not set');

  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');

  const payload = {
    BusinessShortCode: shortCode,
    Password:          password,
    Timestamp:         timestamp,
    TransactionType:   'CustomerBuyGoodsOnline',
    Amount:            Math.round(params.amount),
    PartyA:            params.phone,
    PartyB:            shortCode,
    PhoneNumber:       params.phone,
    CallBackURL:       `${appUrl}/api/mpesa/stk`,
    AccountReference:  params.accountReference.slice(0, 12),
    TransactionDesc:   params.description.slice(0, 13),
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`STK push failed: ${JSON.stringify(data)}`);
  return data as { MerchantRequestID: string; CheckoutRequestID: string; ResponseDescription: string; CustomerMessage: string };
}
