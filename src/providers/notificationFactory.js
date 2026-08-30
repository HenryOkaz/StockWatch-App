import { config } from '../config.js';
import { TermiiProvider } from './termiiProvider.js';
import { AfricasTalkingProvider } from './africasTalkingProvider.js';
import { MockProvider } from './mockProvider.js';

export class NotificationFactory {
  static getProvider(providerName = config.messaging.provider) {
    const name = (providerName || 'MOCK').toUpperCase();

    switch (name) {
      case 'TERMII':
        return new TermiiProvider(config.messaging.termii);
      case 'AFRICAS_TALKING':
      case 'AFRICASTALKING':
        return new AfricasTalkingProvider(config.messaging.africasTalking);
      case 'MOCK':
      default:
        return new MockProvider();
    }
  }
}
