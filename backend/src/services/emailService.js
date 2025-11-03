const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Send email using SendGrid
   */
  async send(to, subject, html, text) {
    if (!process.env.SENDGRID_API_KEY) {
      logger.warn('SendGrid API key not configured, skipping email');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@driftshield.io',
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html,
      };

      await sgMail.send(msg);

      logger.info('Email sent successfully', { to, subject });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send templated email
   */
  async sendTemplate(to, templateId, dynamicData) {
    if (!process.env.SENDGRID_API_KEY) {
      logger.warn('SendGrid API key not configured, skipping email');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@driftshield.io',
        templateId,
        dynamicTemplateData: dynamicData,
      };

      await sgMail.send(msg);

      logger.info('Template email sent successfully', { to, templateId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send template email', {
        to,
        templateId,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to, username) {
    const subject = 'Welcome to DriftShield!';
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Welcome to DriftShield! 🎉</h1>
          <p>Hi ${username},</p>
          <p>Welcome to DriftShield, the platform for ML model drift monitoring and prediction markets!</p>
          <p>You can now:</p>
          <ul>
            <li>Register your ML models for automated drift monitoring</li>
            <li>Create prediction markets on model performance</li>
            <li>Purchase insurance policies to protect against drift</li>
            <li>Track your portfolio and earnings</li>
          </ul>
          <p style="margin-top: 30px;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard"
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Go to Dashboard
            </a>
          </p>
          <p style="margin-top: 30px; color: #6B7280;">
            Need help? Check out our <a href="${process.env.APP_URL}/docs">documentation</a>
            or reach out to <a href="mailto:support@driftshield.io">support@driftshield.io</a>
          </p>
        </body>
      </html>
    `;

    return this.send(to, subject, html);
  }

  /**
   * Send drift warning email
   */
  async sendDriftWarning(to, modelName, driftPercentage, threshold, dashboardLink) {
    const subject = `⚠️ Model Drift Detected: ${modelName}`;
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #EF4444;">⚠️ Drift Detected</h1>
          <p>Your model <strong>${modelName}</strong> has detected drift!</p>
          <div style="background-color: #FEE2E2; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px;">
              Drift: <strong style="color: #DC2626;">${driftPercentage.toFixed(2)}%</strong>
            </p>
            <p style="margin: 8px 0 0 0;">
              Threshold: <strong>${threshold}%</strong>
            </p>
          </div>
          <p>This indicates that your model's performance has degraded beyond the threshold.</p>
          <p><strong>Recommended Actions:</strong></p>
          <ul>
            <li>Review your model's latest predictions</li>
            <li>Check for data quality issues</li>
            <li>Consider retraining your model</li>
          </ul>
          <p style="margin-top: 30px;">
            <a href="${dashboardLink}"
               style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Details
            </a>
          </p>
        </body>
      </html>
    `;

    return this.send(to, subject, html);
  }

  /**
   * Send market expiring alert
   */
  async sendMarketExpiringAlert(to, marketQuestion, hoursRemaining, marketLink) {
    const subject = `Market Expiring Soon: ${marketQuestion}`;
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #F59E0B;">⏰ Market Expiring Soon</h1>
          <p>The market you participated in is expiring soon:</p>
          <div style="background-color: #FEF3C7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">${marketQuestion}</p>
            <p style="margin: 8px 0 0 0; color: #92400E;">
              Time remaining: ${hoursRemaining} hours
            </p>
          </div>
          <p style="margin-top: 30px;">
            <a href="${marketLink}"
               style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Market
            </a>
          </p>
        </body>
      </html>
    `;

    return this.send(to, subject, html);
  }

  /**
   * Send winnings available notification
   */
  async sendWinningsAvailable(to, amount, marketName, claimLink) {
    const subject = '🎉 You Won! Claim Your Winnings';
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10B981;">🎉 Congratulations!</h1>
          <p>You won a market prediction!</p>
          <div style="background-color: #D1FAE5; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #059669;">
              ${(amount / 1e6).toFixed(2)} USDC
            </p>
            <p style="margin: 8px 0 0 0; color: #065F46;">
              Market: ${marketName}
            </p>
          </div>
          <p style="margin-top: 30px; text-align: center;">
            <a href="${claimLink}"
               style="background-color: #10B981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 18px;">
              Claim Now
            </a>
          </p>
        </body>
      </html>
    `;

    return this.send(to, subject, html);
  }

  /**
   * Send insurance claim approved notification
   */
  async sendInsuranceClaimApproved(to, policyId, payoutAmount) {
    const subject = 'Insurance Claim Approved';
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10B981;">✅ Claim Approved</h1>
          <p>Your insurance claim has been approved!</p>
          <div style="background-color: #D1FAE5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">Policy ID: <strong>${policyId}</strong></p>
            <p style="margin: 8px 0 0 0;">
              Payout: <strong>${(payoutAmount / 1e6).toFixed(2)} USDC</strong>
            </p>
          </div>
          <p>The payout has been credited to your wallet.</p>
        </body>
      </html>
    `;

    return this.send(to, subject, html);
  }
}

module.exports = new EmailService();

