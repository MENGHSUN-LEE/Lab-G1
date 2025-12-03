// procura/js/pages/detail/alerts.js
// Predictive Alerts & Reports System - Frontend Module

export const AlertsManager = {
    currentProjectId: null,
    alertsCache: [],
    autoRefreshInterval: null,

    /**
     * Initialize the Alerts System
     */
    async init(projectId) {
        this.currentProjectId = projectId;
        await this.loadAlerts();
        this.startAutoRefresh();
    },

    /**
     * Load all active alerts for the project
     */
    async loadAlerts() {
        try {
            const response = await fetch(`/api/project/${this.currentProjectId}/alerts`);
            const data = await response.json();
            
            if (data.success) {
                this.alertsCache = data.alerts;
                this.renderAlertsDashboard(data);
            } else {
                console.error('Failed to load alerts:', data.message);
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    },

    /**
     * Render the Alerts Dashboard
     */
    renderAlertsDashboard(data) {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        const { alerts, total_alerts, critical_count, high_count } = data;

        // Alert Summary Banner
        const summaryHTML = `
            <div class="alerts-summary">
                <div class="summary-card critical">
                    <div class="count">${critical_count}</div>
                    <div class="label">Critical Alerts</div>
                </div>
                <div class="summary-card high">
                    <div class="count">${high_count}</div>
                    <div class="label">High Priority</div>
                </div>
                <div class="summary-card total">
                    <div class="count">${total_alerts}</div>
                    <div class="label">Total Active</div>
                </div>
            </div>
        `;

        // Filter Controls
        const filterHTML = `
            <div class="alerts-filters">
                <select id="alert-severity-filter">
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                </select>
                <select id="alert-type-filter">
                    <option value="all">All Types</option>
                    <option value="material_delay">Material Delays</option>
                    <option value="work_item_risk">Work Item Risks</option>
                    <option value="budget_risk">Budget Risks</option>
                    <option value="quality_issue">Quality Issues</option>
                    <option value="inventory_low">Low Inventory</option>
                </select>
                <button id="refresh-alerts-btn" class="btn-secondary">🔄 Refresh</button>
            </div>
        `;

        // Alerts List
        const alertsHTML = alerts.length > 0 ? alerts.map(alert => `
            <div class="alert-card ${alert.severity}" data-alert-id="${alert.id}">
                <div class="alert-header">
                    <span class="alert-icon">${this.getAlertIcon(alert.type)}</span>
                    <div class="alert-title-section">
                        <h3>${alert.title}</h3>
                        <span class="alert-severity ${alert.severity}">${alert.severity.toUpperCase()}</span>
                    </div>
                    <button class="alert-dismiss-btn" data-alert-id="${alert.id}">
                        ✕ Dismiss
                    </button>
                </div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-details">
                    ${this.renderAlertDetails(alert)}
                </div>
                ${alert.action_required ? `
                    <div class="alert-actions">
                        <button class="btn-action" data-alert-id="${alert.id}" data-action="resolve">
                            ✓ Take Action
                        </button>
                        <button class="btn-secondary" data-alert-id="${alert.id}" data-action="view-details">
                            📋 View Details
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('') : '<div class="no-alerts">✅ No active alerts. Everything looks good!</div>';

        container.innerHTML = summaryHTML + filterHTML + `<div class="alerts-list">${alertsHTML}</div>`;

        // Attach event listeners
        this.attachAlertEventListeners();
    },

    /**
     * Get icon for alert type
     */
    getAlertIcon(type) {
        const icons = {
            'material_delay': '🚚',
            'work_item_risk': '⚠️',
            'budget_risk': '💰',
            'quality_issue': '🔍',
            'inventory_low': '📦'
        };
        return icons[type] || '⚡';
    },

    /**
     * Render alert-specific details
     */
    renderAlertDetails(alert) {
        const details = alert.details;
        
        switch (alert.type) {
            case 'material_delay':
                return `
                    <div class="detail-grid">
                        <div><strong>Material:</strong> ${details.material_name}</div>
                        <div><strong>Vendor:</strong> ${details.vendor || 'N/A'}</div>
                        <div><strong>Days Overdue:</strong> ${details.days_overdue}</div>
                        <div><strong>Expected:</strong> ${new Date(details.expected_date).toLocaleDateString()}</div>
                        <div><strong>Work Item:</strong> ${details.work_item}</div>
                        <div><strong>Quantity:</strong> ${details.quantity}</div>
                    </div>
                `;
            
            case 'work_item_risk':
                return `
                    <div class="detail-grid">
                        <div><strong>Work Item:</strong> ${details.work_item_name}</div>
                        <div><strong>Scheduled:</strong> ${new Date(details.work_date).toLocaleDateString()}</div>
                        <div><strong>Days Until:</strong> ${details.days_until}</div>
                        <div><strong>Pending Materials:</strong> ${details.pending_materials} / ${details.total_materials}</div>
                    </div>
                `;
            
            case 'budget_risk':
                return `
                    <div class="detail-grid">
                        <div><strong>Current Cost:</strong> $${parseFloat(details.current_cost).toFixed(2)}</div>
                        <div><strong>Projected Cost:</strong> $${parseFloat(details.projected_cost).toFixed(2)}</div>
                        <div><strong>Potential Overrun:</strong> $${parseFloat(details.potential_overrun).toFixed(2)}</div>
                        <div><strong>Materials Tracked:</strong> ${details.materials_tracked}</div>
                    </div>
                `;
            
            case 'quality_issue':
                return `
                    <div class="detail-grid">
                        <div><strong>Vendor:</strong> ${details.vendor}</div>
                        <div><strong>Defect Count:</strong> ${details.defect_count}</div>
                        <div><strong>Severity:</strong> ${details.max_severity}</div>
                        <div><strong>Affected Materials:</strong> ${details.affected_materials}</div>
                    </div>
                `;
            
            case 'inventory_low':
                return `
                    <div class="detail-grid">
                        <div><strong>Material:</strong> ${details.material_name}</div>
                        <div><strong>Vendor:</strong> ${details.vendor}</div>
                        <div><strong>Needed:</strong> ${details.total_needed} ${details.unit}</div>
                        <div><strong>Received:</strong> ${details.received} ${details.unit}</div>
                        <div><strong>Remaining:</strong> ${details.remaining} ${details.unit}</div>
                        <div><strong>Required By:</strong> ${new Date(details.work_date).toLocaleDateString()}</div>
                    </div>
                `;
            
            default:
                return '<div>No additional details available.</div>';
        }
    },

    /**
     * Attach event listeners to alert controls
     */
    attachAlertEventListeners() {
        // Refresh button
        document.getElementById('refresh-alerts-btn')?.addEventListener('click', () => {
            this.loadAlerts();
        });

        // Filter dropdowns
        document.getElementById('alert-severity-filter')?.addEventListener('change', (e) => {
            this.filterAlerts(e.target.value, null);
        });

        document.getElementById('alert-type-filter')?.addEventListener('change', (e) => {
            this.filterAlerts(null, e.target.value);
        });

        // Dismiss buttons
        document.querySelectorAll('.alert-dismiss-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const alertId = e.target.dataset.alertId;
                this.dismissAlert(alertId);
            });
        });

        // Action buttons
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const alertId = e.target.dataset.alertId;
                const action = e.target.dataset.action;
                this.handleAlertAction(alertId, action);
            });
        });
    },

    /**
     * Filter alerts by severity and type
     */
    filterAlerts(severity, type) {
        const severityFilter = severity || document.getElementById('alert-severity-filter').value;
        const typeFilter = type || document.getElementById('alert-type-filter').value;

        const filtered = this.alertsCache.filter(alert => {
            const matchSeverity = severityFilter === 'all' || alert.severity === severityFilter;
            const matchType = typeFilter === 'all' || alert.type === typeFilter;
            return matchSeverity && matchType;
        });

        this.renderFilteredAlerts(filtered);
    },

    /**
     * Render filtered alerts
     */
    renderFilteredAlerts(alerts) {
        const listContainer = document.querySelector('.alerts-list');
        if (!listContainer) return;

        const alertsHTML = alerts.length > 0 ? alerts.map(alert => `
            <div class="alert-card ${alert.severity}" data-alert-id="${alert.id}">
                <div class="alert-header">
                    <span class="alert-icon">${this.getAlertIcon(alert.type)}</span>
                    <div class="alert-title-section">
                        <h3>${alert.title}</h3>
                        <span class="alert-severity ${alert.severity}">${alert.severity.toUpperCase()}</span>
                    </div>
                    <button class="alert-dismiss-btn" data-alert-id="${alert.id}">✕ Dismiss</button>
                </div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-details">${this.renderAlertDetails(alert)}</div>
            </div>
        `).join('') : '<div class="no-alerts">No alerts match your filters.</div>';

        listContainer.innerHTML = alertsHTML;
        this.attachAlertEventListeners();
    },

    /**
     * Dismiss an alert
     */
    async dismissAlert(alertId) {
        const userName = prompt('Enter your name to acknowledge this alert:');
        if (!userName) return;

        const notes = prompt('Add optional notes:');

        try {
            const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acknowledged_by: userName,
                    notes: notes || ''
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Alert dismissed successfully');
                this.loadAlerts(); // Reload alerts
            } else {
                alert('Failed to dismiss alert: ' + data.message);
            }
        } catch (error) {
            console.error('Error dismissing alert:', error);
            alert('Error dismissing alert');
        }
    },

    /**
     * Handle alert action buttons
     */
    handleAlertAction(alertId, action) {
        const alert = this.alertsCache.find(a => a.id === alertId);
        if (!alert) return;

        if (action === 'resolve') {
            // Navigate to relevant section based on alert type
            switch (alert.type) {
                case 'material_delay':
                    window.location.hash = `#detail?id=${this.currentProjectId}&tab=materials`;
                    break;
                case 'work_item_risk':
                    window.location.hash = `#detail?id=${this.currentProjectId}&tab=progress`;
                    break;
                case 'budget_risk':
                    window.location.hash = `#detail?id=${this.currentProjectId}&tab=cost`;
                    break;
                case 'quality_issue':
                    window.location.hash = `#detail?id=${this.currentProjectId}&tab=quality`;
                    break;
                case 'inventory_low':
                    window.location.hash = `#detail?id=${this.currentProjectId}&tab=inventory`;
                    break;
            }
        } else if (action === 'view-details') {
            this.showAlertDetailsModal(alert);
        }
    },

    /**
     * Show detailed alert information in a modal
     */
    showAlertDetailsModal(alert) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content alert-details-modal">
                <div class="modal-header">
                    <h2>${alert.title}</h2>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="alert-full-details">
                        <p><strong>Type:</strong> ${alert.type}</p>
                        <p><strong>Severity:</strong> ${alert.severity}</p>
                        <p><strong>Message:</strong> ${alert.message}</p>
                        <h3>Details:</h3>
                        ${this.renderAlertDetails(alert)}
                        <p><strong>Created:</strong> ${new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    /**
     * Start auto-refresh every 5 minutes
     */
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        this.autoRefreshInterval = setInterval(() => {
            this.loadAlerts();
        }, 300000); // 5 minutes
    },

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
};

// Export for use in detail/index.js
export default AlertsManager;