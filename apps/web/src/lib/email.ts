import nodemailer, { Transporter } from 'nodemailer';

interface EmailConfig {
  service: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailClient {
  private transporter: Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;

    if (config.service) {
      this.transporter = nodemailer.createTransport({
        service: config.service,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure ?? false,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    }
  }

  async sendEmail(payload: EmailPayload): Promise<any> {
    try {
      const response = await this.transporter.sendMail({
        from: this.config.user,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      return response;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendOrderConfirmationEmail(
    email: string,
    customerName: string,
    orderReference: string,
    totalAmount: number,
    items: any[],
  ): Promise<any> {
    const itemsHtml = items
      .map(
        (item) =>
          `<tr><td>${item.product.name}</td><td>${item.quantity}</td><td>KES ${item.priceAtTime}</td></tr>`,
      )
      .join('');

    const html = `
      <h2>Order Confirmation</h2>
      <p>Hi ${customerName},</p>
      <p>Thank you for your order! Here are your order details:</p>
      <h3>Order #${orderReference.substring(0, 8)}</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 8px;">Product</th>
            <th style="text-align: left; padding: 8px;">Quantity</th>
            <th style="text-align: left; padding: 8px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <h3 style="margin-top: 20px;">Total: KES ${totalAmount}</h3>
      <p>We will send you updates on your order status via SMS and email.</p>
      <p>Best regards,<br/>The EcoKuku Team</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Order Confirmation - #${orderReference.substring(0, 8)}`,
      html,
    });
  }

  async sendDeliveryConfirmationEmail(
    email: string,
    customerName: string,
    orderReference: string,
  ): Promise<any> {
    const html = `
      <h2>Delivery Confirmation</h2>
      <p>Hi ${customerName},</p>
      <p>Your EcoKuku order #${orderReference.substring(0, 8)} has been delivered!</p>
      <p>We hope you enjoy our fresh products. Please rate your experience and share your feedback.</p>
      <p>Thank you for shopping with EcoKuku!</p>
      <p>Best regards,<br/>The EcoKuku Team</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Delivery Confirmed - Order #${orderReference.substring(0, 8)}`,
      html,
    });
  }

  async sendPaymentFailureEmail(
    email: string,
    customerName: string,
    orderReference: string,
  ): Promise<any> {
    const html = `
      <h2>Payment Issue</h2>
      <p>Hi ${customerName},</p>
      <p>We encountered an issue processing payment for your order #${orderReference.substring(0, 8)}.</p>
      <p>Please try again or contact our support team for assistance.</p>
      <p>Thank you,<br/>The EcoKuku Team</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Payment Issue - Order #${orderReference.substring(0, 8)}`,
      html,
    });
  }
}

// Singleton instance
let emailClient: EmailClient | null = null;

export function getEmailClient(): EmailClient {
  if (!emailClient) {
    const config: EmailConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    };

    if (!config.user || !config.pass) {
      throw new Error('Email credentials not configured');
    }

    emailClient = new EmailClient(config);
  }

  return emailClient;
}

export type { EmailPayload, EmailConfig };
