/**
 * Mock Google Sheets Data & Actions
 * Provides realistic sample inventory for testing and demonstration.
 */

let mockInventory = [
  {
    sku: 'SKU-1001',
    productName: 'A4 Copier Paper (500 Sheets)',
    category: 'Office Supplies',
    currentQuantity: 4,
    reorderThreshold: 15,
    unit: 'reams',
    supplierName: 'PaperDirect Ltd',
    supplierContact: '+2348031112233',
    rowIndex: 2
  },
  {
    sku: 'SKU-1002',
    productName: 'HP Laserjet Toner Cartridge Black',
    category: 'Printing & Tech',
    currentQuantity: 2,
    reorderThreshold: 5,
    unit: 'units',
    supplierName: 'TechSupply Hub',
    supplierContact: '+2348094445566',
    rowIndex: 3
  },
  {
    sku: 'SKU-1003',
    productName: 'Arabica Dark Roast Coffee Beans 1kg',
    category: 'Pantry & Service',
    currentQuantity: 3,
    reorderThreshold: 8,
    unit: 'bags',
    supplierName: 'BrewMasters Wholesale',
    supplierContact: '+2348127778899',
    rowIndex: 4
  },
  {
    sku: 'SKU-1004',
    productName: 'Hand Sanitizer Gel 500ml',
    category: 'Cleaning & Hygiene',
    currentQuantity: 18,
    reorderThreshold: 10,
    unit: 'bottles',
    supplierName: 'CleanCare Products',
    supplierContact: '+2348023334455',
    rowIndex: 5
  },
  {
    sku: 'SKU-1005',
    productName: 'Cat6 Ethernet Cable 10m',
    category: 'Printing & Tech',
    currentQuantity: 1,
    reorderThreshold: 6,
    unit: 'pcs',
    supplierName: 'TechSupply Hub',
    supplierContact: '+2348094445566',
    rowIndex: 6
  },
  {
    sku: 'SKU-1006',
    productName: 'Disinfectant Surface Spray 750ml',
    category: 'Cleaning & Hygiene',
    currentQuantity: 12,
    reorderThreshold: 10,
    unit: 'bottles',
    supplierName: 'CleanCare Products',
    supplierContact: '+2348023334455',
    rowIndex: 7
  },
  {
    sku: 'SKU-1007',
    productName: 'Thermal Receipt Rolls (57mm x 40mm)',
    category: 'Office Supplies',
    currentQuantity: 8,
    reorderThreshold: 20,
    unit: 'rolls',
    supplierName: 'PaperDirect Ltd',
    supplierContact: '+2348031112233',
    rowIndex: 8
  },
  {
    sku: 'SKU-1008',
    productName: 'AA Rechargeable Batteries (4-Pack)',
    category: 'Printing & Tech',
    currentQuantity: 15,
    reorderThreshold: 5,
    unit: 'packs',
    supplierName: 'TechSupply Hub',
    supplierContact: '+2348094445566',
    rowIndex: 9
  },
  {
    sku: 'SKU-1009',
    productName: 'Microfiber Cleaning Cloths (10-Pack)',
    category: 'Cleaning & Hygiene',
    currentQuantity: 5,
    reorderThreshold: 5,
    unit: 'packs',
    supplierName: 'CleanCare Products',
    supplierContact: '+2348023334455',
    rowIndex: 10
  },
  {
    sku: 'SKU-1010',
    productName: 'Heavy Duty Packaging Tape 50m',
    category: 'Office Supplies',
    currentQuantity: 0,
    reorderThreshold: 10,
    unit: 'rolls',
    supplierName: 'PaperDirect Ltd',
    supplierContact: '+2348031112233',
    rowIndex: 11
  }
];

export async function fetchMockInventory() {
  console.log('[MockSheets] Returning simulated inventory data (' + mockInventory.length + ' items)');
  // Clone to avoid accidental external mutation
  return JSON.parse(JSON.stringify(mockInventory));
}

export async function updateMockThreshold(sku, newThreshold) {
  const item = mockInventory.find(i => i.sku.toLowerCase() === sku.toLowerCase());
  if (!item) {
    throw new Error(`Product with SKU "${sku}" not found in mock inventory.`);
  }
  item.reorderThreshold = Number(newThreshold);
  console.log(`[MockSheets] Updated SKU ${sku} threshold to ${newThreshold}`);
  return { success: true, sku, newThreshold };
}

export async function updateMockQuantity(sku, newQuantity) {
  const item = mockInventory.find(i => i.sku.toLowerCase() === sku.toLowerCase());
  if (!item) {
    throw new Error(`Product with SKU "${sku}" not found in mock inventory.`);
  }
  item.currentQuantity = Number(newQuantity);
  console.log(`[MockSheets] Updated SKU ${sku} current quantity to ${newQuantity}`);
  return { success: true, sku, newQuantity };
}
