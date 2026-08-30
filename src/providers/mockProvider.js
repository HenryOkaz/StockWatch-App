import { BaseNotificationProvider } from './notificationInterface.js';

export class MockProvider extends BaseNotificationProvider {
  constructor() {
    super('Mock Gateway (Console Logging)');
  }

  async sendAlert({ recipient, message }) {
    const timestamp = new Date().toISOString();
    console.log(`\n========================================`);
    console.log(`[MOCK NOTIFICATION DISPATCH] ${timestamp}`);
    console.log(`Recipient: ${recipient}`);
    console.log(`Content:\n"${message}"`);
    console.log(`========================================\n`);

    // Simulate short network delay
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      success: true,
      messageId: `MOCK-${Date.now()}`,
      rawResponse: { status: 'SIMULATED_SUCCESS', note: 'Mock mode active. No actual SMS/WhatsApp charged.' }
    };
  }
}
