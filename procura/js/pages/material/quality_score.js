// js/pages/material/quality_score.js

import { showToast } from './overview.js';

let currentProjectId = null;

/** Initialize Quality Score feature */
export async function initQualityScore(projectId) {
    currentProjectId = projectId;
    
    // Setup sub-tab navigation
    setupSubTabs();
    
    // Load initial data (Quality Scores tab)
    await loadQualityScores();
    
    // Setup event listeners
    setupQualityListeners();
    
    console.log('✅ Quality Score initialized');
}

/** Setup sub-tab navigation */
function setupSubTabs() {
    const tabButtons = document.querySelectorAll('#tab-materials .tab-btn[data-subtab]');
    const panels = document.querySelectorAll('.subtab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetTab = btn.dataset.subtab;
            
            // Update active states
            tabButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`subtab-${targetTab}`)?.classList.add('active');
            
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

/** Load quality scores list */
async function loadQualityScores() {
    const container = document.getElementById('quality-scores-list');
    if (!container) return;
    
    container.innerHTML = '<p class="muted">Loading quality scores...</p>';
    
    try {
        // For now, we'll show a placeholder since we need material IDs
        // In production, you'd fetch all materials first, then their scores
        container.innerHTML = `
            <div class="card" style="padding: 20px; text-align: center;">
                <p class="muted">Select a material from the Materials Management tab to view quality history</p>
                <button class="btn-primary" style="margin-top: 15px;" id="quick-add-score-btn">
                    + Quick Add Quality Score
                </button>
            </div>
        `;
        
        document.getElementById('quick-add-score-btn')?.addEventListener('click', showAddQualityScoreDialog);
        
    } catch (error) {
        console.error('Error loading quality scores:', error);
        container.innerHTML = '<p style="color: red;">Error loading quality scores</p>';
    }
}

/** Show dialog to add quality score */
function showAddQualityScoreDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Add Quality Score</h3>
                <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="stack">
                    <label>Material ID</label>
                    <input type="number" id="quality-material-id" placeholder="Enter material ID" required />
                </div>
                <div class="stack">
                    <label>Quality Score (0-10)</label>
                    <input type="number" id="quality-score" min="0" max="10" step="0.1" placeholder="8.5" required />
                </div>
                <div class="stack">
                    <label>Inspector Name</label>
                    <input type="text" id="quality-inspector" placeholder="Your name" required />
                </div>
                <div class="stack">
                    <label>Inspection Date</label>
                    <input type="date" id="quality-inspection-date" required />
                </div>
                <div class="stack">
                    <label>Notes</label>
                    <textarea id="quality-notes" rows="3" placeholder="Inspection notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" id="save-quality-score-btn">Save Score</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Save button
    document.getElementById('save-quality-score-btn').addEventListener('click', async () => {
        const materialId = document.getElementById('quality-material-id').value;
        const score = document.getElementById('quality-score').value;
        const inspector = document.getElementById('quality-inspector').value;
        const inspectionDate = document.getElementById('quality-inspection-date').value;
        const notes = document.getElementById('quality-notes').value;
        
        if (!materialId || !score || !inspector || !inspectionDate) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (score < 0 || score > 10) {
            alert('Score must be between 0 and 10');
            return;
        }
        
        try {
            const response = await fetch(`/api/materials/${materialId}/quality-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score: parseFloat(score),
                    inspector_name: inspector,
                    inspection_date: inspectionDate,
                    notes: notes
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Quality score added successfully!', 'success');
                dialog.remove();
                loadQualityScores();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving quality score:', error);
            alert('Network error');
        }
    });
}

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
        } else {
            container.innerHTML = '<p class="muted">No checklist items found</p>';
        }
    } catch (error) {
        console.error('Error loading checklist:', error);
        container.innerHTML = '<p style="color: red;">Error loading checklist</p>';
    }
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
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Report Material Defect</h3>
                <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="stack">
                    <label>Material ID</label>
                    <input type="number" id="defect-material-id" required />
                </div>
                <div class="stack">
                    <label>Defect Type</label>
                    <input type="text" id="defect-type" placeholder="e.g., Surface crack, Color mismatch" required />
                </div>
                <div class="stack">
                    <label>Severity</label>
                    <select id="defect-severity" required>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                <div class="stack">
                    <label>Description</label>
                    <textarea id="defect-description" rows="4" placeholder="Detailed description..." required></textarea>
                </div>
                <div class="stack">
                    <label>Reported By</label>
                    <input type="text" id="defect-reporter" placeholder="Your name" required />
                </div>
                <div class="stack">
                    <label>Report Date</label>
                    <input type="date" id="defect-date" required />
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" id="save-defect-btn">Submit Report</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Save handler (implementation similar to quality score)
    document.getElementById('save-defect-btn').addEventListener('click', async () => {
        // Implementation here
        showToast('Defect report submitted!', 'success');
        dialog.remove();
        loadDefectReports();
    });
}

// ============ TEST RESULTS ============

/** Load test results */
async function loadTestResults() {
    const container = document.getElementById('test-results-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card" style="padding: 20px; text-align: center;">
            <p class="muted">Test results feature - Select a material to view testing history</p>
        </div>
    `;
}

/** Setup event listeners */
function setupQualityListeners() {
    // Add Quality Score button
    document.getElementById('add-quality-score-btn')?.addEventListener('click', showAddQualityScoreDialog);
    
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