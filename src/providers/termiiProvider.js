import axios from 'axios';
import { BaseNotificationProvider } from './notificationInterface.js';

export class TermiiProvider extends BaseNotificationProvider {
  constructor(config) {
    super('Termii');
    this.apiKey = config.apiKey;
    this.senderId = config.senderId || 'StockWatch';
    this.channel = config.channel || 'generic'; // 'generic' (SMS) or 'whatsapp'
    this.baseUrl = config.baseUrl || 'https://api.ng.termii.com';
  }

  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    // If phone starts with 0 and length is 11 (e.g. 08012345678 in Nigeria), prepend 234
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '234' + cleaned.substring(1);
    }
    return cleaned;
  }

  async sendAlert({ recipient, message }) {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Termii API Key is missing. Please set TERMII_API_KEY in environment configuration.'
      };
    }

    const formattedRecipient = this.formatPhoneNumber(recipient);

    try {
      const payload = {
        to: formattedRecipient,
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: this.channel,
        api_key: this.apiKey
      };

      console.log(`[Termii] Sending ${this.channel.toUpperCase()} to ${formattedRecipient}...`);

      const response = await axios.post(`${this.baseUrl}/api/sms/send`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      // Termii returns code "ok" or message_id on success
      if (response.data && (response.data.message_id || response.data.code === 'ok' || response.status === 200)) {
        return {
          success: true,
          messageId: response.data.message_id || response.data.message || 'SENT',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Termii API returned non-success response.',
          rawResponse: response.data
        };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to send alert via Termii';
      console.error(`[Termii Error]`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        rawResponse: error.response?.data || null
      };
    }
  }
}
