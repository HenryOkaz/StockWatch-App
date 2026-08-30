import { config } from '../config.js';
import { fetchInventory } from './sheetsService.js';
import { stateStore } from './stateStore.js';
import { NotificationFactory } from '../providers/notificationFactory.js';

export async function runInventoryCheck(options = { manualTrigger: false }) {
  const now = new Date();
  console.log(`\n--------------------------------------------------`);
  console.log(`[AlertService] Running inventory check (${options.manualTrigger ? 'Manual' : 'Scheduled'}) at ${now.toLocaleString()}...`);

  stateStore.setLastCheckTime(now.toISOString());

  try {
    const inventory = await fetchInventory();
    const provider = NotificationFactory.getProvider();
    
    let lowStockCount = 0;
    let alertsTriggered = 0;
    const checkSummary = [];

    for (const item of inventory) {
      const isLow = item.currentQuantity <= item.reorderThreshold;
      const sku = item.sku;
      const state = stateStore.getProductState(sku) || { lastAlertedAt: null, isLowStock: false };

      if (!isLow) {
        // Product is adequately stocked. If it was previously marked as low, reset state!
        if (state.isLowStock) {
          console.log(`[AlertService] Product ${item.productName} (${sku}) restocked above threshold. Resetting low-stock state.`);
          stateStore.resetProductLowStock(sku);
        }
        continue;
      }

      lowStockCount++;

      // Check deduplication & cooldown rules
      let shouldAlert = false;
      let alertReason = '';

      if (!state.lastAlertedAt || !state.isLowStock) {
        shouldAlert = true;
        alertReason = 'Initial low-stock detection';
      } else {
        const lastAlertTime = new Date(state.lastAlertedAt).getTime();
        const hoursPassed = (now.getTime() - lastAlertTime) / (1000 * 60 * 60);

        if (hoursPassed >= config.cooldownHours) {
          shouldAlert = true;
          alertReason = `Cooldown period of ${config.cooldownHours}h elapsed (${hoursPassed.toFixed(1)}h since last alert)`;
        } else {
          console.log(`[AlertService] Skipping alert for ${item.productName} (${sku}) - Already alerted ${hoursPassed.toFixed(1)}h ago (Cooldown: ${config.cooldownHours}h)`);
        }
      }

      if (shouldAlert) {
        alertsTriggered++;
        const supplierInfo = item.supplierName !== 'N/A'
          ? `Supplier: ${item.supplierName}${item.supplierContact ? ` (${item.supplierContact})` : ''}`
          : 'Supplier: N/A';

        const message = `⚠️ Low Stock Alert: ${item.productName} is at ${item.currentQuantity} ${item.unit} (reorder threshold: ${item.reorderThreshold}). ${supplierInfo}.`;

        console.log(`[AlertService] Triggering alert for ${item.productName} (${sku}). Reason: ${alertReason}`);

        const recipients = config.recipientPhoneNumbers.length > 0 
          ? config.recipientPhoneNumbers 
          : ['+2348000000000'];

        for (const recipient of recipients) {
          const result = await provider.sendAlert({ recipient, message });

          // Update persistent store with alert result
          stateStore.addAlertLog({
            sku: item.sku,
            productName: item.productName,
            quantity: item.currentQuantity,
            threshold: item.reorderThreshold,
            recipient: recipient,
            provider: provider.name,
            message: message,
            status: result.success ? 'SUCCESS' : 'FAILED',
            error: result.error || null
          });

          if (result.success) {
            stateStore.updateProductState(sku, {
              lastAlertedAt: now.toISOString(),
              isLowStock: true,
              lastQuantity: item.currentQuantity
            });
          }
        }

        checkSummary.push({
          product: item.productName,
          sku: item.sku,
          quantity: item.currentQuantity,
          threshold: item.reorderThreshold,
          alertSent: true,
          reason: alertReason
        });
      } else {
        checkSummary.push({
          product: item.productName,
          sku: item.sku,
          quantity: item.currentQuantity,
          threshold: item.reorderThreshold,
          alertSent: false,
          reason: 'Cooldown active'
        });
      }
    }

    console.log(`[AlertService] Check completed. Monitored: ${inventory.length} SKUs, Low stock: ${lowStockCount}, Alerts sent: ${alertsTriggered}`);
    console.log(`--------------------------------------------------\n`);

    return {
      timestamp: now.toISOString(),
      totalMonitored: inventory.length,
      lowStockCount: lowStockCount,
      alertsTriggered: alertsTriggered,
      checkSummary: checkSummary
    };
  } catch (error) {
    console.error('[AlertService Error]', error.message);
    throw error;
  }
}
