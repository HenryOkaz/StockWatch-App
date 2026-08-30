/**
 * Base Notification Provider Interface
 */
export class BaseNotificationProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Send an alert notification
   * @param {Object} options
   * @param {string} options.recipient - Target phone number
   * @param {string} options.message - Formatted alert message text
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string, rawResponse?: any }>}
   */
  async sendAlert({ recipient, message }) {
    throw new Error(`[${this.name}] sendAlert method not implemented.`);
  }

  /**
   * Send a test message to verify credentials
   * @param {string} recipient 
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async sendTestNotification(recipient) {
    return this.sendAlert({
      recipient,
      message: `🔔 StockWatch Gateway Test: Your ${this.name} notification integration is working correctly!`
    });
  }
}
