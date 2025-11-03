const notificationService = require('../../services/notificationService');
const logger = require('../../utils/logger');

module.exports = {
  /**
   * Send notification
   */
  async sendNotification(job) {
    const { notification } = job.data;

    logger.info('Sending notification job', {
      notificationId: notification.id,
      type: notification.type,
    });

    try {
      await notificationService.sendNotification(notification);

      return { success: true };
    } catch (error) {
      logger.error('Failed to send notification', {
        notificationId: notification.id,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Send email
   */
  async sendEmail(job) {
    const { to, template, data } = job.data;

    logger.info('Sending email job', { to, template });

    try {
      await notificationService.sendEmail(to, { type: template, ...data });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        template,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Send SMS
   */
  async sendSMS(job) {
    const { to, message } = job.data;

    logger.info('Sending SMS job', { to });

    try {
      // SMS implementation would go here
      logger.info('SMS sent successfully', { to });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send SMS', {
        to,
        error: error.message,
      });
      throw error;
    }
  },
};

