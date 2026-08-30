# 📦 StockWatch — Case Study & Technical Overview

> **Automated Google Sheets Inventory Monitoring & Proactive WhatsApp / SMS Low-Stock Alert System**

---

## 🎯 Executive Summary & Problem Statement

For small and medium-sized retail stores managing 200+ SKUs, inventory counts are traditionally recorded in a Google Sheet. However, because stock levels are only checked manually, stockouts frequently occur on active-selling items when no one notices an item has dropped below its reorder threshold.

Migrating to a enterprise inventory management platform (like TradeGecko or NetSuite) is often cost-prohibitive and requires staff retraining. **StockWatch** solves this problem by turning an existing Google Sheet into an automated, proactive monitoring engine that sends real-time **WhatsApp or SMS alerts** directly to store managers the moment stock drops below reorder thresholds — before items run out completely.

---

## 👥 Who StockWatch Is Built For

- **Small Business Owners & Store Managers** who rely on Google Sheets as their single source of truth and want automated alerts without migrating their data.
- **Retail & Service Businesses (200+ SKUs)** tracking fast-moving goods (office supplies, toner cartridges, pantry stock, tech accessories, cleaning supplies).
- **Operations Teams in Nigeria & Emerging Markets** requiring reliable SMS/WhatsApp gateway delivery via regional providers like **Termii** and **Africa's Talking**.

---

## 💡 Key Architectural & Engineering Decisions

### 1. Data Access & Single Source of Truth: Google Sheets API
- **Decision**: Read and write inventory data directly via the Google Sheets API (`googleapis`).
- **Rationale**: Retail staff already know how to edit Google Sheets. By preserving the Sheet as the primary database, we eliminated data migration friction and user adoption resistance.
- **Two-Way Sync**: When a store manager adjusts a product's reorder threshold on the StockWatch web dashboard, the engine updates the corresponding cell in the Google Sheet in real time.
- **Resilience**: Integrated a `MockSheetsService` fallback with realistic retail data so the app can run out-of-the-box in demo mode before GCP credentials are configured.

### 2. Runtime & Architecture: Single-Process Node.js + Express
- **Decision**: Built using **Node.js (ES Modules)**, **Express.js**, and **`node-cron`**.
- **Rationale**: Combining the background monitoring worker and the web view inside a single Node.js process keeps the memory footprint under **50MB RAM**. This eliminates the need for expensive background task queues (e.g. Redis, Celery) or separate worker servers, making StockWatch 100% free to host on platforms like Render, Railway, or Fly.io.

### 3. Anti-Spam & Deduplication: Smart Cooldown Engine
- **Decision**: Local persistent state store (`data/alert_store.json`) tracking last alert timestamps and low-stock states per SKU.
- **Rationale**: Sending an SMS every hour for an unresolved low-stock item causes alert fatigue and drains SMS credits.
- **Rules Engine**:
  - **Initial Low Stock**: Triggers instant WhatsApp/SMS alert upon crossing threshold.
  - **Active Cooldown**: Suppresses duplicate alerts for a configurable period (default: 24 hours).
  - **Periodic Reminder**: Sends a reminder alert only after the 24-hour cooldown elapses if stock remains low.
  - **Automatic Reset**: When stock is replenished above threshold (`Quantity > Threshold`), the system automatically clears the low-stock flag so future drops trigger new alerts.

### 4. Messaging Gateway: Adapter Pattern (Termii & Africa's Talking)
- **Decision**: Clean `BaseNotificationProvider` interface behind a `NotificationFactory`.
- **Rationale**: Messaging API availability varies by region. Wrapping Termii (Nigeria SMS/WhatsApp) and Africa's Talking (African SMS) behind a unified interface allows swapping providers via environment variable (`MESSAGING_PROVIDER=TERMII`) without touching core business logic.
- **Mock Provider**: Includes a console logger provider (`MockProvider`) so developers can test full notification flows without consuming live SMS credits.

### 5. Frontend Design: Modern Glassmorphism Dashboard
- **Decision**: Developed using vanilla HTML5, modern CSS custom properties (glassmorphism cards, dark theme, fluid grid), and native JavaScript.
- **Rationale**: Avoids heavy frontend build tooling (Next.js/React) while delivering a state-of-the-art UI with micro-animations, real-time metrics cards, search filters, and an inline threshold editing modal.

---

## 🏗️ System Architecture Flow

