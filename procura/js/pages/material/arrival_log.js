// js/pages/material/arrival_log.js

import { showToast } from './overview.js';

let currentProjectId = null;

/** Initialize Arrival Log feature */
export async function initArrivalLog(projectId) {
    currentProjectId = projectId;
    
    await Promise.all([
        loadArrivalLogs(),
        loadDelayedShipments()
    ]);
    
    setupArrivalLogListeners();
    console.log('✅ Arrival Log initialized');
}

/** Load all arrival logs for the project */
async function loadArrivalLogs() {
    const tbody = document.querySelector('#arrival-log-table tbody');
    if (!tbody) return;
    
    try {
        const response = await fetch(`/api/project/${currentProjectId}/arrival-logs`);
        const data = await response.json();
        
        if (data.success && data.logs) {
            renderArrivalLogsTable(data.logs);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="muted">No arrival logs found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading arrival logs:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="color: red;">Error loading data</td></tr>';
    }
}

/** Render arrival logs table */
function renderArrivalLogsTable(logs) {
    const tbody = document.querySelector('#arrival-log-table tbody');
    if (!tbody) return;
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="muted">No arrival logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        const expectedDate = new Date(log.expected_date);
        const actualDate = log.actual_date ? new Date(log.actual_date) : null;
        const today = new Date();
        
        let daysDelayed = 0;
        if (log.delivery_status !== 'delivered') {
            daysDelayed = Math.floor((today - expectedDate) / (1000 * 60 * 60 * 24));
        }
        
        const statusColors = {
            'pending': 'background: #fff3cd; color: #856404;',
            'in_transit': 'background: #cfe2ff; color: #084298;',
            'delivered': 'background: #d1e7dd; color: #0f5132;',
            'delayed': 'background: #f8d7da; color: #842029;'
        };
        
        const statusStyle = statusColors[log.delivery_status] || '';
        
        return `
            <tr>
                <td><strong>${log.material_name}</strong></td>
                <td>${log.vendor || '-'}</td>
                <td>${expectedDate.toLocaleDateString()}</td>
                <td>${actualDate ? actualDate.toLocaleDateString() : '-'}</td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em; ${statusStyle}">
                        ${log.delivery_status.toUpperCase()}
                    </span>
                </td>
                <td>${daysDelayed > 0 ? `<strong style="color: #d32f2f;">${daysDelayed} days</strong>` : '-'}</td>
                <td>
                    <button class="btn-sm" onclick="window.updateArrivalLog(${log.id})">Update</button>
                </td>
            </tr>
        `;
    }).join('');
}

