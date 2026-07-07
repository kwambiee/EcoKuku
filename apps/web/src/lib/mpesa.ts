import axios, { AxiosInstance } from 'axios';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

interface STKPushPayload {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

class MpesaClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private config: MpesaConfig;

  constructor(config: MpesaConfig) {
    this.config = config;

    const baseURL =
      config.environment === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke'
        : 'https://api.safaricom.co.ke';

    this.client = axios.create({
      baseURL,
      timeout: 30000,
    });
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(
        `${this.config.consumerKey}:${this.config.consumerSecret}`,
      ).toString('base64');

      const response = await this.client.get('/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      this.accessToken = response.data.access_token;
      // Token expires in 3600 seconds, cache for 3500 seconds
      this.tokenExpiry = Date.now() + 3500000;
      return this.accessToken!;
    } catch (error) {
      console.error('Failed to get M-PESA access token:', error);
      throw new Error('Failed to authenticate with M-PESA');
    }
  }

  private generateTimestamp(): string {
    const now = new Date();
    return (
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')
    );
  }

  private generatePassword(timestamp: string): string {
    const str = this.config.businessShortCode + this.config.passkey + timestamp;
    return Buffer.from(str).toString('base64');
  }

  async initiateStkPush(payload: STKPushPayload): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // Format phone number (remove + and add 254 for Kenya)
      let phone = payload.phoneNumber.replace(/^0/, '254');
      if (!phone.startsWith('254')) {
        phone = '254' + phone;
      }

      const response = await this.client.post('/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(payload.amount), // M-PESA requires whole numbers
        PartyA: phone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: phone,
        CallBackURL: payload.callbackUrl,
        AccountReference: payload.accountReference,
        TransactionDesc: payload.transactionDesc,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('STK Push error:', error);
      throw new Error('Failed to initiate payment');
    }
  }

  async queryTransactionStatus(
    checkoutRequestId: string,
    timestamp: string,
  ): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const password = this.generatePassword(timestamp);

      const response = await this.client.post(
        '/mpesa/stkpushquery/v1/query',
        {
          BusinessShortCode: this.config.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Transaction query error:', error);
      throw new Error('Failed to query transaction status');
    }
  }
}

// Singleton instance
let mpesaClient: MpesaClient | null = null;

export function getMpesaClient(): MpesaClient {
  if (!mpesaClient) {
    const config: MpesaConfig = {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '',
      passkey: process.env.MPESA_PASSKEY || '',
      environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };

    if (!config.consumerKey || !config.consumerSecret) {
      throw new Error('M-PESA credentials not configured');
    }

    mpesaClient = new MpesaClient(config);
  }

  return mpesaClient;
}

export type { STKPushPayload, MpesaConfig };
