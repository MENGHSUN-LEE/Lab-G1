// js/pages/material/cost_analysis.js

import { showToast } from './overview.js';

let currentProjectId = null;
let costData = [];

/** Initialize Cost Analysis feature */
export async function initCostAnalysis(projectId) {
    currentProjectId = projectId;
    
    // Load cost analysis data
    await loadCostAnalysis();
    
    // Setup event listeners
    setupCostListeners();
    
    console.log('✅ Cost Analysis initialized');
}

/** Load cost analysis data */
async function loadCostAnalysis() {
    const tbody = document.querySelector('#cost-analysis-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="muted">Loading cost analysis...</td></tr>';
    
    try {
        const response = await fetch(`/api/project/${currentProjectId}/cost-analysis`);
        const data = await response.json();
        
        if (data.success && data.costs) {
            costData = data.costs;
            renderCostAnalysisTable(data.costs);
            updateCostSummary(data.costs);
            populateVendorFilter(data.costs);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="muted">No cost data available</td></tr>';
            updateCostSummary([]);
        }
    } catch (error) {
        console.error('Error loading cost analysis:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="color: red;">Error loading cost data</td></tr>';
    }
}

/** Render cost analysis table */
function renderCostAnalysisTable(costs) {
    const tbody = document.querySelector('#cost-analysis-table tbody');
    if (!tbody) return;
    
    if (costs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="muted">No cost data</td></tr>';
        return;
    }
    
    // Calculate total budget for percentage
    const totalBudget = costs.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
    
    tbody.innerHTML = costs.map(item => {
        const totalCost = parseFloat(item.total_cost) || 0;
        const avgPrice = parseFloat(item.avg_price) || 0;
        const quantity = parseFloat(item.total_quantity) || 0;
        const budgetPercent = totalBudget > 0 ? (totalCost / totalBudget * 100) : 0;
        
        return `
            <tr>
                <td><strong>${item.material_name}</strong></td>
                <td>${item.vendor || '-'}</td>
                <td>${quantity.toFixed(2)}</td>
                <td>${item.unit || '-'}</td>
                <td>$${avgPrice.toFixed(2)}</td>
                <td><strong>$${totalCost.toFixed(2)}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background: #e0e0e0; border-radius: 4px; height: 8px; overflow: hidden;">
                            <div style="background: #2196F3; height: 100%; width: ${budgetPercent}%;"></div>
                        </div>
                        <span style="font-size: 0.85em; color: #666;">${budgetPercent.toFixed(1)}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/** Update cost summary cards */
function updateCostSummary(costs) {
    const totalEl = document.getElementById('cost-total');
    const averageEl = document.getElementById('cost-average');
    const lowestEl = document.getElementById('cost-lowest');
    const highestEl = document.getElementById('cost-highest');
    
    if (!totalEl || !averageEl || !lowestEl || !highestEl) return;
    
    if (costs.length === 0) {
        totalEl.textContent = '$0';
        averageEl.textContent = '$0';
        lowestEl.textContent = '$0';
        highestEl.textContent = '$0';
        return;
    }
    
    // Calculate totals
    const total = costs.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
    const average = total / costs.length;
    
    // Find lowest and highest cost items
    const sortedCosts = costs
        .map(item => parseFloat(item.total_cost || 0))
        .sort((a, b) => a - b);
    
    const lowest = sortedCosts[0] || 0;
    const highest = sortedCosts[sortedCosts.length - 1] || 0;
    
    // Update UI
    totalEl.textContent = `$${total.toFixed(2)}`;
    averageEl.textContent = `$${average.toFixed(2)}`;
    lowestEl.textContent = `$${lowest.toFixed(2)}`;
    highestEl.textContent = `$${highest.toFixed(2)}`;
}

/** Populate vendor filter dropdown */
function populateVendorFilter(costs) {
    const filterSelect = document.getElementById('cost-vendor-filter');
    if (!filterSelect) return;
    
    // Get unique vendors
    const vendors = [...new Set(costs.map(item => item.vendor).filter(Boolean))];
    
    // Keep "All Vendors" option and add vendors
    filterSelect.innerHTML = '<option value="">All Vendors</option>' +
        vendors.map(vendor => `<option value="${vendor}">${vendor}</option>`).join('');
}

/** Setup event listeners */
function setupCostListeners() {
    // Sort by dropdown
    const sortBy = document.getElementById('cost-sort-by');
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            applyCostFiltersAndSort();
        });
    }
    
    // Vendor filter dropdown
    const vendorFilter = document.getElementById('cost-vendor-filter');
    if (vendorFilter) {
        vendorFilter.addEventListener('change', () => {
            applyCostFiltersAndSort();
        });
    }
}

/** Apply filters and sorting to cost data */
function applyCostFiltersAndSort() {
    const sortBy = document.getElementById('cost-sort-by')?.value;
    const vendorFilter = document.getElementById('cost-vendor-filter')?.value;
    
    // Filter by vendor
    let filtered = vendorFilter 
        ? costData.filter(item => item.vendor === vendorFilter)
        : [...costData];
    
    // Sort data
    switch(sortBy) {
        case 'total_desc':
            filtered.sort((a, b) => parseFloat(b.total_cost || 0) - parseFloat(a.total_cost || 0));
            break;
        case 'total_asc':
            filtered.sort((a, b) => parseFloat(a.total_cost || 0) - parseFloat(b.total_cost || 0));
            break;
        case 'unit_desc':
            filtered.sort((a, b) => parseFloat(b.avg_price || 0) - parseFloat(a.avg_price || 0));
            break;
        case 'unit_asc':
            filtered.sort((a, b) => parseFloat(a.avg_price || 0) - parseFloat(b.avg_price || 0));
            break;
    }
    
    // Re-render table
    renderCostAnalysisTable(filtered);
}

/** Export cost analysis (future feature) */
export function exportCostAnalysis() {
    if (costData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Create CSV content
    const headers = ['Material Name', 'Vendor', 'Total Quantity', 'Unit', 'Avg Unit Price', 'Total Cost'];
    const rows = costData.map(item => [
        item.material_name,
        item.vendor || '',
        item.total_quantity,
        item.unit || '',
        item.avg_price,
        item.total_cost
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost_analysis_project_${currentProjectId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Cost analysis exported successfully!', 'success');
}