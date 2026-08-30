# StockWatch 📦📱

> **Continuous Automated Google Sheets Inventory Monitor with WhatsApp & SMS Low Stock Alerts**

StockWatch is an automated inventory monitoring solution for retail and service stores tracking stock in Google Sheets. It monitors stock counts against reorder thresholds, deduplicates alerts, and dispatches real-time WhatsApp or SMS notifications via **Termii** or **Africa's Talking** gateway APIs.

---

## Features

- 📊 **Google Sheets Integration**: Reads live stock levels directly from your existing Google Sheet without data migration.
- ⚠️ **Automated Low Stock Monitoring**: Flags items where `Current Quantity <= Reorder Threshold`.
- 🔕 **Smart Anti-Spam & Cooldown**: Prevents duplicate alerts per low stock event; re-alerts only after configurable cooldown (e.g. 24h) or upon restocking and dropping again.
- 📲 **Pluggable Messaging Gateways**: Native support for **Termii** (SMS & WhatsApp), **Africa's Talking** (SMS), and a built-in **Mock Provider** for offline testing.
- 🖥️ **Modern Web Dashboard**: Glassmorphism UI showing total SKUs, active low-stock items, live alert log, instant "Check Stock Now" button, and inline reorder threshold editor.
- 🔄 **Two-Way Sheet Sync**: Updating reorder thresholds in the web view writes back directly to the Google Sheet.

---

## Quick Start

### 1. Clone & Install
```bash
git clone <repository-url>
cd "StockWatch App"
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to set your Google Sheet ID, messaging gateway credentials, check frequency, and alert recipient phone numbers.

### 3. Run Application
```bash
# Start server and background scheduler
npm start
```
Open **`http://localhost:3000`** in your browser to view the interactive dashboard.

---

## Project Structure

```
StockWatch App/
├── .env.example              # Environment variables template
├── package.json              # Node.js project manifest & scripts
├── data/
│   └── alert_store.json      # Persistent state store for alert history & cooldowns
├── docs/
│   ├── SETUP_GUIDE.md        # Detailed setup for Google Sheets API & Gateway keys
│   └── TECHNICAL_SUMMARY.md  # Non-technical business owner executive summary
├── src/
│   ├── config.js             # Environment configuration manager
│   ├── server.js             # Express API server & static routes
│   ├── scheduler.js          # Background cron monitor runner
│   ├── services/
│   │   ├── sheetsService.js  # Google Sheets API read/write client
│   │   ├── mockSheetsService.js # Simulated inventory data for testing
│   │   ├── alertService.js   # Monitoring logic & cooldown engine
│   │   └── stateStore.js     # Persistent file storage adapter
│   ├── providers/
│   │   ├── notificationInterface.js # Base provider interface
│   │   ├── termiiProvider.js        # Termii SMS/WhatsApp client
│   │   ├── africasTalkingProvider.js# Africa's Talking SMS client
│   │   ├── mockProvider.js          # Console log provider
│   │   └── notificationFactory.js   # Provider selector
│   └── public/
│       ├── index.html        # Dashboard HTML
│       ├── styles.css        # Glassmorphism dark mode styles
│       └── app.js            # Frontend JavaScript controller
└── test/
    └── verify.js             # Automated verification test script
```

---

## Documentation
- 📘 [Setup & Integration Guide](file:///Users/henryfriendselectronicx/Desktop/StockWatch%20App/docs/SETUP_GUIDE.md)
- 📊 [Technical Summary for Business Owners](file:///Users/henryfriendselectronicx/Desktop/StockWatch%20App/docs/TECHNICAL_SUMMARY.md)
