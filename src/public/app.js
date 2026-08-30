let globalInventory = [];
let globalLowStock = [];
let globalAlerts = [];
let selectedSku = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSearch();
  initModals();
  initActions();
  
  // Initial data load
  refreshAllData();

  // Auto refresh every 30 seconds
  setInterval(refreshAllData, 30000);
});

// Toast Utility
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Tab Navigation
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      buttons.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });
}

// Main Data Loader
async function refreshAllData() {
  await Promise.all([
    fetchStatus(),
    fetchInventory(),
    fetchAlertLogs()
  ]);
}

// Fetch System Status & Metrics
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    const statusPillText = document.getElementById('system-status-text');
    statusPillText.textContent = data.mode === 'MOCK_SHEETS' ? 'Active (Demo Mode)' : 'Active (Live Google Sheet)';

    document.getElementById('metric-gateway').textContent = `${data.provider.name} (${data.provider.configuredType})`;
    
    const phoneList = data.provider.recipients.length > 0 
      ? data.provider.recipients.join(', ') 
      : 'No phone numbers configured';
    document.getElementById('metric-gateway-recipients').textContent = `Recipients: ${phoneList}`;

    if (data.storeSummary) {
      document.getElementById('metric-alerts-sent').textContent = data.storeSummary.totalAlertsSent || 0;
      document.getElementById('metric-alerts-footer').textContent = `${data.storeSummary.totalChecks || 0} checks completed`;
    }
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

// Fetch Inventory Items
async function fetchInventory() {
  try {
    const res = await fetch('/api/inventory');
    const data = await res.json();

    if (data.success) {
      globalInventory = data.inventory || [];
      globalLowStock = data.lowStockItems || [];

      // Update Metric Cards & Badges
      document.getElementById('metric-total-skus').textContent = data.totalCount || 0;
      document.getElementById('metric-total-footer').textContent = `Syncing from Sheet`;

      document.getElementById('metric-low-stock').textContent = data.lowStockCount || 0;
      document.getElementById('metric-low-footer').textContent = data.lowStockCount > 0 
        ? `⚠️ ${data.lowStockCount} items below threshold!` 
        : `All items adequately stocked`;

      document.getElementById('badge-low-count').textContent = data.lowStockCount || 0;
      document.getElementById('badge-total-count').textContent = data.totalCount || 0;

      renderLowStockTable(globalLowStock);
      renderAllInventoryTable(globalInventory);
    }
  } catch (err) {
    console.error('Failed to fetch inventory:', err);
    showToast('Failed to connect to backend server', 'error');
  }
}

// Render Low Stock Items Table
function renderLowStockTable(items) {
  const tbody = document.querySelector('#table-low-stock tbody');
  
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-cell">🎉 Great news! No low stock items detected. All inventory is above reorder thresholds.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.productName)}</strong></td>
      <td><code>${escapeHtml(item.sku)}</code></td>
      <td><span class="badge warning-badge">${escapeHtml(item.category)}</span></td>
      <td>
        <span class="danger-text"><strong>${item.currentQuantity}</strong> ${escapeHtml(item.unit)}</span>
      </td>
      <td><strong>${item.reorderThreshold}</strong> ${escapeHtml(item.unit)}</td>
      <td>
        <div><strong>${escapeHtml(item.supplierName)}</strong></div>
        <small class="subtitle">${escapeHtml(item.supplierContact || 'No contact')}</small>
      </td>
      <td>${item.lastAlertedAt ? formatDate(item.lastAlertedAt) : '<span class="badge warning-badge">Pending Alert</span>'}</td>
      <td>
        <button class="btn btn-secondary small-btn btn-edit-item" data-sku="${escapeHtml(item.sku)}">
          ✏️ Edit Threshold
        </button>
      </td>
    </tr>
  `).join('');

  attachTableEventListeners();
}

// Render All Inventory Table
function renderAllInventoryTable(items) {
  const tbody = document.querySelector('#table-all-inventory tbody');
  
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">No inventory data found.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.productName)}</strong></td>
      <td><code>${escapeHtml(item.sku)}</code></td>
      <td>${escapeHtml(item.category)}</td>
      <td>
        <strong class="${item.isLow ? 'danger-text' : ''}">${item.currentQuantity}</strong>
      </td>
      <td><strong>${item.reorderThreshold}</strong></td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(item.supplierName)}</td>
      <td>
        ${item.isLow 
          ? `<span class="badge danger-badge">⚠️ Low Stock</span>` 
          : `<span class="badge success-badge">OK</span>`}
      </td>
      <td>
        <button class="btn btn-secondary small-btn btn-edit-item" data-sku="${escapeHtml(item.sku)}">
          ✏️ Edit
        </button>
      </td>
    </tr>
  `).join('');

  attachTableEventListeners();
}

// Fetch Alert History Logs
async function fetchAlertLogs() {
  try {
    const res = await fetch('/api/alerts?limit=50');
    const data = await res.json();

    if (data.success) {
      globalAlerts = data.alerts || [];
      document.getElementById('badge-alert-count').textContent = globalAlerts.length;
      renderAlertLogsTable(globalAlerts);
    }
  } catch (err) {
    console.error('Failed to fetch alert logs:', err);
  }
}

