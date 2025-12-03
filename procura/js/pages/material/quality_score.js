// js/pages/material/quality_score.js
// FIXED VERSION - Following the same pattern as cost_analysis.js and inventory_tracking.js

import { showToast } from './overview.js';

let currentProjectId = null;
let materialsData = [];

/** Initialize Quality Score feature */
export async function initQualityScore(projectId) {
    currentProjectId = projectId;
    console.log('✅ Initializing Quality Score for project:', projectId);
    
    // Setup sub-tab navigation
    setupSubTabs();
    
    // Load initial data
    await loadQualityScores();
    
    // Setup event listeners
    setupQualityListeners();
    
    console.log('✅ Quality Score initialized');
}

/** Setup sub-tab navigation */
function setupSubTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn[data-subtab]');
    const panels = document.querySelectorAll('.subtab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetTab = btn.dataset.subtab;
            
            // Update active states
            tabButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetPanel = document.getElementById(`subtab-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            
            // Load data for selected tab
            switch(targetTab) {
                case 'scores':
                    await loadQualityScores();
                    break;
                case 'inspection':
                    await loadInspectionChecklist();
                    break;
                case 'defects':
                    await loadDefectReports();
                    break;
                case 'testing':
                    await loadTestResults();
                    break;
            }
        });
    });
}

// ============ QUALITY SCORES ============

/** Load quality scores list - FIXED VERSION */
async function loadQualityScores() {
    const container = document.getElementById('quality-scores-list');
    if (!container) {
        console.error('Quality scores list container not found');
        return;
    }
    
    container.innerHTML = '<p class="muted">Loading materials with quality data...</p>';
    
    try {
        console.log('Fetching quality overview for project:', currentProjectId);
        const response = await fetch(`/api/project/${currentProjectId}/materials-quality-overview`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Quality overview data received:', data);
        
        if (data.success && data.materials) {
            materialsData = data.materials;
            renderQualityScoresList(data.materials);
        } else {
            container.innerHTML = '<p class="muted">No materials found</p>';
        }
    } catch (error) {
        console.error('Error loading quality scores:', error);
        container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

/** Render quality scores list */
function renderQualityScoresList(materials) {
    const container = document.getElementById('quality-scores-list');
    if (!container) return;
    
    if (materials.length === 0) {
        container.innerHTML = `
            <div class="card" style="padding: 20px; text-align: center;">
                <p class="muted">No materials found in this project</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="margin-bottom: 15px;">
            <button class="btn-primary" id="add-quality-score-btn-main">+ Add Quality Score</button>
        </div>
        ${materials.map(material => {
            const avgScore = material.avg_quality_score ? parseFloat(material.avg_quality_score).toFixed(1) : 'N/A';
            const scoreColor = material.avg_quality_score >= 8 ? '#4CAF50' : 
                             material.avg_quality_score >= 6 ? '#FF9800' : 
                             material.avg_quality_score ? '#f44336' : '#9E9E9E';
            
            return `
                <div class="card" style="padding: 15px; margin-bottom: 15px; border-left: 4px solid ${scoreColor};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px;">${material.material_name}</h4>
                            <p class="muted" style="margin: 0 0 10px;">
                                Vendor: ${material.vendor || 'Unknown'} | 
                                Work Item: ${material.work_item_name} | 
                                Date: ${new Date(material.work_date).toLocaleDateString()}
                            </p>
                            <div style="display: flex; gap: 20px; font-size: 0.9em;">
                                <span>📊 Avg Score: <strong style="color: ${scoreColor}; font-size: 1.2em;">${avgScore}</strong></span>
                                <span>📝 ${material.quality_score_count} Scores</span>
                                <span>🔧 ${material.defect_count} Open Defects</span>
                                <span>🧪 ${material.test_count} Tests</span>
                            </div>
                        </div>
                        <div>
                            <button class="btn-sm" onclick="window.addQualityScore(${material.material_id}, '${material.material_name}')">
                                + Add Score
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
    
    // Bind main add button
    document.getElementById('add-quality-score-btn-main')?.addEventListener('click', () => {
        if (materials.length > 0) {
            window.addQualityScore(materials[0].material_id, materials[0].material_name);
        }
    });
}

/** Show dialog to add quality score */
window.addQualityScore = function(materialId, materialName) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Add Quality Score</h3>
                <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                    <strong>${materialName}</strong>
                    <div style="font-size: 0.9em; color: #666; margin-top: 4px;">Material ID: ${materialId}</div>
                </div>
                
                <div class="form-group">
                    <label>Quality Score (0-10) *</label>
                    <input type="number" id="quality-score" class="form-control" 
                           min="0" max="10" step="0.1" placeholder="8.5" required />
                </div>
                <div class="form-group">
                    <label>Inspector Name *</label>
                    <input type="text" id="quality-inspector" class="form-control" 
                           placeholder="Your name" required />
                </div>
                <div class="form-group">
                    <label>Inspection Date *</label>
                    <input type="date" id="quality-inspection-date" class="form-control" 
                           value="${new Date().toISOString().split('T')[0]}" required />
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="quality-notes" class="form-control" rows="3" 
                              placeholder="Inspection notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" id="save-quality-score-btn">Save Score</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Save button handler
    document.getElementById('save-quality-score-btn').addEventListener('click', async () => {
        const score = document.getElementById('quality-score').value;
        const inspector = document.getElementById('quality-inspector').value;
        const inspectionDate = document.getElementById('quality-inspection-date').value;
        const notes = document.getElementById('quality-notes').value;
        
        if (!score || !inspector || !inspectionDate) {
            alert('Please fill in all required fields');
            return;
        }
        
        const scoreNum = parseFloat(score);
        if (scoreNum < 0 || scoreNum > 10) {
            alert('Score must be between 0 and 10');
            return;
        }
        
        // Disable button
        const saveBtn = document.getElementById('save-quality-score-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
            const response = await fetch(`/api/materials/${materialId}/quality-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score: scoreNum,
                    inspector_name: inspector,
                    inspection_date: inspectionDate,
                    notes: notes
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Quality score added successfully!', 'success');
                dialog.remove();
                await loadQualityScores();
            } else {
                alert('Error: ' + result.message);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Score';
            }
        } catch (error) {
            console.error('Error saving quality score:', error);
            alert('Network error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Score';
        }
    });
};

// ============ INSPECTION CHECKLIST ============

/** Load inspection checklist */
async function loadInspectionChecklist() {
    const container = document.getElementById('inspection-checklist-items');
    if (!container) return;
    
    container.innerHTML = '<p class="muted">Loading checklist...</p>';
    
    try {
        const response = await fetch('/api/inspection-checklist');
        const data = await response.json();
        
        if (data.success && data.checklist) {
            renderInspectionChecklist(data.checklist);
            populateMaterialSelector();
        } else {
            container.innerHTML = '<p class="muted">No checklist items found</p>';
        }
    } catch (error) {
        console.error('Error loading checklist:', error);
        container.innerHTML = '<p style="color: red;">Error loading checklist</p>';
    }
}

/** Populate material selector */
function populateMaterialSelector() {
    const select = document.getElementById('inspection-material-select');
    if (!select || materialsData.length === 0) return;
    
    select.innerHTML = '<option value="">-- Select Material --</option>' +
        materialsData.map(m => 
            `<option value="${m.material_id}">${m.material_name} (${m.vendor || 'Unknown'})</option>`
        ).join('');
}

/** Render inspection checklist */
function renderInspectionChecklist(items) {
    const container = document.getElementById('inspection-checklist-items');
    if (!container) return;
    
    // Group by category
    const grouped = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});
    
    container.innerHTML = Object.entries(grouped).map(([category, categoryItems]) => `
        <div class="card" style="padding: 15px; margin-bottom: 15px;">
            <h4 style="margin: 0 0 15px; color: #2196F3;">${category}</h4>
            ${categoryItems.map(item => `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <input type="checkbox" id="check-${item.id}" data-item-id="${item.id}" 
                           ${item.is_critical ? 'data-critical="true"' : ''} />
                    <label for="check-${item.id}" style="flex: 1; cursor: pointer;">
                        ${item.item_name}
                        ${item.is_critical ? '<span style="color: #f44336; font-weight: bold;"> *</span>' : ''}
                    </label>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ============ DEFECT REPORTS ============

/** Load defect reports */
async function loadDefectReports() {
    const container = document.getElementById('defect-reports-list');
    if (!container) return;
    
    container.innerHTML = '<p class="muted">Loading defect reports...</p>';
    
    try {
        const response = await fetch(`/api/project/${currentProjectId}/defect-reports`);
        const data = await response.json();
        
        if (data.success && data.reports) {
            renderDefectReports(data.reports);
        } else {
            container.innerHTML = '<p class="muted">No defect reports found</p>';
        }
    } catch (error) {
        console.error('Error loading defect reports:', error);
        container.innerHTML = '<p style="color: red;">Error loading defect reports</p>';
    }
}

/** Render defect reports */
function renderDefectReports(reports) {
    const container = document.getElementById('defect-reports-list');
    if (!container) return;
    
    if (reports.length === 0) {
        container.innerHTML = '<p class="muted">No defect reports - Great quality! 🎉</p>';
        return;
    }
    
    const severityColors = {
        'critical': '#d32f2f',
        'high': '#f57c00',
        'medium': '#fbc02d',
        'low': '#388e3c'
    };
    
    container.innerHTML = reports.map(report => `
        <div class="card" style="padding: 15px; margin-bottom: 15px; border-left: 4px solid ${severityColors[report.severity]};">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px;">${report.material_name}</h4>
                    <p class="muted" style="margin: 0 0 10px;">Vendor: ${report.vendor || 'Unknown'}</p>
                    <p style="margin: 0 0 10px;"><strong>Type:</strong> ${report.defect_type}</p>
                    <p style="margin: 0;">${report.description}</p>
                </div>
                <span style="padding: 4px 12px; border-radius: 4px; background: ${severityColors[report.severity]}; color: white; font-size: 0.85em;">
                    ${report.severity.toUpperCase()}
                </span>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                Reported by ${report.reported_by} on ${new Date(report.report_date).toLocaleDateString()}
                • Status: <strong>${report.status}</strong>
            </div>
        </div>
    `).join('');
}

/** Show dialog to add defect report */
function showAddDefectDialog() {
    if (materialsData.length === 0) {
        alert('No materials found. Please add materials first.');
        return;
    }
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Report Material Defect</h3>
                <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Select Material *</label>
                    <select id="defect-material-id" class="form-control" required>
                        <option value="">-- Select Material --</option>
                        ${materialsData.map(m => 
                            `<option value="${m.material_id}">${m.material_name} (${m.vendor || 'Unknown'})</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Defect Type *</label>
                    <input type="text" id="defect-type" class="form-control" 
                           placeholder="e.g., Surface crack, Color mismatch" required />
                </div>
                <div class="form-group">
                    <label>Severity *</label>
                    <select id="defect-severity" class="form-control" required>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea id="defect-description" class="form-control" rows="4" 
                              placeholder="Detailed description..." required></textarea>
                </div>
                <div class="form-group">
                    <label>Reported By *</label>
                    <input type="text" id="defect-reporter" class="form-control" 
                           placeholder="Your name" required />
                </div>
                <div class="form-group">
                    <label>Report Date *</label>
                    <input type="date" id="defect-date" class="form-control" 
                           value="${new Date().toISOString().split('T')[0]}" required />
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" id="save-defect-btn">Submit Report</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Save handler
    document.getElementById('save-defect-btn').addEventListener('click', async () => {
        const materialId = document.getElementById('defect-material-id').value;
        const defectType = document.getElementById('defect-type').value;
        const severity = document.getElementById('defect-severity').value;
        const description = document.getElementById('defect-description').value;
        const reporter = document.getElementById('defect-reporter').value;
        const reportDate = document.getElementById('defect-date').value;
        
        if (!materialId || !defectType || !description || !reporter) {
            alert('Please fill in all required fields');
            return;
        }
        
        const saveBtn = document.getElementById('save-defect-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Submitting...';
        
        try {
            const response = await fetch(`/api/materials/${materialId}/defect-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    defect_type: defectType,
                    severity: severity,
                    description: description,
                    reported_by: reporter,
                    report_date: reportDate
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Defect report submitted successfully!', 'success');
                dialog.remove();
                await loadDefectReports();
            } else {
                alert('Error: ' + result.message);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Submit Report';
            }
        } catch (error) {
            console.error('Error submitting defect report:', error);
            alert('Network error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Submit Report';
        }
    });
}

