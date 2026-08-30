import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { startScheduler, getSchedulerStatus } from './scheduler.js';
import { fetchInventory, updateReorderThreshold, updateQuantity } from './services/sheetsService.js';
import { runInventoryCheck } from './services/alertService.js';
import { stateStore } from './services/stateStore.js';
import { NotificationFactory } from './providers/notificationFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. System Health & Gateway Status
app.get('/api/status', (req, res) => {
  const provider = NotificationFactory.getProvider();
  const summary = stateStore.getSummary();
  const schedulerInfo = getSchedulerStatus();

  res.json({
    appName: 'StockWatch',
    status: 'ACTIVE',
    mode: config.google.useMock ? 'MOCK_SHEETS' : 'LIVE_GOOGLE_SHEETS',
    provider: {
      name: provider.name,
      configuredType: config.messaging.provider,
      recipients: config.recipientPhoneNumbers
    },
    googleConfig: {
      spreadsheetIdConfigured: Boolean(config.google.spreadsheetId),
      sheetName: config.google.sheetName,
      useMock: config.google.useMock
    },
    scheduler: schedulerInfo,
    storeSummary: summary,
    serverTime: new Date().toISOString()
  });
});

// 2. Fetch Full Inventory & Low Stock Items
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await fetchInventory();
    const lowStockItems = inventory.filter(item => item.currentQuantity <= item.reorderThreshold);

    // Merge persistent alert state info into response
    const enrichedInventory = inventory.map(item => {
      const pState = stateStore.getProductState(item.sku);
      return {
        ...item,
        isLow: item.currentQuantity <= item.reorderThreshold,
        lastAlertedAt: pState ? pState.lastAlertedAt : null,
        isLowStockRecorded: pState ? pState.isLowStock : false
      };
    });

    res.json({
      success: true,
      totalCount: inventory.length,
      lowStockCount: lowStockItems.length,
      inventory: enrichedInventory,
      lowStockItems: enrichedInventory.filter(i => i.isLow)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Manual Check Trigger
app.post('/api/check-now', async (req, res) => {
  try {
    const result = await runInventoryCheck({ manualTrigger: true });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Update Reorder Threshold (Writes back to Google Sheet)
app.post('/api/update-threshold', async (req, res) => {
  try {
    const { sku, newThreshold } = req.body;
    if (!sku || newThreshold === undefined || isNaN(Number(newThreshold))) {
      return res.status(400).json({ success: false, error: 'Valid "sku" and numeric "newThreshold" are required.' });
    }

    const result = await updateReorderThreshold(sku, Number(newThreshold));
    res.json({ success: true, message: `Threshold updated to ${newThreshold} for ${sku}`, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Update Stock Quantity (Demo / Testing Helper)
app.post('/api/update-quantity', async (req, res) => {
  try {
    const { sku, newQuantity } = req.body;
    if (!sku || newQuantity === undefined || isNaN(Number(newQuantity))) {
      return res.status(400).json({ success: false, error: 'Valid "sku" and numeric "newQuantity" are required.' });
    }

    const result = await updateQuantity(sku, Number(newQuantity));
    res.json({ success: true, message: `Quantity updated to ${newQuantity} for ${sku}`, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Alert Logs History
app.get('/api/alerts', (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  const logs = stateStore.getAlertsLog(limit);
  res.json({ success: true, count: logs.length, alerts: logs });
});

// 7. Send Test Notification
app.post('/api/send-test', async (req, res) => {
  try {
    const recipient = req.body.recipient || (config.recipientPhoneNumbers[0] || '+2348000000000');
    const provider = NotificationFactory.getProvider();

    const result = await provider.sendTestNotification(recipient);

    stateStore.addAlertLog({
      sku: 'TEST-SKU',
      productName: 'Test Notification',
      quantity: 0,
      threshold: 0,
      recipient: recipient,
      provider: provider.name,
      message: `🔔 Test message dispatched via ${provider.name}`,
      status: result.success ? 'SUCCESS' : 'FAILED',
      error: result.error || null
    });

    res.json({
      success: result.success,
      provider: provider.name,
      recipient,
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Sample CSV Sheet Template Download
app.get('/api/sample-sheet', (req, res) => {
  const csvContent = `Product Name,SKU/Product ID,Category,Current Quantity,Reorder Threshold,Unit,Supplier Name,Supplier Contact
A4 Copier Paper (500 Sheets),SKU-1001,Office Supplies,4,15,reams,PaperDirect Ltd,+2348031112233
HP Laserjet Toner Cartridge Black,SKU-1002,Printing & Tech,2,5,units,TechSupply Hub,+2348094445566
Arabica Dark Roast Coffee Beans 1kg,SKU-1003,Pantry & Service,3,8,bags,BrewMasters Wholesale,+2348127778899
Hand Sanitizer Gel 500ml,SKU-1004,Cleaning & Hygiene,18,10,bottles,CleanCare Products,+2348023334455
Cat6 Ethernet Cable 10m,SKU-1005,Printing & Tech,1,6,pcs,TechSupply Hub,+2348094445566
Heavy Duty Packaging Tape 50m,SKU-1010,Office Supplies,0,10,rolls,PaperDirect Ltd,+2348031112233`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="StockWatch_Sample_Inventory.csv"');
  res.status(200).send(csvContent);
});

// Serve frontend for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 StockWatch App is running at http://localhost:${PORT}`);
  console.log(`📊 Mode: ${config.google.useMock ? 'Mock Inventory (Demo Mode)' : 'Google Sheets API'}`);
  console.log(`📲 Messaging Gateway: ${config.messaging.provider}`);
  console.log(`==================================================\n`);

  // Start background monitoring scheduler
  startScheduler();
});
