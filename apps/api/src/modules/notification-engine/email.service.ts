import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter(): void {
    const host = this.configService.get('SMTP_HOST', 'localhost');
    const port = this.configService.get('SMTP_PORT', 1025);
    const secure = this.configService.get('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get('SMTP_USER', '');
    const pass = this.configService.get('SMTP_PASS', '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      // For Mailhog, no auth is needed
    });

    this.logger.log(`Email transporter configured: ${host}:${port}`);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const from = this.configService.get(
      'SMTP_FROM',
      'SLMS Notifications <noreply@slms.local>',
    );

    try {
      const result = await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent: ${result.messageId} to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendExpiryNotification(
    to: string,
    itemType: string,
    itemName: string,
    daysRemaining: number,
    expiryDate: string,
  ): Promise<boolean> {
    const urgencyLevel =
      daysRemaining <= 30 ? 'URGENT' : daysRemaining <= 60 ? 'WARNING' : 'REMINDER';

    const subject = `[${urgencyLevel}] ${itemType} Expiring in ${daysRemaining} Days: ${itemName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${daysRemaining <= 30 ? '#dc3545' : daysRemaining <= 60 ? '#ffc107' : '#17a2b8'}; 
              color: ${daysRemaining <= 60 && daysRemaining > 30 ? '#333' : '#fff'}; 
              padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    .highlight { font-size: 24px; font-weight: bold; }
    .details { background: #fff; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .details table { width: 100%; }
    .details td { padding: 8px 0; }
    .details td:first-child { font-weight: bold; width: 40%; }
    .action-btn { display: inline-block; background: #007bff; color: #fff; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="highlight">${urgencyLevel}</div>
      <div>${itemType} Expiration Notice</div>
    </div>
    <div class="content">
      <p>Dear User,</p>
      <p>This is a reminder that the following ${itemType.toLowerCase()} will expire soon:</p>
      
      <div class="details">
        <table>
          <tr>
            <td>${itemType} Name:</td>
            <td><strong>${itemName}</strong></td>
          </tr>
          <tr>
            <td>Expiry Date:</td>
            <td><strong>${expiryDate}</strong></td>
          </tr>
          <tr>
            <td>Days Remaining:</td>
            <td><strong style="color: ${daysRemaining <= 30 ? '#dc3545' : '#333'}">${daysRemaining} days</strong></td>
          </tr>
        </table>
      </div>
      
      <p><strong>Action Required:</strong> Please review and renew this ${itemType.toLowerCase()} before it expires to ensure compliance.</p>
      
      <p style="text-align: center;">
        <a href="${this.configService.get('WEB_URL', 'http://localhost:3000')}" class="action-btn">
          View in SLMS Portal
        </a>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated notification from the Sustainability Licensing Management System (SLMS).</p>
      <p>If you have questions, please contact your system administrator.</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
${urgencyLevel}: ${itemType} Expiring in ${daysRemaining} Days

Dear User,

This is a reminder that the following ${itemType.toLowerCase()} will expire soon:

${itemType} Name: ${itemName}
Expiry Date: ${expiryDate}
Days Remaining: ${daysRemaining} days

Action Required: Please review and renew this ${itemType.toLowerCase()} before it expires to ensure compliance.

---
This is an automated notification from SLMS.
    `;

    return this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed:', error);
      return false;
    }
  }
}
