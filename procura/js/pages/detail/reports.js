// procura/js/pages/detail/reports.js
// Comprehensive Reports System - Frontend Module

export const ReportsManager = {
    currentProjectId: null,

    /**
     * Initialize the Reports System
     */
    async init(projectId) {
        this.currentProjectId = projectId;
        this.renderReportsDashboard();
    },

    /**
     * Render the Reports Dashboard
     */
    renderReportsDashboard() {
        const container = document.getElementById('reports-container');
        if (!container) return;

        container.innerHTML = `
            <div class="reports-dashboard">
                <h2>📊 Project Reports & Analytics</h2>
                
                <div class="report-cards">
                    <!-- Project Health Report -->
                    <div class="report-card">
                        <div class="report-icon">💚</div>
                        <h3>Project Health Report</h3>
                        <p>Overall project status, work items, materials, quality, and vendor performance.</p>
                        <button class="btn-primary" data-report="health">
                            Generate Health Report
                        </button>
                    </div>

                    <!-- Predictive Delay Report -->
                    <div class="report-card">
                        <div class="report-icon">🔮</div>
                        <h3>Predictive Analysis</h3>
                        <p>AI-powered predictions of potential delays, budget overruns, and quality issues.</p>
                        <button class="btn-primary" data-report="predictions">
                            Generate Predictions
                        </button>
                    </div>

                    <!-- Cost Analysis Report -->
                    <div class="report-card">
                        <div class="report-icon">💰</div>
                        <h3>Cost Analysis</h3>
                        <p>Detailed breakdown of material costs, vendor spending, and budget tracking.</p>
                        <button class="btn-primary" data-report="cost">
                            View Cost Analysis
                        </button>
                    </div>

                    <!-- Quality Report -->
                    <div class="report-card">
                        <div class="report-icon">⭐</div>
                        <h3>Quality Control Report</h3>
                        <p>Material quality scores, defect reports, and inspection history.</p>
                        <button class="btn-primary" data-report="quality">
                            View Quality Report
                        </button>
                    </div>

                    <!-- Vendor Performance -->
                    <div class="report-card">
                        <div class="report-icon">👥</div>
                        <h3>Vendor Performance</h3>
                        <p>Delivery punctuality, quality ratings, and vendor comparison.</p>
                        <button class="btn-primary" data-report="vendors">
                            View Vendor Report
                        </button>
                    </div>

                    <!-- Inventory Status -->
                    <div class="report-card">
                        <div class="report-icon">📦</div>
                        <h3>Inventory Status</h3>
                        <p>Material stock levels, reorder alerts, and shipment tracking.</p>
                        <button class="btn-primary" data-report="inventory">
                            View Inventory
                        </button>
                    </div>
                </div>

                <div id="report-results" class="report-results"></div>
            </div>
        `;

        this.attachReportEventListeners();
    },

    /**
     * Attach event listeners to report buttons
     */
    attachReportEventListeners() {
        document.querySelectorAll('[data-report]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reportType = e.target.dataset.report;
                await this.generateReport(reportType);
            });
        });
    },

    /**
     * Generate a specific report
     */
    async generateReport(reportType) {
        const resultsContainer = document.getElementById('report-results');
        resultsContainer.innerHTML = '<div class="loading">⏳ Generating report...</div>';

        try {
            switch (reportType) {
                case 'health':
                    await this.generateHealthReport();
                    break;
                case 'predictions':
                    await this.generatePredictionsReport();
                    break;
                case 'cost':
                    await this.generateCostReport();
                    break;
                case 'quality':
                    await this.generateQualityReport();
                    break;
                case 'vendors':
                    await this.generateVendorReport();
                    break;
                case 'inventory':
                    await this.generateInventoryReport();
                    break;
            }
        } catch (error) {
            resultsContainer.innerHTML = `<div class="error">❌ Error generating report: ${error.message}</div>`;
        }
    },

    /**
     * Generate Project Health Report
     */
    async generateHealthReport() {
        const response = await fetch(`/api/project/${this.currentProjectId}/report/health`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const { report } = data;
        const resultsContainer = document.getElementById('report-results');

        resultsContainer.innerHTML = `
            <div class="report-section">
                <h2>📊 Project Health Report</h2>
                <p class="report-subtitle">Generated: ${new Date(report.generated_at).toLocaleString()}</p>

                <!-- Overall Health Score -->
                <div class="health-score-container">
                    <div class="health-score ${report.health_score.status}">
                        <div class="score-circle">
                            <div class="score-value">${report.health_score.overall}</div>
                            <div class="score-label">Health Score</div>
                        </div>
                        <div class="score-status">${report.health_score.status.toUpperCase()}</div>
                    </div>

                    <div class="score-breakdown">
                        <div class="breakdown-item">
                            <span>Work Items</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${report.health_score.components.work_items}%"></div>
                            </div>
                            <span>${report.health_score.components.work_items}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Materials</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${report.health_score.components.materials}%"></div>
                            </div>
                            <span>${report.health_score.components.materials}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Quality</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${report.health_score.components.quality}%"></div>
                            </div>
                            <span>${report.health_score.components.quality}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Defects</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${report.health_score.components.defects}%"></div>
                            </div>
                            <span>${report.health_score.components.defects}</span>
                        </div>
                    </div>
                </div>

                <!-- Detailed Statistics -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Work Items</h3>
                        <p>Total: ${report.work_items.total}</p>
                        <p>✅ Ahead: ${report.work_items.ahead}</p>
                        <p>🟢 On Time: ${report.work_items.on_time}</p>
                        <p>🔴 Delayed: ${report.work_items.delayed}</p>
                        <p>Completed: ${report.work_items.completed}</p>
                        <p>Upcoming: ${report.work_items.upcoming}</p>
                    </div>

                    <div class="stat-card">
                        <h3>Materials</h3>
                        <p>Total: ${report.materials.total}</p>
                        <p>✅ Arrived: ${report.materials.arrived}</p>
                        <p>📦 Ordered: ${report.materials.ordered}</p>
                        <p>⏳ Pending: ${report.materials.pending}</p>
                        <p>🚚 In Transit: ${report.materials.in_transit}</p>
                        <p>💰 Total Cost: $${parseFloat(report.materials.total_cost).toFixed(2)}</p>
                    </div>

                    <div class="stat-card">
                        <h3>Quality</h3>
                        <p>Avg Score: ${parseFloat(report.quality.avg_quality_score || 0).toFixed(1)}/10</p>
                        <p>Total Inspections: ${report.quality.total_inspections}</p>
                        <p>Materials Inspected: ${report.quality.materials_inspected}</p>
                    </div>

                    <div class="stat-card">
                        <h3>Defects</h3>
                        <p>Total: ${report.defects.total_defects}</p>
                        <p>🔴 Critical: ${report.defects.critical}</p>
                        <p>🟡 High: ${report.defects.high}</p>
                        <p>⚠️ Open: ${report.defects.open_defects}</p>
                    </div>

                    <div class="stat-card">
                        <h3>Vendors</h3>
                        <p>Total Active: ${report.vendors.total_vendors}</p>
                        <p>On-Time Rate: ${parseFloat(report.vendors.avg_on_time_rate || 0).toFixed(1)}%</p>
                    </div>
                </div>

                <div class="report-actions">
                    <button class="btn-primary" onclick="ReportsManager.exportReport('health', 'pdf')">
                        📄 Export as PDF
                    </button>
                    <button class="btn-secondary" onclick="ReportsManager.exportReport('health', 'excel')">
                        📊 Export as Excel
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Generate Predictive Analysis Report
     */
    async generatePredictionsReport() {
        const response = await fetch(`/api/project/${this.currentProjectId}/report/predictions`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const { predictions } = data;
        const resultsContainer = document.getElementById('report-results');

        const predictionsHTML = predictions.predictions.length > 0 ? predictions.predictions.map(pred => `
            <div class="prediction-card ${pred.likelihood}">
                <div class="prediction-header">
                    <h3>${pred.target}</h3>
                    <span class="likelihood-badge ${pred.likelihood}">${pred.likelihood.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div class="prediction-body">
                    <div class="risk-score">
                        <div class="risk-meter">
                            <div class="risk-fill" style="width: ${pred.risk_score}%"></div>
                        </div>
                        <span>Risk Score: ${pred.risk_score}/100</span>
                    </div>
                    <div class="prediction-factors">
                        <h4>Risk Factors:</h4>
                        <ul>
                            ${pred.factors.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="prediction-recommendation">
                        <h4>Recommendation:</h4>
                        <p>${pred.recommendation}</p>
                    </div>
                    <div class="prediction-impact">
                        <strong>Impact:</strong> <span class="impact-badge ${pred.impact}">${pred.impact.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p>✅ No significant risks detected. Project is on track!</p>';

        resultsContainer.innerHTML = `
            <div class="report-section">
                <h2>🔮 Predictive Analysis Report</h2>
                <p class="report-subtitle">Analysis Date: ${new Date(predictions.analysis_date).toLocaleString()}</p>
                
                <div class="predictions-list">
                    ${predictionsHTML}
                </div>

                <div class="report-actions">
                    <button class="btn-primary" onclick="ReportsManager.exportReport('predictions', 'pdf')">
                        📄 Export as PDF
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Generate Cost Analysis Report
     */
    async generateCostReport() {
        const response = await fetch(`/api/project/${this.currentProjectId}/cost-analysis`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const { costs, totalProjectCost } = data;
        const resultsContainer = document.getElementById('report-results');

        const costsHTML = costs.map(cost => `
            <tr>
                <td>${cost.material_name}</td>
                <td>${cost.vendor || 'N/A'}</td>
                <td>${cost.total_quantity} ${cost.unit}</td>
                <td>$${parseFloat(cost.avg_price).toFixed(2)}</td>
                <td class="cost-total">$${parseFloat(cost.total_cost).toFixed(2)}</td>
            </tr>
        `).join('');

        resultsContainer.innerHTML = `
            <div class="report-section">
                <h2>💰 Cost Analysis Report</h2>
                
                <div class="total-cost-banner">
                    <h3>Total Project Cost</h3>
                    <div class="total-amount">$${parseFloat(totalProjectCost).toFixed(2)}</div>
                </div>

                <table class="cost-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Vendor</th>
                            <th>Quantity</th>
                            <th>Avg Unit Price</th>
                            <th>Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costsHTML}
                    </tbody>
                </table>

                <div class="report-actions">
                    <button class="btn-primary" onclick="ReportsManager.exportReport('cost', 'excel')">
                        📊 Export as Excel
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Generate Quality Report
     */
    async generateQualityReport() {
        const response = await fetch(`/api/project/${this.currentProjectId}/materials-quality-overview`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const { materials } = data;
        const resultsContainer = document.getElementById('report-results');

        const materialsHTML = materials.map(m => `
            <tr>
                <td>${m.material_name}</td>
                <td>${m.vendor || 'N/A'}</td>
                <td>${parseFloat(m.avg_quality_score || 0).toFixed(1)}/10</td>
                <td>${m.quality_score_count}</td>
                <td class="${m.defect_count > 0 ? 'has-defects' : ''}">${m.defect_count}</td>
                <td>${m.test_count}</td>
            </tr>
        `).join('');

        resultsContainer.innerHTML = `
            <div class="report-section">
                <h2>⭐ Quality Control Report</h2>
                
                <table class="quality-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Vendor</th>
                            <th>Avg Quality Score</th>
                            <th>Inspections</th>
                            <th>Defects</th>
                            <th>Tests</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materialsHTML}
                    </tbody>
                </table>

                <div class="report-actions">
                    <button class="btn-primary" onclick="ReportsManager.exportReport('quality', 'pdf')">
                        📄 Export as PDF
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Generate Vendor Performance Report
     */
    async generateVendorReport() {
        const response = await fetch(`/api/vendor-performance`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const resultsContainer = document.getElementById('report-results');

        const categoriesHTML = data.data.map(cat => `
            <div class="vendor-category">
                <h3>${cat.category}</h3>
                <table class="vendor-table">
                    <thead>
                        <tr>
                            <th>Vendor</th>
                            <th>Orders</th>
                            <th>Avg Rating</th>
                            <th>Reviews</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cat.vendors.map(v => `
                            <tr>
                                <td>${v.vendor_name}</td>
                                <td>${v.order_count}</td>
                                <td>${v.avg_rating}/5</td>
                                <td>${v.rating_count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('');

        resultsContainer.innerHTML = `
            <div class="report-section">
                <h2>👥 Vendor Performance Report</h2>
                ${categoriesHTML}
                <div class="report-actions">
                    <button class="btn-primary" onclick="ReportsManager.exportReport('vendors', 'excel')">
                        📊 Export as Excel
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Generate Inventory Status Report
     */
    async generateInventoryReport() {
        const response = await fetch(`/api/project/${this.currentProjectId}/inventory`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const { inventory } = data;
        const resultsContainer = document.getElementById('report-results');

        const inventoryHTML = inventory.map(item => `
            <tr class="${item.remaining > 0 ? 'needs-reorder' : ''}">
                <td>${item.material_name}</td>
                <td>${item.vendor || 'N/A'}</td>
                <td>${item.total_ordered} ${item.unit}</td>
                <td>${item.total_received} ${item.unit}</td>
                <td>${item.remaining} ${item.unit}</td>
                <td>${((item.total_received / item.total_ordered) * 100).toFixed(0)}%</td>
            </tr>
        `).join('');

        resultsContainer.innerHTML = `
            <div class="report-section">
                <h2>📦 Inventory Status Report</h2>
                
                <table class="inventory-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Vendor</th>
                            <th>Ordered</th>
                            <th>Received</th>
                            <th>Remaining</th>
                            <th>% Received</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventoryHTML}
                    </tbody>
                </table>

                <div class="report-actions">
                    <button class="btn-primary" onclick="ReportsManager.exportReport('inventory', 'excel')">
                        📊 Export as Excel
                    </button>
                </div>
            </div>
        `;
    },


    /**
     * Export report - ACTUAL IMPLEMENTATION
     */
    async exportReport(reportType, format) {
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'export-loading';
        loadingMsg.innerHTML = '⏳ Generating file... Please wait.';
        document.body.appendChild(loadingMsg);
        
        try {
            let endpoint = '';
            
            // Determine endpoint based on report type and format
            if (reportType === 'health' && format === 'pdf') {
                endpoint = `/api/project/${this.currentProjectId}/export-health-pdf`;
            } else if (reportType === 'health' && format === 'excel') {
                endpoint = `/api/project/${this.currentProjectId}/export-health-excel`;
            } else if (reportType === 'cost' && format === 'excel') {
                endpoint = `/api/project/${this.currentProjectId}/export-cost-excel`;
            } else {
                throw new Error(`Export format not supported: ${reportType} as ${format}`);
            }
            
            // Call backend to generate file
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message);
            }
            
            // Remove loading message
            document.body.removeChild(loadingMsg);
            
            // Trigger download
            window.location.href = data.download_url;
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'export-success';
            successMsg.innerHTML = `✅ File ready! Download started: ${data.filename}`;
            document.body.appendChild(successMsg);
            
            setTimeout(() => {
                document.body.removeChild(successMsg);
            }, 3000);
            
        } catch (error) {
            console.error('Export error:', error);
            document.body.removeChild(loadingMsg);
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'export-error';
            errorMsg.innerHTML = `❌ Export failed: ${error.message}`;
            document.body.appendChild(errorMsg);
            
            setTimeout(() => {
                document.body.removeChild(errorMsg);
            }, 5000);
        }
    },
};

// Make available globally for onclick handlers
window.ReportsManager = ReportsManager;

export default ReportsManager;