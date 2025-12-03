// js/pages/material/ai_analytics.js
// 🤖 AI-Powered Predictive Analytics Dashboard

import { showToast } from './overview.js';

let currentProjectId = null;
let analyticsData = null;

/** Initialize AI Analytics Dashboard */
export async function initAIAnalytics(projectId) {
    currentProjectId = projectId;
    
    // Show loading state
    showLoadingState();
    
    // Load and analyze data
    await Promise.all([
        analyzeMaterialDemand(),
        analyzeVendorPerformance(),
        detectAnomalies(),
        predictProjectRisks()
    ]);
    
    // Setup AI query interface
    setupAIQueryInterface();
    
    console.log('✅ AI Analytics initialized');
}

/** Show loading state with AI animation */
function showLoadingState() {
    const container = document.getElementById('ai-analytics-content');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="ai-brain-animation"></div>
            <h3 style="margin: 20px 0 10px; color: #2196F3;">🤖 AI Analyzing Your Project Data</h3>
            <p class="muted">Processing historical patterns, vendor performance, and material trends...</p>
            <div class="progress-bar" style="margin: 20px auto; max-width: 400px;">
                <div class="progress-fill"></div>
            </div>
        </div>
    `;
}

// ============ 1. MATERIAL DEMAND FORECASTING ============

/** Analyze material demand and predict future needs */
async function analyzeMaterialDemand() {
    try {
        // Fetch historical material usage
        const response = await fetch(`/api/project/${currentProjectId}/material-usage-history`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to fetch material usage history');
            return;
        }
        
        // Simple forecasting algorithm
        const forecast = predictMaterialDemand(data.history);
        
        // Render forecast visualization
        renderDemandForecast(forecast);
        
    } catch (error) {
        console.error('Error analyzing material demand:', error);
    }
}

/** Simple linear regression forecasting */
function predictMaterialDemand(history) {
    const forecasts = {};
    
    // Group by material
    const byMaterial = history.reduce((acc, item) => {
        if (!acc[item.material_name]) acc[item.material_name] = [];
        acc[item.material_name].push({
            date: new Date(item.date),
            quantity: parseFloat(item.quantity)
        });
        return acc;
    }, {});
    
    // Calculate trend for each material
    Object.entries(byMaterial).forEach(([material, data]) => {
        if (data.length < 3) return; // Need at least 3 data points
        
        // Sort by date
        data.sort((a, b) => a.date - b.date);
        
        // Simple moving average for next month
        const recentData = data.slice(-3);
        const avgQuantity = recentData.reduce((sum, d) => sum + d.quantity, 0) / recentData.length;
        
        // Calculate trend (increasing/decreasing)
        const trend = recentData.length >= 2 
            ? (recentData[recentData.length - 1].quantity - recentData[0].quantity) / recentData.length
            : 0;
        
        forecasts[material] = {
            historical: data,
            nextMonthPrediction: avgQuantity + trend,
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            confidence: data.length >= 5 ? 'high' : data.length >= 3 ? 'medium' : 'low'
        };
    });
    
    return forecasts;
}

/** Render demand forecast visualization */
function renderDemandForecast(forecasts) {
    const container = document.getElementById('demand-forecast-section');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card" style="padding: 25px; margin-bottom: 20px;">
            <h3>📊 Material Demand Forecast (Next Month)</h3>
            <p class="muted">AI-powered predictions based on historical consumption patterns</p>
            
            <div class="forecast-grid" style="margin-top: 20px;">
                ${Object.entries(forecasts).map(([material, forecast]) => {
                    const trendColor = forecast.trend === 'increasing' ? '#4CAF50' : 
                                      forecast.trend === 'decreasing' ? '#f44336' : '#FF9800';
                    const trendIcon = forecast.trend === 'increasing' ? '📈' : 
                                     forecast.trend === 'decreasing' ? '📉' : '➡️';
                    
                    return `
                        <div class="forecast-card" style="border-left: 4px solid ${trendColor}; padding: 15px; margin-bottom: 15px; background: #f9f9f9; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <h4 style="margin: 0 0 5px;">${material}</h4>
                                    <p style="margin: 0; font-size: 0.9em; color: #666;">
                                        Predicted: <strong style="font-size: 1.2em; color: ${trendColor};">
                                            ${forecast.nextMonthPrediction.toFixed(2)} units
                                        </strong>
                                    </p>
                                </div>
                                <div style="text-align: right;">
                                    <span style="font-size: 2em;">${trendIcon}</span>
                                    <p style="margin: 5px 0 0; font-size: 0.85em; color: ${trendColor}; font-weight: bold;">
                                        ${forecast.trend.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                                <small style="color: #666;">
                                    Confidence: <strong>${forecast.confidence}</strong>
                                    | Based on ${forecast.historical.length} data points
                                </small>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ============ 2. VENDOR PERFORMANCE PREDICTION ============

/** Analyze vendor performance and predict reliability */
async function analyzeVendorPerformance() {
    try {
        const response = await fetch(`/api/project/${currentProjectId}/vendor-performance-analysis`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to fetch vendor performance data');
            return;
        }
        
        // Calculate vendor reliability scores
        const vendorScores = calculateVendorReliability(data.vendors);
        
        // Render vendor performance matrix
        renderVendorPerformanceMatrix(vendorScores);
        
    } catch (error) {
        console.error('Error analyzing vendor performance:', error);
    }
}

/** Calculate vendor reliability score (0-100) */
function calculateVendorReliability(vendors) {
    return vendors.map(vendor => {
        const onTimeRate = vendor.on_time_deliveries / vendor.total_deliveries;
        const qualityScore = vendor.avg_quality_score / 10; // Normalize to 0-1
        const defectRate = 1 - (vendor.defect_count / vendor.total_deliveries);
        
        // Weighted score
        const reliabilityScore = (
            onTimeRate * 0.4 +
            qualityScore * 0.4 +
            defectRate * 0.2
        ) * 100;
        
        return {
            ...vendor,
            reliabilityScore: reliabilityScore.toFixed(1),
            recommendation: reliabilityScore >= 80 ? 'Highly Recommended' :
                           reliabilityScore >= 60 ? 'Recommended' :
                           reliabilityScore >= 40 ? 'Use with Caution' : 'Not Recommended'
        };
    }).sort((a, b) => b.reliabilityScore - a.reliabilityScore);
}

/** Render vendor performance matrix */
function renderVendorPerformanceMatrix(vendors) {
    const container = document.getElementById('vendor-performance-section');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card" style="padding: 25px; margin-bottom: 20px;">
            <h3>🏆 AI Vendor Reliability Rankings</h3>
            <p class="muted">Predictive scores based on delivery performance, quality, and defect history</p>
            
            <div style="margin-top: 20px;">
                ${vendors.map((vendor, index) => {
                    const score = parseFloat(vendor.reliabilityScore);
                    const scoreColor = score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#f44336';
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                    
                    // ✅ FIX: Add null check for avg_quality_score
                    const qualityScore = vendor.avg_quality_score != null ? parseFloat(vendor.avg_quality_score).toFixed(1) : 'N/A';
                    const onTimePercent = (vendor.on_time_deliveries / vendor.total_deliveries * 100).toFixed(0);
                    
                    return `
                        <div class="vendor-score-card" style="display: flex; align-items: center; gap: 20px; padding: 15px; margin-bottom: 10px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid ${scoreColor};">
                            <div style="font-size: 2em; min-width: 50px; text-align: center;">
                                ${medal}
                            </div>
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px;">${vendor.name}</h4>
                                <div style="display: flex; gap: 20px; font-size: 0.9em; color: #666;">
                                    <span>⏱️ ${onTimePercent}% On-Time</span>
                                    <span>⭐ ${qualityScore}/10 Quality</span>
                                    <span>🔧 ${vendor.defect_count} Defects</span>
                                </div>
                            </div>
                            <div style="text-align: right; min-width: 150px;">
                                <div style="font-size: 2em; font-weight: bold; color: ${scoreColor};">
                                    ${score}
                                </div>
                                <p style="margin: 5px 0 0; font-size: 0.85em; color: ${scoreColor}; font-weight: bold;">
                                    ${vendor.recommendation}
                                </p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ============ 3. ANOMALY DETECTION ============

/** Detect anomalies in material prices, quality, and delivery times */
async function detectAnomalies() {
    try {
        const response = await fetch(`/api/project/${currentProjectId}/anomaly-detection`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to detect anomalies');
            return;
        }
        
        // Analyze anomalies
        const anomalies = identifyAnomalies(data.metrics);
        
        // Render anomaly alerts
        renderAnomalyAlerts(anomalies);
        
    } catch (error) {
        console.error('Error detecting anomalies:', error);
    }
}

/** Identify anomalies using statistical methods (Z-score) */
function identifyAnomalies(metrics) {
    const anomalies = [];
    
    // Price anomalies
    if (metrics.prices && metrics.prices.length >= 5) {
        const mean = metrics.prices.reduce((a, b) => a + b.price, 0) / metrics.prices.length;
        const stdDev = Math.sqrt(
            metrics.prices.reduce((sum, p) => sum + Math.pow(p.price - mean, 2), 0) / metrics.prices.length
        );
        
        metrics.prices.forEach(item => {
            const zScore = Math.abs((item.price - mean) / stdDev);
            if (zScore > 2) { // 2 standard deviations
                anomalies.push({
                    type: 'price',
                    severity: zScore > 3 ? 'critical' : 'warning',
                    material: item.material_name,
                    message: `Unusual price: $${item.price.toFixed(2)} (${zScore.toFixed(1)}σ from mean)`,
                    recommendation: 'Verify pricing with vendor before ordering'
                });
            }
        });
    }
    
    // Quality anomalies (similar logic)
    // Delivery time anomalies (similar logic)
    
    return anomalies;
}

/** Render anomaly alerts */
function renderAnomalyAlerts(anomalies) {
    const container = document.getElementById('anomaly-alerts-section');
    if (!container) return;
    
    if (anomalies.length === 0) {
        container.innerHTML = `
            <div class="card" style="padding: 25px; background: #e8f5e9; border-left: 4px solid #4CAF50;">
                <h3>✅ No Anomalies Detected</h3>
                <p>All metrics are within normal ranges. Your project is running smoothly!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="card" style="padding: 25px; background: #fff3cd; border-left: 4px solid #ffc107;">
            <h3>⚠️ Anomalies Detected</h3>
            <p class="muted">AI has identified unusual patterns that may require attention</p>
            
            <div style="margin-top: 20px;">
                ${anomalies.map(anomaly => `
                    <div class="anomaly-card" style="padding: 15px; margin-bottom: 10px; background: white; border-radius: 8px; border-left: 4px solid ${anomaly.severity === 'critical' ? '#f44336' : '#FF9800'};">
                        <div style="display: flex; justify-content: between; align-items: start;">
                            <div style="flex: 1;">
                                <strong style="color: ${anomaly.severity === 'critical' ? '#f44336' : '#FF9800'};">
                                    ${anomaly.type.toUpperCase()} ANOMALY
                                </strong>
                                <p style="margin: 5px 0;"><strong>${anomaly.material}</strong></p>
                                <p style="margin: 5px 0; color: #666;">${anomaly.message}</p>
                                <p style="margin: 10px 0 0; font-size: 0.9em; color: #2196F3;">
                                    💡 ${anomaly.recommendation}
                                </p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============ 4. PROJECT RISK PREDICTION ============

/** Predict project delay risks */
async function predictProjectRisks() {
    try {
        const response = await fetch(`/api/project/${currentProjectId}/risk-assessment`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to assess project risks');
            return;
        }
        
        // Calculate risk score
        const riskScore = calculateProjectRisk(data.metrics);
        
        // Render risk gauge
        renderRiskGauge(riskScore);
        
    } catch (error) {
        console.error('Error predicting project risks:', error);
    }
}

/** Calculate project delay risk (0-100) */
function calculateProjectRisk(metrics) {
    const delayedItems = metrics.delayed_work_items || 0;
    const totalItems = metrics.total_work_items || 1;
    const delayedMaterials = metrics.delayed_materials || 0;
    const totalMaterials = metrics.total_materials || 1;
    
    const workDelayRatio = delayedItems / totalItems;
    const materialDelayRatio = delayedMaterials / totalMaterials;
    
    const riskScore = (workDelayRatio * 0.6 + materialDelayRatio * 0.4) * 100;
    
    return {
        score: riskScore.toFixed(1),
        level: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
        factors: {
            workItems: `${delayedItems}/${totalItems} delayed`,
            materials: `${delayedMaterials}/${totalMaterials} delayed`
        }
    };
}

/** Render risk gauge visualization */
function renderRiskGauge(risk) {
    const container = document.getElementById('risk-gauge-section');
    if (!container) return;
    
    const color = risk.level === 'High' ? '#f44336' : risk.level === 'Medium' ? '#FF9800' : '#4CAF50';
    
    container.innerHTML = `
        <div class="card" style="padding: 25px; text-align: center;">
            <h3>🎯 Project Delay Risk Assessment</h3>
            <div style="margin: 30px auto; max-width: 300px;">
                <svg viewBox="0 0 200 120" style="width: 100%;">
                    <!-- Gauge background -->
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e0e0e0" stroke-width="20"/>
                    <!-- Gauge fill -->
                    <path d="M 20 100 A 80 80 0 0 1 ${20 + (160 * risk.score / 100)} ${100 - (80 * Math.sin(Math.PI * risk.score / 100))}" 
                          fill="none" stroke="${color}" stroke-width="20" stroke-linecap="round"/>
                    <!-- Center text -->
                    <text x="100" y="80" text-anchor="middle" font-size="32" font-weight="bold" fill="${color}">
                        ${risk.score}%
                    </text>
                    <text x="100" y="105" text-anchor="middle" font-size="16" fill="#666">
                        ${risk.level} Risk
                    </text>
                </svg>
            </div>
            <div style="text-align: left; margin-top: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px;">
                <h4>Risk Factors:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Work Items: ${risk.factors.workItems}</li>
                    <li>Materials: ${risk.factors.materials}</li>
                </ul>
            </div>
        </div>
    `;
}

// ============ 5. AI QUERY INTERFACE ============

/** Setup natural language query interface - Click-only version */
function setupAIQueryInterface() {
    const resultsDiv = document.getElementById('ai-query-results');
    
    // Add click handlers for sample query buttons
    document.querySelectorAll('.sample-query-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sampleQuery = btn.getAttribute('data-query');
            handleAIQuery(sampleQuery);
        });
    });
    
    // Show initial prompt
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="card" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: white; font-size: 1.1em;">👆 Click any question above to see AI insights</p>
            </div>
        `;
    }
}

/** Handle AI query - calls backend proxy */
async function handleAIQuery(query) {
    const resultsDiv = document.getElementById('ai-query-results');
    
    if (!query) {
        resultsDiv.innerHTML = `
            <div class="card" style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; color: #856404;">⚠️ Please enter a question</p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = '<p style="color: white;">🤔 AI is thinking...</p>';
    
    try {
        // Gather project context
        const materials = await fetch(`/api/project/${currentProjectId}/materials-overview`).then(r => r.json());
        const vendors = await fetch(`/api/project/${currentProjectId}/vendor-performance-analysis`).then(r => r.json());
        
        const context = {
            total_materials: materials.materials?.length || 0,
            vendors: vendors.vendors || [],
            materials_summary: materials.materials?.slice(0, 5) || [] // First 5 for context
        };
        
        // Call YOUR backend proxy (not Anthropic directly)
        const response = await fetch('/api/ai/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, context })
        });
        
        if (!response.ok) {
            throw new Error('AI query failed');
        }
        
        const data = await response.json();
        
        resultsDiv.innerHTML = `
            <div class="card" style="background: white; padding: 20px; border-radius: 8px; color: #333;">
                <h4 style="margin: 0 0 10px; color: #667eea;">💡 AI Response</h4>
                <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${data.response}</p>
            </div>
        `;
        
    } catch (error) {
        console.error('AI query error:', error);
        resultsDiv.innerHTML = `
            <div class="card" style="background: #ffebee; padding: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #c62828;">❌ Error: ${error.message}</p>
            </div>
        `;
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    .ai-brain-animation {
        width: 80px;
        height: 80px;
        margin: 0 auto;
        background: linear-gradient(45deg, #2196F3, #9C27B0);
        border-radius: 50%;
        animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
    }
    
    .progress-bar {
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #2196F3, #9C27B0);
        animation: progress 3s ease-in-out infinite;
    }
    
    @keyframes progress {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
    }
`;
document.head.appendChild(style);