// ============ TEST RESULTS ============

/** Load test results */
async function loadTestResults() {
    const container = document.getElementById('test-results-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card" style="padding: 20px; text-align: center;">
            <p class="muted">Test results feature - Select a material to add test results</p>
            <button class="btn-primary" style="margin-top: 15px;" id="add-test-result-main-btn">
                + Add Test Result
            </button>
        </div>
    `;
    
    document.getElementById('add-test-result-main-btn')?.addEventListener('click', () => {
        showToast('Test result feature coming soon!', 'info');
    });
}

/** Setup event listeners */
function setupQualityListeners() {
    // Add Quality Score button (if exists in other places)
    document.getElementById('add-quality-score-btn')?.addEventListener('click', () => {
        if (materialsData.length > 0) {
            window.addQualityScore(materialsData[0].material_id, materialsData[0].material_name);
        } else {
            alert('No materials found');
        }
    });
    
    // Add Defect Report button
    document.getElementById('add-defect-report-btn')?.addEventListener('click', showAddDefectDialog);
    
    // Submit Inspection button
    document.getElementById('submit-inspection-btn')?.addEventListener('click', submitInspection);
    
    // Add Test Result button
    document.getElementById('add-test-result-btn')?.addEventListener('click', () => {
        showToast('Test result feature coming soon!', 'info');
    });
}

/** Submit inspection checklist */
async function submitInspection() {
    const materialId = document.getElementById('inspection-material-select')?.value;
    const inspector = document.getElementById('inspection-inspector')?.value;
    
    if (!materialId || !inspector) {
        alert('Please select a material and enter inspector name');
        return;
    }
    
    // Collect checklist results
    const checkboxes = document.querySelectorAll('#inspection-checklist-items input[type="checkbox"]');
    const results = Array.from(checkboxes).map(cb => ({
        item_id: cb.dataset.itemId,
        checked: cb.checked,
        is_critical: cb.dataset.critical === 'true'
    }));
    
    // Check if all critical items are checked
    const criticalFailed = results.some(r => r.is_critical && !r.checked);
    const overallPass = !criticalFailed;
    
    try {
        const response = await fetch(`/api/materials/${materialId}/inspection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inspector_name: inspector,
                inspection_date: new Date().toISOString().split('T')[0],
                checklist_results: results,
                overall_pass: overallPass
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(
                overallPass ? 'Inspection passed! ✅' : 'Inspection failed - Critical items missing ❌',
                overallPass ? 'success' : 'error'
            );
            
            // Reset form
            checkboxes.forEach(cb => cb.checked = false);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error submitting inspection:', error);
        alert('Network error');
    }
}

// Add required modal styles (only once)
if (!document.getElementById('quality-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'quality-modal-styles';
    style.textContent = `
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
            box-sizing: border-box;
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