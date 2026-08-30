import { google } from 'googleapis';
import fs from 'fs';
import { config } from '../config.js';
import { fetchMockInventory, updateMockThreshold, updateMockQuantity } from './mockSheetsService.js';

let sheetsClient = null;

/**
 * Initialize Google Sheets API auth client
 */
function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    let auth = null;

    // 1. Try key file path if it exists
    if (config.google.keyPath && fs.existsSync(config.google.keyPath)) {
      console.log(`[GoogleSheets] Authenticating using key file at ${config.google.keyPath}`);
      auth = new google.auth.GoogleAuth({
        keyFile: config.google.keyPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } 
    // 2. Try environment variables clientEmail & privateKey
    else if (config.google.clientEmail && config.google.privateKey) {
      console.log(`[GoogleSheets] Authenticating using credentials from environment variables (${config.google.clientEmail})`);
      auth = new google.auth.JWT({
        email: config.google.clientEmail,
        key: config.google.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }

    if (!auth) {
      console.warn('[GoogleSheets] No Service Account credentials found. Falling back to Mock Sheets mode.');
      return null;
    }

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (error) {
    console.error('[GoogleSheets Auth Error]', error.message);
    return null;
  }
}

/**
 * Helper to match column headers flexibly
 */
function findColumnIndex(headers, candidateNames) {
  const normalizedHeaders = headers.map(h => String(h || '').trim().toLowerCase());
  for (const candidate of candidateNames) {
    const idx = normalizedHeaders.findIndex(h => h === candidate.toLowerCase() || h.includes(candidate.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Fetch inventory data from Google Sheets (or fallback to Mock)
 */
export async function fetchInventory() {
  if (config.google.useMock) {
    return fetchMockInventory();
  }

  const client = getSheetsClient();
  if (!client || !config.google.spreadsheetId) {
    console.warn('[GoogleSheets] Real API not configured or unavailable. Returning mock inventory.');
    return fetchMockInventory();
  }

  try {
    const range = `${config.google.sheetName}!A1:Z500`;
    console.log(`[GoogleSheets] Fetching range ${range} from Spreadsheet ID: ${config.google.spreadsheetId}...`);

    const response = await client.spreadsheets.values.get({
      spreadsheetId: config.google.spreadsheetId,
      range: range
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.warn('[GoogleSheets] No data found in spreadsheet.');
      return [];
    }

    const headers = rows[0];

    // Detect column indexes flexibly
    const idxName = findColumnIndex(headers, ['Product Name', 'Product', 'Item Name', 'Title']);
    const idxSku = findColumnIndex(headers, ['SKU/Product ID', 'SKU', 'Product ID', 'Item Code', 'ID']);
    const idxCategory = findColumnIndex(headers, ['Category', 'Department', 'Type']);
    const idxQty = findColumnIndex(headers, ['Current Quantity', 'Quantity', 'Stock Count', 'Stock', 'Qty']);
    const idxThreshold = findColumnIndex(headers, ['Reorder Threshold', 'Reorder Level', 'Min Stock', 'Threshold']);
    const idxUnit = findColumnIndex(headers, ['Unit', 'UOM', 'Measurement']);
    const idxSupplier = findColumnIndex(headers, ['Supplier Name', 'Supplier', 'Vendor']);
    const idxContact = findColumnIndex(headers, ['Supplier Contact', 'Supplier Phone', 'Vendor Contact', 'Contact']);

    const inventory = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const productName = idxName !== -1 ? row[idxName] : row[0];
      if (!productName) continue; // Skip empty rows

      const sku = idxSku !== -1 && row[idxSku] ? String(row[idxSku]).trim() : `SKU-${i}`;
      const category = idxCategory !== -1 ? (row[idxCategory] || 'General') : 'General';
      const rawQty = idxQty !== -1 ? row[idxQty] : row[1];
      const currentQuantity = isNaN(parseFloat(rawQty)) ? 0 : parseFloat(rawQty);

      const rawThreshold = idxThreshold !== -1 ? row[idxThreshold] : null;
      let reorderThreshold = isNaN(parseFloat(rawThreshold)) ? config.defaultReorderThreshold : parseFloat(rawThreshold);

      const unit = idxUnit !== -1 ? (row[idxUnit] || 'units') : 'units';
      const supplierName = idxSupplier !== -1 ? (row[idxSupplier] || 'N/A') : 'N/A';
      const supplierContact = idxContact !== -1 ? (row[idxContact] || '') : '';

      inventory.push({
        sku,
        productName,
        category,
        currentQuantity,
        reorderThreshold,
        unit,
        supplierName,
        supplierContact,
        rowIndex: i + 1, // 1-indexed row number in Google Sheet
        thresholdColIndex: idxThreshold !== -1 ? idxThreshold : null
      });
    }

    console.log(`[GoogleSheets] Successfully loaded ${inventory.length} inventory items.`);
    return inventory;
  } catch (error) {
    console.error('[GoogleSheets Fetch Error]', error.message);
    console.warn('[GoogleSheets] Falling back to mock inventory due to API error.');
    return fetchMockInventory();
  }
}

/**
 * Update the reorder threshold for a product in Google Sheets (or Mock)
 */
export async function updateReorderThreshold(sku, newThreshold) {
  if (config.google.useMock) {
    return updateMockThreshold(sku, newThreshold);
  }

  const client = getSheetsClient();
  if (!client || !config.google.spreadsheetId) {
    return updateMockThreshold(sku, newThreshold);
  }

  try {
    const inventory = await fetchInventory();
    const item = inventory.find(i => i.sku.toLowerCase() === sku.toLowerCase());

    if (!item) {
      throw new Error(`Product with SKU "${sku}" not found.`);
    }

    if (item.thresholdColIndex === null) {
      throw new Error(`"Reorder Threshold" column was not detected in Google Sheet headers.`);
    }

    // Convert column index to A1 notation letter (0 -> A, 1 -> B, ...)
    const colLetter = String.fromCharCode(65 + item.thresholdColIndex);
    const cellRange = `${config.google.sheetName}!${colLetter}${item.rowIndex}`;

    console.log(`[GoogleSheets] Updating cell ${cellRange} to new threshold ${newThreshold}...`);

    await client.spreadsheets.values.update({
      spreadsheetId: config.google.spreadsheetId,
      range: cellRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[Number(newThreshold)]]
      }
    });

    console.log(`[GoogleSheets] Successfully updated SKU ${sku} threshold in Sheet.`);
    return { success: true, sku, newThreshold };
  } catch (error) {
    console.error('[GoogleSheets Threshold Update Error]', error.message);
    // If real API write fails, attempt mock fallback if dev testing
    return updateMockThreshold(sku, newThreshold);
  }
}

/**
 * Update stock quantity (for testing/demo purposes)
 */
export async function updateQuantity(sku, newQuantity) {
  if (config.google.useMock) {
    return updateMockQuantity(sku, newQuantity);
  }

  const client = getSheetsClient();
  if (!client || !config.google.spreadsheetId) {
    return updateMockQuantity(sku, newQuantity);
  }

  // Attempt real update
  try {
    const inventory = await fetchInventory();
    const item = inventory.find(i => i.sku.toLowerCase() === sku.toLowerCase());
    if (!item) throw new Error(`Product with SKU "${sku}" not found.`);

    // Find Qty col
    const range = `${config.google.sheetName}!A1:Z1`;
    const headerRes = await client.spreadsheets.values.get({ spreadsheetId: config.google.spreadsheetId, range });
    const headers = headerRes.data.values?.[0] || [];
    const idxQty = findColumnIndex(headers, ['Current Quantity', 'Quantity', 'Stock Count', 'Stock', 'Qty']);
    
    if (idxQty === -1) throw new Error('Quantity column not found');

    const colLetter = String.fromCharCode(65 + idxQty);
    const cellRange = `${config.google.sheetName}!${colLetter}${item.rowIndex}`;

    await client.spreadsheets.values.update({
      spreadsheetId: config.google.spreadsheetId,
      range: cellRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[Number(newQuantity)]] }
    });

    return { success: true, sku, newQuantity };
  } catch (error) {
    console.error('[GoogleSheets Quantity Update Error]', error.message);
    return updateMockQuantity(sku, newQuantity);
  }
}
