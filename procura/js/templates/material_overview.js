export const materialOverviewContent = `
    <div class="stack" style="gap: 25px;">
        <!-- Feature Navigation Cards -->
        <div class="grid cols-4" style="gap: 15px;">
            <div class="card clickable" data-feature="arrival" style="padding: 20px; text-align: center; cursor: pointer; transition: transform 0.2s;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #4CAF50;">local_shipping</span>
                <h4 style="margin: 10px 0 5px;">Arrival Log</h4>
                <p class="muted" style="font-size: 0.9em;">Track deliveries & schedules</p>
            </div>
            
            <div class="card clickable" data-feature="quality" style="padding: 20px; text-align: center; cursor: pointer; transition: transform 0.2s;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #2196F3;">verified</span>
                <h4 style="margin: 10px 0 5px;">Quality Score</h4>
                <p class="muted" style="font-size: 0.9em;">Inspections & testing</p>
            </div>
            
            <div class="card clickable" data-feature="inventory" style="padding: 20px; text-align: center; cursor: pointer; transition: transform 0.2s;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #FF9800;">inventory_2</span>
                <h4 style="margin: 10px 0 5px;">Inventory</h4>
                <p class="muted" style="font-size: 0.9em;">Stock levels & alerts</p>
            </div>
            
            <div class="card clickable" data-feature="cost" style="padding: 20px; text-align: center; cursor: pointer; transition: transform 0.2s;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #9C27B0;">analytics</span>
                <h4 style="margin: 10px 0 5px;">Cost Analysis</h4>
                <p class="muted" style="font-size: 0.9em;">Budget tracking</p>
            </div>
        </div>
        
        <!-- ✅ NEW: Second Row with AI Analytics -->
        <div class="grid cols-4" style="gap: 15px;">
            <div class="card clickable" data-feature="ai-analytics" style="padding: 20px; text-align: center; cursor: pointer; transition: transform 0.2s; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: white;">psychology</span>
                <h4 style="margin: 10px 0 5px; color: white;">AI Analytics</h4>
                <p style="font-size: 0.9em; margin: 0; opacity: 0.9;">Predictive insights & NLP</p>
            </div>
        </div>

        <!-- Dynamic Content Area -->
        <div id="material-feature-content" class="card" style="min-height: 400px; padding: 25px;">
            <div class="stack" style="align-items: center; justify-content: center; height: 300px;">
                <span class="material-symbols-outlined" style="font-size: 64px; color: #ccc;">touch_app</span>
                <p class="muted" style="font-size: 1.1em;">Select a feature above to get started</p>
            </div>
        </div>
    </div>
`;

// ============ FEATURE-SPECIFIC TEMPLATES ============

/** Arrival Log Feature Template */
export const arrivalLogTemplate = `
    <div class="stack">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>📦 Material Arrival Log & Delivery Schedule</h3>
            <button id="add-arrival-btn" class="btn-primary">+ Add Delivery</button>
        </div>
        
        <!-- Alert for Delayed Shipments -->
        <div id="delayed-alert" class="card" style="background: #fff3cd; border-left: 4px solid #ffc107; display: none;">
            <strong>⚠️ Delayed Shipments Alert</strong>
            <div id="delayed-list" style="margin-top: 10px;"></div>
        </div>

        <!-- Filter Options -->
        <div class="grid cols-3" style="gap: 15px;">
            <div class="stack">
                <label>Status Filter</label>
                <select id="arrival-status-filter">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="delayed">Delayed</option>
                </select>
            </div>
            <div class="stack">
                <label>Date Range</label>
                <input type="date" id="arrival-date-from" />
            </div>
            <div class="stack">
                <label>To</label>
                <input type="date" id="arrival-date-to" />
            </div>
        </div>

        <!-- Arrival Log Table -->
        <table class="table" id="arrival-log-table">
            <thead>
                <tr>
                    <th>Material</th>
                    <th>Vendor</th>
                    <th>Expected Date</th>
                    <th>Actual Date</th>
                    <th>Status</th>
                    <th>Days Delayed</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="7" class="muted">Loading arrival logs...</td></tr>
            </tbody>
        </table>
    </div>
`;

