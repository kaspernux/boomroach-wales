import * as nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import logger from "../../../shared/utils/logger";

interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: EmailTemplateData;
  priority?: "high" | "normal" | "low";
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;
  private isConfigured = false;

  constructor() {
    this.setupTransporter();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private setupTransporter() {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn("📧 Email service not configured - missing SMTP credentials");
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number.parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.isConfigured = true;
      logger.info("📧 Email service configured successfully");
    } catch (error) {
      logger.error("📧 Failed to configure email service:", error);
      this.isConfigured = false;
    }
  }

  private getTemplate(templateName: string): string {
    const templatePath = path.join(__dirname, "../templates/email", `${templateName}.html`);

    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, "utf-8");
    }

    // Fallback to built-in templates
    return this.getBuiltInTemplate(templateName);
  }

  private getBuiltInTemplate(templateName: string): string {
    const templates = {
      verification: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your BoomRoach Account</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%); }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
            .header { background: linear-gradient(135deg, #39ff14 0%, #ff6b35 50%, #ff1744 100%); padding: 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 10px; }
            .content { padding: 40px 30px; color: #ffffff; }
            .button { display: inline-block; background: linear-gradient(135deg, #39ff14 0%, #ff6b35 100%); color: #000 !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .footer { background: #0a0a0a; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .roach { font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🪳 BoomRoach</div>
              <div style="color: #000; font-size: 16px;">The Unkillable Meme Coin</div>
            </div>
            <div class="content">
              <h2 style="color: #39ff14;">Welcome to the Army, {{username}}!</h2>
              <p>Thank you for joining the strongest crypto community. Your roach powers are almost ready!</p>
              <p>To activate your account and start trading with our AI-powered Hydra-Bot engines, please verify your email address:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{verificationUrl}}" class="button">🚀 Verify Email & Join Army</a>
              </div>
              <p><strong>What awaits you:</strong></p>
              <ul style="color: #39ff14;">
                <li>🤖 Access to 6 AI trading engines</li>
                <li>📊 Real-time portfolio tracking</li>
                <li>💬 Community chat and signals</li>
                <li>🎯 Advanced risk management</li>
                <li>🏆 Gamification and rewards</li>
              </ul>
              <p>This verification link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>🪳 BoomRoach - Survive anything, profit everything</p>
              <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; color: #39ff14;">{{verificationUrl}}</p>
            </div>
          </div>
        </body>
        </html>
      `,

      welcome: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to BoomRoach Army!</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%); }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
            .header { background: linear-gradient(135deg, #39ff14 0%, #ff6b35 50%, #ff1744 100%); padding: 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 10px; }
            .content { padding: 40px 30px; color: #ffffff; }
            .button { display: inline-block; background: linear-gradient(135deg, #39ff14 0%, #ff6b35 100%); color: #000 !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .stats { background: #0a0a0a; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .stat { display: inline-block; text-align: center; margin: 0 20px; }
            .stat-number { font-size: 24px; font-weight: bold; color: #39ff14; }
            .stat-label { font-size: 12px; color: #999; }
            .footer { background: #0a0a0a; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🪳 BoomRoach</div>
              <div style="color: #000; font-size: 16px;">Army Activation Successful!</div>
            </div>
            <div class="content">
              <h2 style="color: #39ff14;">🎉 Welcome to the Roach Army, {{username}}!</h2>
              <p>Your email has been verified and your account is now fully activated. You're officially part of the most unkillable crypto community!</p>

              <div class="stats">
                <div class="stat">
                  <div class="stat-number">6</div>
                  <div class="stat-label">Trading Engines</div>
                </div>
                <div class="stat">
                  <div class="stat-number">94.7%</div>
                  <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat">
                  <div class="stat-number">24.7K</div>
                  <div class="stat-label">Army Members</div>
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboardUrl}}" class="button">🚀 Enter Dashboard</a>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol style="color: #39ff14;">
                <li>🔗 Connect your Solana wallet</li>
                <li>💰 Get some BOOMROACH tokens</li>
                <li>🤖 Activate Hydra-Bot engines</li>
                <li>📈 Start automated trading</li>
                <li>💬 Join our community chat</li>
              </ol>

              <p>Need help? Our roach army is always ready to assist. Join our Discord or Telegram channels!</p>
            </div>
            <div class="footer">
              <p>🪳 BoomRoach - The future of meme coin trading</p>
              <p>Follow us: Twitter @BoomRoach | Discord | Telegram</p>
            </div>
          </div>
        </body>
        </html>
      `,

      passwordReset: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your BoomRoach Password</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%); }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
            .header { background: linear-gradient(135deg, #ff1744 0%, #ff6b35 50%, #39ff14 100%); padding: 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 10px; }
            .content { padding: 40px 30px; color: #ffffff; }
            .button { display: inline-block; background: linear-gradient(135deg, #ff1744 0%, #ff6b35 100%); color: #fff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .warning { background: #ff1744; color: #fff; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #0a0a0a; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🪳 BoomRoach</div>
              <div style="color: #000; font-size: 16px;">Password Reset Request</div>
            </div>
            <div class="content">
              <h2 style="color: #ff6b35;">🔒 Password Reset Requested</h2>
              <p>Hello {{username}},</p>
              <p>We received a request to reset your BoomRoach account password. If this was you, click the button below to create a new password:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" class="button">🔑 Reset Password</a>
              </div>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>This link expires in 1 hour</li>
                  <li>If you didn't request this reset, ignore this email</li>
                  <li>Never share your password with anyone</li>
                  <li>BoomRoach will never ask for your password via email</li>
                </ul>
              </div>

              <p>For your security, this reset link can only be used once and will expire in 1 hour.</p>
            </div>
            <div class="footer">
              <p>🪳 BoomRoach Security Team</p>
              <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; color: #ff6b35;">{{resetUrl}}</p>
            </div>
          </div>
        </body>
        </html>
      `,

      tradingAlert: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trading Alert - BoomRoach</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%); }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
            .header { background: linear-gradient(135deg, #00ff88 0%, #39ff14 100%); padding: 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 10px; }
            .content { padding: 40px 30px; color: #ffffff; }
            .alert-box { background: {{alertColor}}; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .trade-details { background: #0a0a0a; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .footer { background: #0a0a0a; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🪳 BoomRoach</div>
              <div style="color: #000; font-size: 16px;">Hydra-Bot Trading Alert</div>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2>{{alertType}} - {{engineName}}</h2>
                <p>{{alertMessage}}</p>
              </div>

              <div class="trade-details">
                <h3 style="color: #39ff14;">Trade Details</h3>
                <div class="detail-row">
                  <span>Token:</span>
                  <span style="color: #39ff14;">{{tokenSymbol}}</span>
                </div>
                <div class="detail-row">
                  <span>Amount:</span>
                  <span>{{amount}}</span>
                </div>
                <div class="detail-row">
                  <span>Price:</span>
                  <span>{{price}}</span>
                </div>
                <div class="detail-row">
                  <span>P&L:</span>
                  <span style="color: {{pnlColor}};">{{pnl}}</span>
                </div>
                <div class="detail-row">
                  <span>Time:</span>
                  <span>{{timestamp}}</span>
                </div>
              </div>

              <p>Check your dashboard for complete trading details and portfolio updates.</p>
            </div>
            <div class="footer">
              <p>🤖 BoomRoach Hydra-Bot System</p>
              <p>To stop receiving trading alerts, update your notification preferences in the dashboard.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return templates[templateName as keyof typeof templates] || templates.verification;
  }

  private replaceTemplateVariables(template: string, data: EmailTemplateData): string {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn("📧 Email service not configured, skipping email send");
      return false;
    }

    try {
      const template = this.getTemplate(options.template);
      const htmlContent = this.replaceTemplateVariables(template, options.data);

      const mailOptions = {
        from: process.env.SMTP_FROM || "BoomRoach <noreply@boomroach.wales>",
        to: options.to,
        subject: options.subject,
        html: htmlContent,
        priority: options.priority || "normal",
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info(`📧 Email sent successfully to ${options.to}`, {
        messageId: result.messageId,
        template: options.template,
      });

      return true;
    } catch (error) {
      logger.error("📧 Failed to send email:", error);
      return false;
    }
  }

  // Convenience methods for common email types
  async sendVerificationEmail(email: string, username: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    return this.sendEmail({
      to: email,
      subject: "🪳 Verify Your BoomRoach Account - Join the Army!",
      template: "verification",
      data: {
        username,
        verificationUrl,
      },
      priority: "high",
    });
  }

  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

    return this.sendEmail({
      to: email,
      subject: "🎉 Welcome to BoomRoach Army - You're In!",
      template: "welcome",
      data: {
        username,
        dashboardUrl,
      },
    });
  }

  async sendPasswordResetEmail(email: string, username: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to: email,
      subject: "🔒 Reset Your BoomRoach Password",
      template: "passwordReset",
      data: {
        username,
        resetUrl,
      },
      priority: "high",
    });
  }

  async sendTradingAlert(
    email: string,
    alertType: string,
    engineName: string,
    tradeData: any
  ): Promise<boolean> {
    const alertColors = {
      "PROFIT": "#00ff88",
      "LOSS": "#ff1744",
      "WARNING": "#ff6b35",
      "INFO": "#39ff14"
    };

    const pnlColor = tradeData.pnl >= 0 ? "#00ff88" : "#ff1744";

    return this.sendEmail({
      to: email,
      subject: `🤖 ${alertType} Alert - ${engineName}`,
      template: "tradingAlert",
      data: {
        alertType,
        engineName,
        alertMessage: tradeData.message || "Trading activity detected",
        alertColor: alertColors[alertType as keyof typeof alertColors] || "#39ff14",
        tokenSymbol: tradeData.tokenSymbol,
        amount: tradeData.amount,
        price: tradeData.price,
        pnl: tradeData.pnl,
        pnlColor,
        timestamp: new Date().toLocaleString(),
      },
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info("📧 Email service connection verified");
      return true;
    } catch (error) {
      logger.error("📧 Email service connection failed:", error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
