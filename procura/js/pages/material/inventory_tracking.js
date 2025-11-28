// js/pages/material/inventory_tracking.js

import { showToast } from './overview.js';

let currentProjectId = null;

/** Initialize Inventory Tracking feature */
export async function initInventoryTracking(projectId) {
    currentProjectId = projectId;
    
    // Load inventory data and reorder alerts
    await Promise.all([
        loadInventoryData(),
        loadReorderAlerts()
    ]);
    
    console.log('✅ Inventory Tracking initialized');
}

/** Load inventory data */
async function loadInventoryData() {
    const tbody = document.querySelector('#inventory-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8" class="muted">Loading inventory...</td></tr>';
    
    try {
        const response = await fetch(`/api/project/${currentProjectId}/inventory`);
        const data = await response.json();
        
        if (data.success && data.inventory) {
            renderInventoryTable(data.inventory);
            updateInventorySummary(data.inventory);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="muted">No inventory data found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="color: red;">Error loading inventory data</td></tr>';
    }
}

/** Render inventory table */
function renderInventoryTable(inventory) {
    const tbody = document.querySelector('#inventory-table tbody');
    if (!tbody) return;
    
    if (inventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="muted">No inventory data</td></tr>';
        return;
    }
    
    tbody.innerHTML = inventory.map(item => {
        const totalOrdered = parseFloat(item.total_ordered) || 0;
        const totalReceived = parseFloat(item.total_received) || 0;
        const remaining = parseFloat(item.remaining) || 0;
        
        // Calculate stock status
        let stockStatus = '';
        let stockColor = '';
        
        if (remaining <= 0) {
            stockStatus = 'Fully Received';
            stockColor = '#4CAF50';
        } else if (totalReceived === 0) {
            stockStatus = 'Not Started';
            stockColor = '#9E9E9E';
        } else if (remaining > totalOrdered * 0.5) {
            stockStatus = 'Low Progress';
            stockColor = '#f44336';
        } else {
            stockStatus = 'In Progress';
            stockColor = '#FF9800';
        }
        
        return `
            <tr>
                <td><strong>${item.material_name}</strong></td>
                <td>${item.vendor || '-'}</td>
                <td>${totalOrdered.toFixed(2)}</td>
                <td>${totalReceived.toFixed(2)}</td>
                <td><strong>${remaining.toFixed(2)}</strong></td>
                <td>${item.unit || '-'}</td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; background: ${stockColor}; color: white; font-size: 0.85em;">
                        ${stockStatus}
                    </span>
                </td>
                <td>
                    <button class="btn-sm" onclick="window.updateInventory('${item.material_name}', '${item.vendor}')">
                        Update
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/** Update inventory summary cards */
function updateInventorySummary(inventory) {
    const totalEl = document.getElementById('inventory-total');
    const lowStockEl = document.getElementById('inventory-low-stock');
    const outStockEl = document.getElementById('inventory-out-stock');
    
    if (!totalEl || !lowStockEl || !outStockEl) return;
    
    const total = inventory.length;
    let lowStock = 0;
    let outStock = 0;
    
    inventory.forEach(item => {
        const totalOrdered = parseFloat(item.total_ordered) || 0;
        const totalReceived = parseFloat(item.total_received) || 0;
        const remaining = parseFloat(item.remaining) || 0;
        
        if (totalReceived === 0 && totalOrdered > 0) {
            outStock++;
        } else if (remaining > totalOrdered * 0.7) {
            lowStock++;
        }
    });
    
    totalEl.textContent = total;
    lowStockEl.textContent = lowStock;
    outStockEl.textContent = outStock;
}

/** Load reorder alerts */
async function loadReorderAlerts() {
    const alertSection = document.getElementById('reorder-alerts-section');
    const alertList = document.getElementById('reorder-alerts-list');
    
    if (!alertSection || !alertList) return;
    
    try {
        const response = await fetch(`/api/project/${currentProjectId}/reorder-alerts`);
        const data = await response.json();
        
        if (data.success && data.alerts && data.alerts.length > 0) {
            alertSection.style.display = 'block';
            
            alertList.innerHTML = data.alerts.map(alert => {
                const shortage = parseFloat(alert.shortage) || 0;
                const percentShort = (shortage / parseFloat(alert.total_needed)) * 100;
                
                return `
                    <div style="padding: 10px 0; border-bottom: 1px solid #ffcdd2;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${alert.material_name}</strong>
                                <br>
                                <small class="muted">Vendor: ${alert.vendor || 'Unknown'}</small>
                            </div>
                            <div style="text-align: right;">
                                <strong style="color: #d32f2f; font-size: 1.1em;">
                                    ${shortage.toFixed(2)} ${alert.unit || 'units'} short
                                </strong>
                                <br>
                                <small class="muted">${percentShort.toFixed(0)}% remaining</small>
                            </div>
                        </div>
                        <button class="btn-sm" style="margin-top: 8px;" 
                                onclick="window.placeReorder('${alert.material_name}', '${alert.vendor}', ${shortage})">
                            Place Reorder
                        </button>
                    </div>
                `;
            }).join('');
        } else {
            alertSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading reorder alerts:', error);
    }
}

/** Update inventory (called from table button) */
window.updateInventory = function(materialName, vendor) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Update Inventory</h3>
                <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="stack">
                    <p><strong>Material:</strong> ${materialName}</p>
                    <p><strong>Vendor:</strong> ${vendor || 'Unknown'}</p>
                </div>
                <div class="stack">
                    <label>Material ID</label>
                    <input type="number" id="update-material-id" placeholder="Enter material ID" required />
                    <small class="muted">Find material ID in Materials Management tab</small>
                </div>
                <div class="stack">
                    <label>Quantity Received</label>
                    <input type="number" id="update-quantity" min="0" step="0.01" placeholder="0" required />
                </div>
                <div class="stack">
                    <label>Received Date</label>
                    <input type="date" id="update-received-date" required />
                </div>
                <div class="stack">
                    <label>Notes</label>
                    <textarea id="update-notes" rows="3" placeholder="Delivery notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" id="save-inventory-update-btn">Save Update</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Save button handler
    document.getElementById('save-inventory-update-btn').addEventListener('click', async () => {
        const materialId = document.getElementById('update-material-id').value;
        const quantity = document.getElementById('update-quantity').value;
        const receivedDate = document.getElementById('update-received-date').value;
        const notes = document.getElementById('update-notes').value;
        
        if (!materialId || !quantity || !receivedDate) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            const response = await fetch(`/api/materials/${materialId}/inventory-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity_received: parseFloat(quantity),
                    received_date: receivedDate,
                    notes: notes
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Inventory updated successfully!', 'success');
                dialog.remove();
                
                // Reload data
                await loadInventoryData();
                await loadReorderAlerts();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            alert('Network error');
        }
    });
};

/** Place reorder (called from alert button) */
window.placeReorder = function(materialName, vendor, quantity) {
    const confirmed = confirm(
        `Place reorder for:\n\n` +
        `Material: ${materialName}\n` +
        `Vendor: ${vendor}\n` +
        `Quantity: ${quantity.toFixed(2)}\n\n` +
        `This will create a notification for the vendor.`
    );
    
    if (confirmed) {
        // In production, this would create an order request
        showToast(`Reorder request sent to ${vendor}`, 'success');
        
        // You could integrate with vendor management here
        // or create a pending order in the database
    }
};