/** Quality Score Feature Template */
export const qualityScoreTemplate = `
    <div class="stack">
        <h3>✅ Material Quality Management</h3>
        
        <!-- Sub-feature Tabs -->
        <div class="tabs" style="margin-bottom: 20px;">
            <button class="tab-btn active" data-subtab="scores">Quality Scores</button>
            <button class="tab-btn" data-subtab="inspection">Inspection Checklist</button>
            <button class="tab-btn" data-subtab="defects">Defect Reports</button>
            <button class="tab-btn" data-subtab="testing">Test Results</button>
        </div>

        <!-- Quality Scores Sub-tab -->
        <div id="subtab-scores" class="subtab-panel active">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h4>Material Quality Scores</h4>
                <button id="add-quality-score-btn" class="btn-primary">+ Add Score</button>
            </div>
            <div id="quality-scores-list"></div>
        </div>

        <!-- Inspection Checklist Sub-tab -->
        <div id="subtab-inspection" class="subtab-panel">
            <h4>Quality Inspection Checklist</h4>
            <div class="grid cols-2" style="gap: 20px;">
                <div class="stack">
                    <label>Select Material</label>
                    <select id="inspection-material-select">
                        <option value="">-- Select Material --</option>
                    </select>
                </div>
                <div class="stack">
                    <label>Inspector Name</label>
                    <input type="text" id="inspection-inspector" placeholder="Enter your name" />
                </div>
            </div>
            <div id="inspection-checklist-items" class="stack" style="margin-top: 20px;"></div>
            <button id="submit-inspection-btn" class="btn-primary" style="margin-top: 15px;">Submit Inspection</button>
        </div>

        <!-- Defect Reports Sub-tab -->
        <div id="subtab-defects" class="subtab-panel">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h4>Defect Reports</h4>
                <button id="add-defect-report-btn" class="btn-primary">+ Report Defect</button>
            </div>
            <div id="defect-reports-list"></div>
        </div>

        <!-- Test Results Sub-tab -->
        <div id="subtab-testing" class="subtab-panel">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h4>Material Testing Results</h4>
                <button id="add-test-result-btn" class="btn-primary">+ Add Test Result</button>
            </div>
            <div id="test-results-list"></div>
        </div>
    </div>
`;

/** Inventory Tracking Feature Template */
export const inventoryTrackingTemplate = `
    <div class="stack">
        <h3>📊 Material Inventory Tracking</h3>
        
        <!-- Summary Cards -->
        <div class="grid cols-3" style="gap: 15px; margin-bottom: 25px;">
            <div class="card" style="background: #e8f5e9; padding: 20px;">
                <h4 style="margin: 0; color: #4CAF50;">Total Materials</h4>
                <p style="font-size: 2em; margin: 10px 0 0; font-weight: bold;" id="inventory-total">0</p>
            </div>
            <div class="card" style="background: #fff3e0; padding: 20px;">
                <h4 style="margin: 0; color: #FF9800;">Low Stock Items</h4>
                <p style="font-size: 2em; margin: 10px 0 0; font-weight: bold;" id="inventory-low-stock">0</p>
            </div>
            <div class="card" style="background: #ffebee; padding: 20px;">
                <h4 style="margin: 0; color: #f44336;">Out of Stock</h4>
                <p style="font-size: 2em; margin: 10px 0 0; font-weight: bold;" id="inventory-out-stock">0</p>
            </div>
        </div>

        <!-- Reorder Alerts -->
        <div id="reorder-alerts-section" style="display: none;" class="card" style="background: #ffebee; border-left: 4px solid #f44336; margin-bottom: 20px;">
            <strong>🚨 Reorder Alerts - Action Required</strong>
            <div id="reorder-alerts-list" style="margin-top: 10px;"></div>
        </div>

        <!-- Inventory Table -->
        <table class="table" id="inventory-table">
            <thead>
                <tr>
                    <th>Material Name</th>
                    <th>Vendor</th>
                    <th>Total Ordered</th>
                    <th>Received</th>
                    <th>Remaining</th>
                    <th>Unit</th>
                    <th>Stock Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="8" class="muted">Loading inventory data...</td></tr>
            </tbody>
        </table>
    </div>
`;

