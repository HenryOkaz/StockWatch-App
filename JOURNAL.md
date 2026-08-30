# 📓 StockWatch — Project Development Journal

This journal chronicles the end-to-end development history, architectural decisions, and technical milestones for **StockWatch**.

---

## 📌 Journal Entry #1 — Project Discovery & Requirements Definition
**Date**: August 30, 2026  
**Focus**: Requirements Analysis, Target User Persona & Architecture Strategy

### Context & Need
Retail and service businesses managing ~200 SKUs rely heavily on Google Sheets for stock tracking due to its simplicity. However, manual checks lead to frequent stockouts on fast-selling products because no automated alerts warn staff when stock crosses reorder thresholds.

### Key Requirements Established
1. **Google Sheets API as Data Source**: Must read stock levels from Google Sheets without forcing data migration.
2. **Automated Monitoring Engine**: Scheduled background checks (configurable e.g. every 1–4 hours).
3. **Multi-Gateway SMS / WhatsApp Alerts**: Support for **Termii** and **Africa's Talking** (optimized for Nigerian & African numbers) with clean provider abstraction.
4. **Anti-Spam Cooldown & Deduplication**: Flag low stock once per event; re-alert only after cooldown (e.g. 24h) or upon restocking and dropping again.
5. **Dashboard & Two-Way Threshold Editing**: Simple web UI to monitor live stock, manually trigger checks, view alert logs, and edit reorder thresholds (writing back to the Google Sheet).

### Tech Stack Decisions Made
- **Node.js (ES Modules) + Express**: Single lightweight process running background cron monitoring + REST API + static web server (~50MB RAM footprint).
- **Persistent File Storage (`data/alert_store.json`)**: Eliminates the need for a paid database subscription while preserving alert history and deduplication state across server restarts.

---

## 📌 Journal Entry #2 — Core Data Access & Provider Architecture
**Date**: August 30, 2026  
**Focus**: Google Sheets API Integration & Notification Adapter Pattern

### 1. Google Sheets API Client (`src/services/sheetsService.js`)
- Implemented dynamic header matching (`findColumnIndex`) for flexible column naming (e.g. "Product Name", "SKU", "Category", "Current Quantity", "Reorder Threshold", "Unit", "Supplier Name", "Supplier Contact").
- Created `updateReorderThreshold(sku, newThreshold)` to convert target column index into Google Sheets A1 notation (e.g., `Sheet1!E5`) and execute `values.update`.
- Built `mockSheetsService.js` to provide 10 realistic sample inventory items, enabling instant offline testing before Google Service Account credentials are attached.

### 2. Notification Gateway Adapter Pattern (`src/providers/`)
- Created `BaseNotificationProvider` interface requiring `sendAlert({ recipient, message })`.
- Implemented `TermiiProvider` (supporting Termii SMS & WhatsApp APIs).
- Implemented `AfricasTalkingProvider` (supporting Africa's Talking SMS API).
- Implemented `MockProvider` (formatting and logging alerts to console for zero-cost testing).
- Created `NotificationFactory` to select active provider dynamically based on `MESSAGING_PROVIDER` environment variable.

---

## 📌 Journal Entry #3 — Alert Cooldown Engine & State Persistence
**Date**: August 30, 2026  
**Focus**: State Machine, Deduplication Rules, & Persistence Store

### Cooldown Logic State Machine
To prevent alert fatigue and save SMS costs:
- **State Store (`src/services/stateStore.js`)**: Stores `productAlertState[sku]` (`lastAlertedAt`, `isLowStock`, `lastQuantity`) and `alertsLog` array in `data/alert_store.json`.
- **Deduplication Rules (`src/services/alertService.js`)**:
  - `currentQuantity > reorderThreshold`: Resets `isLowStock` to `false` and clears `lastAlertedAt`.
  - `currentQuantity <= reorderThreshold`:
    - If `!lastAlertedAt` OR `!isLowStock` → **Trigger Alert** (Initial low stock event).
    - If `hoursPassed >= COOLDOWN_HOURS` → **Trigger Alert** (24h reminder).
    - Otherwise → **Skip Alert** (Cooldown active).

---

## 📌 Journal Entry #4 — Dashboard Frontend & REST API
**Date**: August 30, 2026  
**Focus**: UI/UX Design System, Express API, & Live Interactions

### Express REST API (`src/server.js`)
Exposed endpoints for dashboard interaction:
- `GET /api/status`: Health check, provider status, scheduler info, store summary.
- `GET /api/inventory`: Enriched inventory list + low stock items.
- `POST /api/check-now`: Immediate manual stock check trigger.
- `POST /api/update-threshold`: Writes new reorder threshold back to Google Sheet.
- `POST /api/update-quantity`: Demo stock adjustment helper.
- `GET /api/alerts`: Historical alert log stream.
- `POST /api/send-test`: Test SMS notification trigger.
- `GET /api/sample-sheet`: CSV template generator download.

### Glassmorphism UI Design System (`src/public/`)
- Crafted modern dark mode interface (`styles.css`) using Google Fonts (`Outfit`, `Plus Jakarta Sans`), glassmorphism cards (`backdrop-filter: blur(16px)`), pulsing status indicators, and clean metric cards.
- Integrated inline threshold editing modal and toast notifications in `app.js`.

---

## 📌 Journal Entry #5 — Automated Verification & Documentation
**Date**: August 30, 2026  
**Focus**: Testing Suite, Git Repository Setup, & Final Deliverables

### Automated Testing (`test/verify.js`)
Created an automated test runner asserting:
1. `fetchInventory` returns parsed product items.
2. `NotificationFactory` retrieves correct provider.
3. Initial low stock triggers alert dispatch.
4. Second immediate check skips dispatch (cooldown active).
5. Restocking item resets low-stock state.
6. Dropping low after restock triggers new alert.
7. Alert history log persists entries.

**Test Execution Output**: `13 Passed, 0 Failed`.

### Git Initialization & Commits
Initialized Git repository on `main` branch and committed all project files, case study README, and journal entries.

---

## 📋 Decisions Summary & Architecture Rationale

| Feature / Aspect | Decision Made | Key Rationale |
|---|---|---|
| **Data Engine** | Google Sheets API + Fallback Mock | Zero data migration required for small business owners. |
| **Server Runtime** | Node.js + Express + `node-cron` | Lightweight single-process (~50MB RAM) for low-cost/free hosting. |
| **State Storage** | File-backed JSON (`data/alert_store.json`) | Persistent cooldown tracking across restarts without paid DB fees. |
| **Gateway Strategy** | Provider Factory (Termii & Africa's Talking) | Easy provider switching for Nigerian & African SMS/WhatsApp. |
| **Anti-Spam Rules** | Initial trigger -> 24h Cooldown -> Restock reset | Eliminates SMS notification spam and saves messaging credits. |
| **Dashboard UI** | Vanilla HTML/CSS Glassmorphism | Fast loading, no build tool overhead, state-of-the-art visual aesthetic. |