// Render Alert Logs Table
function renderAlertLogsTable(alerts) {
  const tbody = document.querySelector('#table-alerts-log tbody');

  if (!alerts || alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-cell">No notification alerts dispatched yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = alerts.map(log => `
    <tr>
      <td><small>${formatDate(log.timestamp)}</small></td>
      <td><strong>${escapeHtml(log.productName)}</strong><br><small><code>${escapeHtml(log.sku)}</code></small></td>
      <td>Stock: <strong>${log.quantity}</strong> (Min: ${log.threshold})</td>
      <td><code>${escapeHtml(log.recipient)}</code></td>
      <td>${escapeHtml(log.provider)}</td>
      <td>
        ${log.status === 'SUCCESS' 
          ? `<span class="badge success-badge">Sent</span>` 
          : `<span class="badge danger-badge" title="${escapeHtml(log.error || '')}">Failed</span>`}
      </td>
      <td><small style="max-width:280px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(log.message)}</small></td>
    </tr>
  `).join('');
}

// Action Button Handlers
function initActions() {
  // Check Stock Now Button
  const btnCheck = document.getElementById('btn-check-now');
  btnCheck.addEventListener('click', async () => {
    const spin = btnCheck.querySelector('.spin-icon');
    const norm = btnCheck.querySelector('.normal-icon');
    
    spin.classList.remove('hidden');
    norm.classList.add('hidden');
    btnCheck.disabled = true;

    try {
      const res = await fetch('/api/check-now', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        showToast(`Stock check complete! Monitored: ${data.totalMonitored}, Low stock: ${data.lowStockCount}, Alerts sent: ${data.alertsTriggered}`, 'success');
        refreshAllData();
      } else {
        showToast(`Check failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error running check: ${err.message}`, 'error');
    } finally {
      spin.classList.add('hidden');
      norm.classList.remove('hidden');
      btnCheck.disabled = false;
    }
  });

  // Send Test SMS Button
  document.getElementById('btn-send-test').addEventListener('click', async () => {
    const phone = prompt('Enter recipient phone number for test alert (e.g. +2348012345678):');
    if (!phone) return;

    try {
      showToast('Sending test notification...', 'info');
      const res = await fetch('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: phone })
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Test message sent successfully via ${data.provider} to ${data.recipient}!`, 'success');
        fetchAlertLogs();
      } else {
        showToast(`Test send failed: ${data.result?.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast(`Failed to send test alert: ${err.message}`, 'error');
    }
  });

  // Refresh Logs Button
  document.getElementById('btn-refresh-logs').addEventListener('click', () => {
    fetchAlertLogs();
    showToast('Alert logs refreshed', 'info');
  });
}

// Modal Handlers
function initModals() {
  const modal = document.getElementById('modal-edit-threshold');
  const btnClose = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel-modal');
  const btnSave = document.getElementById('btn-save-threshold');

  const closeModal = () => modal.classList.add('hidden');

  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  btnSave.addEventListener('click', async () => {
    if (!selectedSku) return;

    const newThreshold = parseInt(document.getElementById('input-new-threshold').value, 10);
    const newQty = parseInt(document.getElementById('input-quick-qty').value, 10);

    if (isNaN(newThreshold) || newThreshold < 0) {
      showToast('Please enter a valid positive number for threshold.', 'error');
      return;
    }

    try {
      showToast('Saving threshold change to Google Sheet...', 'info');

      // 1. Update threshold
      const resT = await fetch('/api/update-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: selectedSku, newThreshold })
      });
      const dataT = await resT.json();

      // 2. Optionally update current quantity for quick demo testing
      if (!isNaN(newQty)) {
        await fetch('/api/update-quantity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku: selectedSku, newQuantity: newQty })
        });
      }

      if (dataT.success) {
        showToast(`Reorder threshold updated for ${selectedSku}!`, 'success');
        closeModal();
        refreshAllData();
      } else {
        showToast(`Failed to update threshold: ${dataT.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error updating threshold: ${err.message}`, 'error');
    }
  });
}

// Attach event handlers to dynamic edit buttons
function attachTableEventListeners() {
  document.querySelectorAll('.btn-edit-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const sku = btn.dataset.sku;
      const item = globalInventory.find(i => i.sku === sku);

      if (item) {
        selectedSku = sku;
        document.getElementById('modal-product-name').textContent = item.productName;
        document.getElementById('modal-product-sku').textContent = item.sku;
        document.getElementById('input-new-threshold').value = item.reorderThreshold;
        document.getElementById('input-quick-qty').value = item.currentQuantity;
        
        document.getElementById('modal-edit-threshold').classList.remove('hidden');
      }
    });
  });
}

// Search / Filtering
function initSearch() {
  const searchLow = document.getElementById('search-low-stock');
  searchLow.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = globalLowStock.filter(i => 
      i.productName.toLowerCase().includes(query) || 
      i.sku.toLowerCase().includes(query) ||
      i.category.toLowerCase().includes(query)
    );
    renderLowStockTable(filtered);
  });

  const searchAll = document.getElementById('search-all-inventory');
  searchAll.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = globalInventory.filter(i => 
      i.productName.toLowerCase().includes(query) || 
      i.sku.toLowerCase().includes(query) ||
      i.category.toLowerCase().includes(query) ||
      i.supplierName.toLowerCase().includes(query)
    );
    renderAllInventoryTable(filtered);
  });
}

// Format Date Utility
function formatDate(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
