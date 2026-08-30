import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

class StateStore {
  constructor() {
    this.filePath = config.stateFilePath;
    this.data = {
      productAlertState: {}, // key: sku -> { lastAlertedAt: number, isLowStock: boolean, lastQuantity: number }
      alertsLog: [],         // array of alert history objects
      lastCheckTime: null,
      stats: {
        totalChecks: 0,
        totalAlertsSent: 0,
        failedAlerts: 0
      }
    };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(config.dataDir)) {
        fs.mkdirSync(config.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        this.data = { ...this.data, ...JSON.parse(fileContent) };
      } else {
        this.save();
      }
    } catch (error) {
      console.error('[StateStore] Error initializing state store:', error.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[StateStore] Error saving state store:', error.message);
    }
  }

  // Get state for a specific SKU
  getProductState(sku) {
    return this.data.productAlertState[sku] || null;
  }

  // Update or record state for a SKU
  updateProductState(sku, updates) {
    const existing = this.data.productAlertState[sku] || {
      lastAlertedAt: null,
      isLowStock: false,
      lastQuantity: null
    };

    this.data.productAlertState[sku] = { ...existing, ...updates };
    this.save();
  }

  // Reset low stock state when an item is restocked above threshold
  resetProductLowStock(sku) {
    if (this.data.productAlertState[sku]) {
      this.data.productAlertState[sku].isLowStock = false;
      this.data.productAlertState[sku].lastAlertedAt = null;
      this.save();
    }
  }

  // Log an alert dispatch entry
  addAlertLog(entry) {
    const logItem = {
      id: 'ALT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      sku: entry.sku,
      productName: entry.productName,
      quantity: entry.quantity,
      threshold: entry.threshold,
      recipient: entry.recipient,
      provider: entry.provider,
      message: entry.message,
      status: entry.status, // 'SUCCESS' | 'FAILED'
      error: entry.error || null
    };

    this.data.alertsLog.unshift(logItem);
    // Keep last 200 logs
    if (this.data.alertsLog.length > 200) {
      this.data.alertsLog = this.data.alertsLog.slice(0, 200);
    }

    if (entry.status === 'SUCCESS') {
      this.data.stats.totalAlertsSent = (this.data.stats.totalAlertsSent || 0) + 1;
    } else {
      this.data.stats.failedAlerts = (this.data.stats.failedAlerts || 0) + 1;
    }

    this.save();
    return logItem;
  }

  getAlertsLog(limit = 50) {
    return this.data.alertsLog.slice(0, limit);
  }

  setLastCheckTime(timeISO = new Date().toISOString()) {
    this.data.lastCheckTime = timeISO;
    this.data.stats.totalChecks = (this.data.stats.totalChecks || 0) + 1;
    this.save();
  }

  getSummary() {
    return {
      lastCheckTime: this.data.lastCheckTime,
      totalChecks: this.data.stats.totalChecks || 0,
      totalAlertsSent: this.data.stats.totalAlertsSent || 0,
      failedAlerts: this.data.stats.failedAlerts || 0,
      monitoredProductsState: Object.keys(this.data.productAlertState).length
    };
  }
}

export const stateStore = new StateStore();
