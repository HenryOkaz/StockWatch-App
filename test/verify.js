import { fetchInventory, updateReorderThreshold, updateQuantity } from '../src/services/sheetsService.js';
import { runInventoryCheck } from '../src/services/alertService.js';
import { stateStore } from '../src/services/stateStore.js';
import { NotificationFactory } from '../src/providers/notificationFactory.js';
import { config } from '../src/config.js';

async function runVerificationTests() {
  console.log('==================================================');
  console.log('🧪 Starting StockWatch Automated Verification Tests');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Fetch Inventory
    console.log('--- Test Group 1: Inventory Service ---');
    const inventory = await fetchInventory();
    assert(Array.isArray(inventory) && inventory.length > 0, 'fetchInventory returns array of items');
    assert(inventory[0].sku && inventory[0].productName, 'First item has valid SKU and Product Name');
    assert(typeof inventory[0].currentQuantity === 'number', 'Current quantity is a valid number');
    assert(typeof inventory[0].reorderThreshold === 'number', 'Reorder threshold is a valid number');

    // Test 2: Notification Factory & Mock Provider
    console.log('\n--- Test Group 2: Notification Providers ---');
    const provider = NotificationFactory.getProvider('MOCK');
    assert(provider && provider.name.includes('Mock'), 'Factory returns MockProvider correctly');

    const testSend = await provider.sendAlert({
      recipient: '+2348012345678',
      message: '⚠️ Low Stock Verification Test Alert'
    });
    assert(testSend.success === true && testSend.messageId, 'Mock provider sends alert successfully');

    // Test 3: Alert Service Logic & Deduplication
    console.log('\n--- Test Group 3: Monitoring & Cooldown Engine ---');
    
    // Set a known SKU to low stock quantity
    const targetItem = inventory[0];
    await updateQuantity(targetItem.sku, 1);
    await updateReorderThreshold(targetItem.sku, 10);

    // Initial check -> should trigger alert
    const check1 = await runInventoryCheck({ manualTrigger: true });
    assert(check1.lowStockCount > 0, 'Inventory check detects low stock items');
    assert(check1.alertsTriggered > 0, 'First check triggers low stock alert');

    // Second check immediately after -> should skip alert due to active cooldown
    const check2 = await runInventoryCheck({ manualTrigger: true });
    const targetInCheck2 = check2.checkSummary.find(s => s.sku === targetItem.sku);
    assert(targetInCheck2 && targetInCheck2.alertSent === false, 'Second check skips re-alerting due to active cooldown');

    // Restock item above threshold -> should reset low-stock state
    await updateQuantity(targetItem.sku, 25);
    await runInventoryCheck({ manualTrigger: true });
    const itemStateAfterRestock = stateStore.getProductState(targetItem.sku);
    assert(itemStateAfterRestock.isLowStock === false, 'Restocking item resets isLowStock state');

    // Drop item low again -> should trigger new alert!
    await updateQuantity(targetItem.sku, 2);
    const check4 = await runInventoryCheck({ manualTrigger: true });
    const targetInCheck4 = check4.checkSummary.find(s => s.sku === targetItem.sku);
    assert(targetInCheck4 && targetInCheck4.alertSent === true, 'Dropping low after restock triggers a new alert event');

    // Test 4: Persistent State Logs
    console.log('\n--- Test Group 4: Alert History Logs ---');
    const logs = stateStore.getAlertsLog(10);
    assert(Array.isArray(logs) && logs.length > 0, 'Alerts log records dispatched notifications');
    assert(logs[0].sku && logs[0].timestamp, 'Log entries have timestamp and SKU metadata');

  } catch (error) {
    console.error('Fatal error during testing:', error);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerificationTests();
