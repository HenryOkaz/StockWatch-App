import dotenv from 'dotenv';
import path from 'path';
import fileSystem from 'fs';

// Load .env file
dotenv.config();

const ROOT_DIR = process.cwd();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Monitoring parameters
  checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '60', 10),
  defaultReorderThreshold: parseInt(process.env.DEFAULT_REORDER_THRESHOLD || '10', 10),
  cooldownHours: parseFloat(process.env.COOLDOWN_HOURS || '24'),
  
  // Alert recipients (array of phone numbers)
  recipientPhoneNumbers: (process.env.RECIPIENT_PHONE_NUMBERS || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean),

  // Google Sheets configuration
  google: {
    spreadsheetId: process.env.SPREADSHEET_ID || '',
    sheetName: process.env.SHEET_NAME || 'Sheet1',
    keyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(ROOT_DIR, 'google-credentials.json'),
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    useMock: process.env.USE_MOCK_SHEETS === 'true' || !process.env.SPREADSHEET_ID
  },

  // Messaging Gateway configuration
  // Options: MOCK | TERMII | AFRICAS_TALKING
  messaging: {
    provider: (process.env.MESSAGING_PROVIDER || 'MOCK').toUpperCase(),
    
    // Termii credentials
    termii: {
      apiKey: process.env.TERMII_API_KEY || '',
      senderId: process.env.TERMII_SENDER_ID || 'StockWatch',
      channel: process.env.TERMII_CHANNEL || 'generic', // 'generic' (SMS) or 'whatsapp'
      baseUrl: 'https://api.ng.termii.com'
    },
    
    // Africa's Talking credentials
    africasTalking: {
      apiKey: process.env.AFRICASTALKING_API_KEY || '',
      username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
      senderId: process.env.AFRICASTALKING_SENDER_ID || '',
      baseUrl: process.env.AFRICASTALKING_USERNAME === 'sandbox' 
        ? 'https://api.sandbox.africastalking.com'
        : 'https://api.africastalking.com'
    }
  },

  // Data persistence path for alert state
  dataDir: path.join(ROOT_DIR, 'data'),
  stateFilePath: path.join(ROOT_DIR, 'data', 'alert_store.json')
};
