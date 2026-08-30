import axios from 'axios';
import querystring from 'querystring';
import { BaseNotificationProvider } from './notificationInterface.js';

export class AfricasTalkingProvider extends BaseNotificationProvider {
  constructor(config) {
    super("Africa's Talking");
    this.apiKey = config.apiKey;
    this.username = config.username || 'sandbox';
    this.senderId = config.senderId || '';
    this.baseUrl = config.baseUrl || (this.username === 'sandbox' 
      ? 'https://api.sandbox.africastalking.com'
      : 'https://api.africastalking.com');
  }

  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '+234' + cleaned.substring(1);
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  async sendAlert({ recipient, message }) {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Africa's Talking API Key is missing. Please set AFRICASTALKING_API_KEY in environment configuration."
      };
    }

    const formattedRecipient = this.formatPhoneNumber(recipient);

    try {
      const payload = {
        username: this.username,
        to: formattedRecipient,
        message: message
      };

      if (this.senderId) {
        payload.from = this.senderId;
      }

      console.log(`[Africa's Talking] Sending SMS to ${formattedRecipient}...`);

      const response = await axios.post(
        `${this.baseUrl}/v1/messaging`,
        querystring.stringify(payload),
        {
          headers: {
            'apiKey': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const recipientData = response.data?.SMSMessageData?.Recipients?.[0];
      if (recipientData && (recipientData.status === 'Success' || recipientData.statusCode === 101)) {
        return {
          success: true,
          messageId: recipientData.messageId || 'SENT',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: recipientData?.status || response.data?.SMSMessageData?.Message || 'API call failed',
          rawResponse: response.data
        };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.SMSMessageData?.Message || error.message || "Failed to send alert via Africa's Talking";
      console.error(`[Africa's Talking Error]`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        rawResponse: error.response?.data || null
      };
    }
  }
}