/** Cost Analysis Feature Template */
export const costAnalysisTemplate = `
    <div class="stack">
        <h3>💰 Material Cost Analysis</h3>
        
        <!-- Summary Cards -->
        <div class="grid cols-4" style="gap: 15px; margin-bottom: 25px;">
            <div class="card" style="background: #e3f2fd; padding: 20px;">
                <h4 style="margin: 0; color: #2196F3; font-size: 0.9em;">Total Material Cost</h4>
                <p style="font-size: 1.8em; margin: 10px 0 0; font-weight: bold;" id="cost-total">$0</p>
            </div>
            <div class="card" style="background: #f3e5f5; padding: 20px;">
                <h4 style="margin: 0; color: #9C27B0; font-size: 0.9em;">Average Cost/Item</h4>
                <p style="font-size: 1.8em; margin: 10px 0 0; font-weight: bold;" id="cost-average">$0</p>
            </div>
            <div class="card" style="background: #e8f5e9; padding: 20px;">
                <h4 style="margin: 0; color: #4CAF50; font-size: 0.9em;">Lowest Cost Item</h4>
                <p style="font-size: 1.8em; margin: 10px 0 0; font-weight: bold;" id="cost-lowest">$0</p>
            </div>
            <div class="card" style="background: #ffebee; padding: 20px;">
                <h4 style="margin: 0; color: #f44336; font-size: 0.9em;">Highest Cost Item</h4>
                <p style="font-size: 1.8em; margin: 10px 0 0; font-weight: bold;" id="cost-highest">$0</p>
            </div>
        </div>

        <!-- Filter Options -->
        <div class="grid cols-2" style="gap: 15px; margin-bottom: 20px;">
            <div class="stack">
                <label>Sort By</label>
                <select id="cost-sort-by">
                    <option value="total_desc">Total Cost (High to Low)</option>
                    <option value="total_asc">Total Cost (Low to High)</option>
                    <option value="unit_desc">Unit Price (High to Low)</option>
                    <option value="unit_asc">Unit Price (Low to High)</option>
                </select>
            </div>
            <div class="stack">
                <label>Vendor Filter</label>
                <select id="cost-vendor-filter">
                    <option value="">All Vendors</option>
                </select>
            </div>
        </div>

        <!-- Cost Breakdown Table -->
        <table class="table" id="cost-analysis-table">
            <thead>
                <tr>
                    <th>Material Name</th>
                    <th>Vendor</th>
                    <th>Total Quantity</th>
                    <th>Unit</th>
                    <th>Avg Unit Price</th>
                    <th>Total Cost</th>
                    <th>% of Budget</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="7" class="muted">Loading cost analysis...</td></tr>
            </tbody>
        </table>
    </div>
`;


// Sample query button styles
const sampleQueryStyles = `
    .sample-query-btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.4);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85em;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .sample-query-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-2px);
    }
`;

// js/templates/material_overview.js
// ADD THIS to your existing material_overview.js exports

/** AI Analytics Dashboard Template */
export const aiAnalyticsTemplate = `
    <div class="stack" style="gap: 25px;">
        
        <!-- AI Query Interface Card -->
        <div class="card" style="padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h3 style="margin: 0 0 15px; color: white;">🤖 Ask AI About Your Project</h3>
            <p style="margin: 0 0 20px; opacity: 0.9;">Click any question below to get instant AI insights</p>
            
            <!-- Sample Questions - Click Only -->
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                <button class="sample-query-btn" data-query="Which vendors have the best on-time delivery rates?">
                    📊 Vendor Performance
                </button>
                <button class="sample-query-btn" data-query="Show me material usage trends">
                    📦 Material Usage
                </button>
                <button class="sample-query-btn" data-query="What are my cost risks?">
                    💰 Cost Analysis
                </button>
                <button class="sample-query-btn" data-query="Predict project delays">
                    ⚠️ Risk Assessment
                </button>
            </div>
            
            <div id="ai-query-results" style="margin-top: 20px;"></div>
        </div>
        
        <!-- Material Demand Forecast Section -->
        <div id="demand-forecast-section"></div>
        
        <!-- Vendor Performance Section -->
        <div id="vendor-performance-section"></div>
        
        <!-- Anomaly Detection Section -->
        <div id="anomaly-alerts-section"></div>
        
        <!-- Risk Assessment Section -->
        <div id="risk-gauge-section"></div>
        
    </div>
`;

// Add styles for sample query buttons
const aiStyles = document.createElement('style');
aiStyles.textContent = `
    .sample-query-btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.4);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85em;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .sample-query-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-2px);
    }
`;
if (!document.getElementById('ai-analytics-styles')) {
    aiStyles.id = 'ai-analytics-styles';
    document.head.appendChild(aiStyles);
}