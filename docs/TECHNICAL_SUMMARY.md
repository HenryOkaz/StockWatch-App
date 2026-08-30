# StockWatch - Non-Technical Executive Summary

## Overview & Executive Summary

**StockWatch** is a lightweight, automated inventory watcher designed specifically for retail and service stores tracking stock in Google Sheets. It eliminates manual checking by continuously scanning product stock levels against reorder thresholds and dispatching real-time WhatsApp or SMS alerts to store managers before items run out.

---

## How StockWatch Solves the Stockout Problem

```
+------------------+         +--------------------+         +-----------------------+         +--------------------+
|   Google Sheet   | ------> |  StockWatch Engine | ------> |  Messaging Gateway    | ------> | Store Manager      |
| Single Source of | Reads   |  Checks threshold &| Dispatches| (Termii / Africa's  | Sends   | Phone (WhatsApp /  |
| Truth for Stock  | Stock   |  handles cooldown  | Alert   |  Talking API)         | Alert   | SMS Notification)  |
+------------------+         +--------------------+         +-----------------------+         +--------------------+
         ^                            |
         |                            v
         +----------------------------+
            Updates Reorder Threshold
            from Web Dashboard
```

### Key Business Benefits
1. **Zero Data Migration Required**: Your team continues using Google Sheets as normal. There is no need to switch to an expensive or complicated new inventory platform.
2. **Proactive Real-Time Alerts**: Receive immediate SMS or WhatsApp notifications containing the **Product Name**, **Current Stock**, **Threshold**, and **Supplier Contact** so reorder calls can be placed instantly.
3. **No Alert Spam (Smart Cooldown)**: StockWatch flags low stock once when it happens. If stock remains low, it will not spam your phone every hour — it sends a single reminder every 24 hours until restocked, and automatically resets when new stock arrives.
4. **Interactive Dashboard**: Accessible on desktop and mobile browsers to view low-stock items at a glance, trigger instant inventory refreshes, or edit reorder thresholds directly.

---

## Core Safety & Reliability Features

- **Deduplication & Cooldown Tracking**: Keeps a small persistent memory file on your server (`alert_store.json`). Even if the system restarts, it remembers which items were already alerted so you never receive duplicate notifications.
- **Fail-Safe Messaging**: If the SMS gateway encounters a network hiccup, StockWatch logs the event and retries on the next cycle rather than crashing.
- **Bi-directional Google Sheet Sync**: When you adjust a product's reorder threshold on the web dashboard, StockWatch writes the updated value back to the corresponding cell in your Google Sheet automatically.

---

## Technical Stack & Cost Efficiency

| Component | Selected Technology | Why It Was Chosen | Cost to Business |
|---|---|---|---|
| **Server Engine** | Node.js + Express | Lightweight, lightning fast (~50MB RAM), runs background checks automatically. | **Free** (Runs on local PC or free-tier hosting like Render/Railway) |
| **Data Storage** | Google Sheets API + File Store | No external paid database required; Sheet is single source of truth. | **Free** (Standard Google Cloud API free tier) |
| **Messaging** | Termii / Africa's Talking Gateway | Highly reliable delivery to Nigerian and African mobile numbers (+ WhatsApp option). | Pay-per-SMS (typically ~₦2.5 - ₦4 per SMS) |
| **Dashboard** | Vanilla HTML5 / Glassmorphism CSS | Zero complex frontend frameworks; ultra-fast load time on mobile devices. | **Free** |

---

## Maintenance & Operating Best Practices

1. **Keep Phone Numbers Updated**: Ensure the target recipient numbers in `.env` or configuration are updated whenever manager responsibilities change.
2. **Maintain Google Sheet Format**: Avoid deleting the header row or renaming core columns (`Product Name`, `Current Quantity`, `SKU`).
3. **Low-Cost Infrastructure**: StockWatch is built to run 24/7 on minimal hardware. You can deploy it to a free hosting tier (e.g., Render.com, Fly.io, or Railway.app) or run it on an in-store desktop/laptop connected to the internet.
