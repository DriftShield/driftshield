const { notifications } = require('../db');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Create notification
   */
  async createNotification(data) {
    const notification = await notifications.create(data);

    // Send via enabled channels
    await this.sendNotification(notification);

    return notification;
  }

  /**
   * Send notification via channels
   */
  async sendNotification(notification) {
    const user = await req.app.locals.db.oneOrNone(
      'SELECT * FROM users WHERE id = $1',
      [notification.user_id],
    );

    if (!user) return;

    // Get user settings
    const settings = await req.app.locals.db.oneOrNone(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [user.id],
    );

    if (!settings) return;

    const notifSettings = settings.notifications || {};

    // Send email
    if (notifSettings.email && notifSettings.email[notification.type] && user.email) {
      await this.sendEmail(user.email, notification);
    }

    // Send SMS for critical
    if (notification.priority === 'urgent' && notifSettings.sms?.critical_alerts) {
      // SMS integration
    }

    // Send webhook
    if (notifSettings.webhook?.url) {
      await this.sendWebhook(notifSettings.webhook.url, notification);
    }

    // Publish to WebSocket
    await this.publishToWebSocket(notification);
  }

  /**
   * Send email notification
   */
  async sendEmail(email, notification) {
    // Email service integration - placeholder
    logger.info('Sending email notification', { email, type: notification.type });
  }

  /**
   * Send webhook
   */
  async sendWebhook(url, notification) {
    try {
      const axios = require('axios');
      await axios.post(url, {
        event: notification.type,
        data: notification,
        timestamp: new Date().toISOString(),
      });

      await req.app.locals.db.none(
        'UPDATE notifications SET sent_via_webhook = true WHERE id = $1',
        [notification.id],
      );
    } catch (error) {
      logger.error('Webhook send failed', { error: error.message, url });
    }
  }

  /**
   * Publish to WebSocket
   */
  async publishToWebSocket(notification) {
    const { redisPubSub } = require('../config/redis');
    await redisPubSub.publish(
      `updates:user:${notification.user_id}`,
      JSON.stringify({ type: 'notification', data: notification }),
    );
  }

  /**
   * Send drift warning
   */
  async sendDriftWarning(modelId, driftData) {
    const model = await req.app.locals.db.oneOrNone(
      'SELECT * FROM models WHERE id = $1',
      [modelId],
    );

    if (!model) return;

    await this.createNotification({
      user_id: model.owner_id,
      type: 'drift_warning',
      title: `⚠️ Drift Detected: ${model.name}`,
      message: `Your model "${model.name}" has detected drift of ${driftData.drift_percentage}% (threshold: ${model.drift_threshold_percent}%)`,
      priority: driftData.drift_percentage > model.drift_threshold_percent * 2 ? 'urgent' : 'high',
      related_entity_type: 'model',
      related_entity_id: modelId,
      metadata: driftData,
    });
  }

  /**
   * Send market expiring alert
   */
  async sendMarketExpiringAlert(marketId) {
    const positions = await req.app.locals.db.any(
      'SELECT DISTINCT user_id FROM positions WHERE market_id = $1',
      [marketId],
    );

    const market = await req.app.locals.db.oneOrNone(
      'SELECT * FROM markets WHERE id = $1',
      [marketId],
    );

    if (!market) return;

    for (const pos of positions) {
      await this.createNotification({
        user_id: pos.user_id,
        type: 'market_expiring',
        title: 'Market Expiring Soon',
        message: `The market "${market.question}" expires in 24 hours`,
        priority: 'normal',
        related_entity_type: 'market',
        related_entity_id: marketId,
      });
    }
  }

  /**
   * Send winnings available
   */
  async sendWinningsAvailable(userId, marketId, amount) {
    const market = await req.app.locals.db.oneOrNone(
      'SELECT * FROM markets WHERE id = $1',
      [marketId],
    );

    await this.createNotification({
      user_id: userId,
      type: 'wins_available',
      title: '🎉 You Won! Claim Your Winnings',
      message: `You won ${amount / 1e6} USDC in the market "${market?.question || 'Unknown'}". Claim now!`,
      priority: 'high',
      related_entity_type: 'market',
      related_entity_id: marketId,
      metadata: { amount },
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, limit = 50, offset = 0) {
    return notifications.findByUser(userId, limit, offset);
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(userId) {
    return notifications.findUnread(userId);
  }

  /**
   * Mark as read
   */
  async markAsRead(notificationId) {
    await notifications.markAsRead(notificationId);
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    await notifications.markAllAsRead(userId);
  }
}

module.exports = new NotificationService();