/** Load and display delayed shipments alert */
async function loadDelayedShipments() {
    const alertBox = document.getElementById('delayed-alert');
    const delayedList = document.getElementById('delayed-list');
    
    if (!alertBox || !delayedList) return;
    
    try {
        const response = await fetch(`/api/project/${currentProjectId}/delayed-shipments`);
        const data = await response.json();
        
        if (data.success && data.delayed && data.delayed.length > 0) {
            alertBox.style.display = 'block';
            
            delayedList.innerHTML = data.delayed.map(item => `
                <div style="padding: 8px 0; border-bottom: 1px solid #f5c6cb;">
                    <strong>${item.material_name}</strong> from ${item.vendor || 'Unknown'} 
                    - <span style="color: #d32f2f; font-weight: bold;">${item.days_delayed} days late</span>
                    <br>
                    <small class="muted">Expected: ${new Date(item.expected_date).toLocaleDateString()}</small>
                </div>
            `).join('');
        } else {
            alertBox.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading delayed shipments:', error);
    }
}

/** Setup event listeners */
function setupArrivalLogListeners() {
    const addBtn = document.getElementById('add-arrival-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddArrivalDialog);
    }
    
    const statusFilter = document.getElementById('arrival-status-filter');
    const dateFrom = document.getElementById('arrival-date-from');
    const dateTo = document.getElementById('arrival-date-to');
    
    [statusFilter, dateFrom, dateTo].forEach(el => {
        if (el) el.addEventListener('change', applyArrivalFilters);
    });
}

/** Show dialog to add new arrival log - FIXED with material dropdown */
async function showAddArrivalDialog() {
    // First, fetch available materials
    let materialsHTML = '<option value="">Loading materials...</option>';
    
    try {
        const response = await fetch(`/api/project/${currentProjectId}/materials-for-delivery`);
        const data = await response.json();
        
        if (data.success && data.materials) {
            if (data.materials.length === 0) {
                materialsHTML = '<option value="">No materials found in this project</option>';
            } else {
                materialsHTML = '<option value="">-- Select Material --</option>' +
                    data.materials.map(m => 
                        `<option value="${m.id}">${m.label}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading materials:', error);
        materialsHTML = '<option value="">Error loading materials</option>';
    }
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Add Delivery Schedule</h3>
                <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Material *</label>
                    <select id="new-arrival-material-id" class="form-control" required>
                        ${materialsHTML}
                    </select>
                </div>
                <div class="form-group">
                    <label>Expected Delivery Date *</label>
                    <input type="date" id="new-arrival-expected-date" class="form-control" required />
                </div>
                <div class="form-group">
                    <label>Delivery Status</label>
                    <select id="new-arrival-status" class="form-control">
                        <option value="pending">Pending</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Actual Delivery Date (Optional)</label>
                    <input type="date" id="new-arrival-actual-date" class="form-control" />
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="new-arrival-notes" class="form-control" rows="3" placeholder="Additional notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" id="save-arrival-btn">Save Delivery</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    document.getElementById('save-arrival-btn').addEventListener('click', async () => {
        const materialId = document.getElementById('new-arrival-material-id').value;
        const expectedDate = document.getElementById('new-arrival-expected-date').value;
        const actualDate = document.getElementById('new-arrival-actual-date').value;
        const status = document.getElementById('new-arrival-status').value;
        const notes = document.getElementById('new-arrival-notes').value;
        
        if (!materialId || !expectedDate) {
            alert('Please select a material and enter expected delivery date');
            return;
        }
        
        try {
            const response = await fetch(`/api/materials/${materialId}/arrival-log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expected_date: expectedDate,
                    actual_date: actualDate || null,
                    delivery_status: status,
                    notes: notes
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Delivery schedule added successfully!', 'success');
                dialog.remove();
                loadArrivalLogs();
                loadDelayedShipments();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving arrival log:', error);
            alert('Network error');
        }
    });
}

/** Apply filters to arrival logs table */
function applyArrivalFilters() {
    const statusFilter = document.getElementById('arrival-status-filter')?.value;
    const dateFrom = document.getElementById('arrival-date-from')?.value;
    const dateTo = document.getElementById('arrival-date-to')?.value;
    
    const rows = document.querySelectorAll('#arrival-log-table tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        
        const status = cells[4].textContent.trim().toLowerCase();
        const expectedDate = cells[2].textContent.trim();
        
        let show = true;
        
        if (statusFilter && !status.includes(statusFilter)) {
            show = false;
        }
        
        if (dateFrom && expectedDate < dateFrom) {
            show = false;
        }
        if (dateTo && expectedDate > dateTo) {
            show = false;
        }
        
        row.style.display = show ? '' : 'none';
    });
}

/** Update existing arrival log */
window.updateArrivalLog = function(logId) {
    showToast('Update feature - coming soon!', 'info');
};

// Add required styles for modal (only once)
if (!document.getElementById('arrival-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'arrival-modal-styles';
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .modal-dialog {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-height: 90vh;
            overflow-y: auto;
            width: 100%;
            margin: 20px;
        }
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            margin: 0;
        }
        .modal-body {
            padding: 20px;
        }
        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        .btn-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        .btn-close:hover {
            color: #000;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .form-control:focus {
            outline: none;
            border-color: #2196F3;
        }
        .btn-sm {
            padding: 4px 8px;
            font-size: 0.85em;
        }
    `;
    document.head.appendChild(style);
}