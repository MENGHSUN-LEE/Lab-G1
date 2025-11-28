// js/pages/material/overview.js

import { state } from '../../app.js';
import { 
    materialOverviewContent,
    arrivalLogTemplate,
    qualityScoreTemplate,
    inventoryTrackingTemplate,
    costAnalysisTemplate
} from '../../templates/material_overview.js';
import { initArrivalLog } from './arrival_log.js';
import { initQualityScore } from './quality_score.js';
import { initInventoryTracking } from './inventory_tracking.js';
import { initCostAnalysis } from './cost_analysis.js';

/** Initialize Material Overview tab */
export function initMaterialOverview() {
    const overviewTab = document.getElementById('tab-overview');
    if (!overviewTab) {
        console.error('Material Overview tab not found');
        return;
    }

    // Inject the template
    overviewTab.innerHTML = materialOverviewContent;

    // Add click handlers for feature cards
    const featureCards = overviewTab.querySelectorAll('.card.clickable');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const feature = card.dataset.feature;
            loadFeature(feature);
            
            // Visual feedback
            featureCards.forEach(c => c.style.transform = 'scale(1)');
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.style.transform = 'scale(1)', 200);
        });

        // Hover effect
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'scale(1.05)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = '';
        });
    });

    console.log('✅ Material Overview initialized');
}

/** Load specific feature into content area */
function loadFeature(featureName) {
    const contentArea = document.getElementById('material-feature-content');
    if (!contentArea) return;

    const projectId = state.currentProject?.id;
    if (!projectId) {
        contentArea.innerHTML = '<p class="muted">Error: No project selected</p>';
        return;
    }

    // Show loading state
    contentArea.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <div class="spinner"></div>
            <p class="muted">Loading ${featureName} data...</p>
        </div>
    `;

    // Load appropriate feature
    switch(featureName) {
        case 'arrival':
            contentArea.innerHTML = arrivalLogTemplate;
            initArrivalLog(projectId);
            break;
        
        case 'quality':
            contentArea.innerHTML = qualityScoreTemplate;
            initQualityScore(projectId);
            break;
        
        case 'inventory':
            contentArea.innerHTML = inventoryTrackingTemplate;
            initInventoryTracking(projectId);
            break;
        
        case 'cost':
            contentArea.innerHTML = costAnalysisTemplate;
            initCostAnalysis(projectId);
            break;

        case 'ai-analytics':
            contentArea.innerHTML = aiAnalyticsTemplate;
            initAIAnalytics(projectId);
            break;
        
        default:
            contentArea.innerHTML = '<p class="muted">Feature not found</p>';
    }
}

/** Refresh current feature (call after data updates) */
export function refreshCurrentFeature() {
    // You can track which feature is currently active
    // and call the appropriate init function again
    const activeFeature = document.querySelector('.card.clickable[style*="scale(0.95)"]');
    if (activeFeature) {
        const feature = activeFeature.dataset.feature;
        loadFeature(feature);
    }
}

/** Helper: Show toast notification */
export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .subtab-panel {
        display: none;
    }
    .subtab-panel.active {
        display: block;
    }
`;
document.head.appendChild(style);