```
+-----------------------------------------------------------------------------------+
|                                  DATA SOURCE                                      |
|                       Google Sheet (Single Source of Truth)                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Reads Inventory (Every 60 mins)
                                         v
+-----------------------------------------------------------------------------------+
|                                STOCKWATCH ENGINE                                  |
|  - Compares Current Quantity vs Reorder Threshold                                  |
|  - Evaluates Cooldown Engine & State Store (data/alert_store.json)                |
|  - Formats Alert Message with Supplier Contact Details                            |
+-----------------------------------------------------------------------------------+
                   |                                             |
                   | Dispatches Alert                            | Serves Web API & UI
                   v                                             v
+------------------------------------+         +------------------------------------+
|         MESSAGING GATEWAY          |         |           WEB DASHBOARD            |
| - Termii (SMS / WhatsApp)          |         | - Metric Cards & Low Stock Table   |
| - Africa's Talking (SMS)           |         | - Manual Check Trigger Button      |
| - Mock Console Provider            |         | - Inline Threshold Editor Modal    |
+------------------------------------+         +------------------------------------+
                   |                                             |
                   | Delivers SMS/WhatsApp                       | Writes Back New
                   v                                             | Threshold Values
+------------------------------------+                           |
|       STORE MANAGER PHONE          | <-------------------------+
+------------------------------------+
```

---

## 🛠️ Project Structure

```
StockWatch App/
├── .env.example              # Configuration template
├── package.json              # Node.js dependencies & scripts
├── data/
│   └── alert_store.json      # Persistent alert history & cooldown state
├── docs/
│   ├── SETUP_GUIDE.md        # Step-by-step GCP & Gateway setup guide
│   ├── TECHNICAL_SUMMARY.md  # Non-technical executive summary
│   └── PROJECT_JOURNAL.md    # Development log & decision history
├── src/
│   ├── config.js             # Environment configuration loader
│   ├── server.js             # Express API server
│   ├── scheduler.js          # Background cron monitor
│   ├── services/
│   │   ├── sheetsService.js  # Google Sheets API integration
│   │   ├── mockSheetsService.js # Simulated inventory data
│   │   ├── alertService.js   # Monitoring logic & cooldown engine
│   │   └── stateStore.js     # File-backed persistence adapter
│   ├── providers/
│   │   ├── notificationInterface.js # Base notification provider
│   │   ├── termiiProvider.js        # Termii SMS & WhatsApp provider
│   │   ├── africasTalkingProvider.js# Africa's Talking SMS provider
│   │   ├── mockProvider.js          # Console log mock provider
│   │   └── notificationFactory.js   # Provider factory
│   └── public/
│       ├── index.html        # Glassmorphism HTML dashboard
│       ├── styles.css        # Dark theme CSS design system
│       └── app.js            # Frontend JavaScript controller
└── test/
    └── verify.js             # Automated 13-step test suite
```

---

## ⚡ Quick Start Guide

### 1. Clone & Install
```bash
git clone <repository-url>
cd "StockWatch App"
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your parameters:
```env
PORT=3000
CHECK_INTERVAL_MINUTES=60
DEFAULT_REORDER_THRESHOLD=10
COOLDOWN_HOURS=24
RECIPIENT_PHONE_NUMBERS=+2348012345678

# Google Sheets
SPREADSHEET_ID=your_google_sheet_id
SHEET_NAME=Sheet1
USE_MOCK_SHEETS=true # Set false when Google credentials added

# Messaging Provider: MOCK | TERMII | AFRICAS_TALKING
MESSAGING_PROVIDER=MOCK
```

### 3. Run Application
```bash
# Start background worker & web view
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Verification & Testing

Run the automated test suite to verify sheets parsing, alert rules, restock resets, and gateway providers:
```bash
npm test
```
**Results**: 13 out of 13 integration tests passing.

---

## 📄 Documentation Links
- 📘 [Setup & Integration Guide](file:///Users/henryfriendselectronicx/Desktop/StockWatch%20App/docs/SETUP_GUIDE.md)
- 📊 [Executive Technical Summary](file:///Users/henryfriendselectronicx/Desktop/StockWatch%20App/docs/TECHNICAL_SUMMARY.md)
- 📓 [Development Project Journal](file:///Users/henryfriendselectronicx/Desktop/StockWatch%20App/docs/PROJECT_JOURNAL.md)
