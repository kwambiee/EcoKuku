import axios, { AxiosInstance } from 'axios';

interface AfricastalkingConfig {
  apiKey: string;
  username: string;
  environment: 'sandbox' | 'production';
}

interface SMSPayload {
  recipients: string[];
  message: string;
}

class AfricastalkingClient {
  private client: AxiosInstance;
  private config: AfricastalkingConfig;
  private apiUrl: string;

  constructor(config: AfricastalkingConfig) {
    this.config = config;

    this.apiUrl =
      config.environment === 'sandbox'
        ? 'https://api.sandbox.africastalking.com'
        : 'https://api.africastalking.com';

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'ecokuku/1.0',
      },
    });
  }

  async sendSMS(payload: SMSPayload): Promise<any> {
    try {
      const response = await this.client.post(
        '/version1/messaging',
        {
          username: this.config.username,
          to: payload.recipients.join(','),
          message: payload.message,
        },
        {
          headers: {
            apiKey: this.config.apiKey,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('SMS sending error:', error);
      throw new Error('Failed to send SMS');
    }
  }

  async sendOrderConfirmation(
    phoneNumber: string,
    orderReference: string,
    totalAmount: number,
  ): Promise<any> {
    const message = `Hello! Your EcoKuku order #${orderReference.substring(0, 8)} has been received. Total: KES${totalAmount}. Track your order at http://ecokuku.local/orders/${orderReference}`;

    return this.sendSMS({
      recipients: [phoneNumber],
      message,
    });
  }

  async sendDeliveryNotification(
    phoneNumber: string,
    orderReference: string,
    driverName: string,
    driverPhone: string,
  ): Promise<any> {
    const message = `Your EcoKuku order #${orderReference.substring(0, 8)} is out for delivery! Driver: ${driverName}, Phone: ${driverPhone}`;

    return this.sendSMS({
      recipients: [phoneNumber],
      message,
    });
  }

  async sendDeliveryConfirmation(
    phoneNumber: string,
    orderReference: string,
  ): Promise<any> {
    const message = `Thank you for ordering from EcoKuku! Your order #${orderReference.substring(0, 8)} has been delivered. Rate your experience at http://ecokuku.local`;

    return this.sendSMS({
      recipients: [phoneNumber],
      message,
    });
  }

  async sendPaymentReminder(
    phoneNumber: string,
    orderReference: string,
  ): Promise<any> {
    const message = `Don't forget to complete payment for your EcoKuku order #${orderReference.substring(0, 8)}. Payment details: http://ecokuku.local/checkout`;

    return this.sendSMS({
      recipients: [phoneNumber],
      message,
    });
  }

  async sendBulkSMS(
    recipientGroups: Record<string, string[]>,
    message: string,
  ): Promise<any> {
    const responses: Record<string, any> = {};

    for (const [groupName, recipients] of Object.entries(recipientGroups)) {
      try {
        responses[groupName] = await this.sendSMS({
          recipients,
          message,
        });
      } catch (error) {
        console.error(`Error sending SMS to ${groupName}:`, error);
        responses[groupName] = { error: 'Failed to send' };
      }
    }

    return responses;
  }
}

// Singleton instance
let smsClient: AfricastalkingClient | null = null;

export function getSMSClient(): AfricastalkingClient {
  if (!smsClient) {
    const config: AfricastalkingConfig = {
      apiKey: process.env.AFRICAS_TALKING_API_KEY || '',
      username: process.env.AFRICAS_TALKING_USERNAME || '',
      environment: 
        (process.env.AFRICAS_TALKING_ENV as 'sandbox' | 'production') || 'sandbox',
    };

    if (!config.apiKey || !config.username) {
      throw new Error('Africa\'s Talking credentials not configured');
    }

    smsClient = new AfricastalkingClient(config);
  }

  return smsClient;
}

export type { SMSPayload, AfricastalkingConfig };
