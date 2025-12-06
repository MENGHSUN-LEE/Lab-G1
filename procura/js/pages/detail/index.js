// js/pages/detail/index.js

import { state } from '../../app.js';
import { setActiveTab } from '../common.js';
import { renderProgress, syncProgressDates, bindProgressEvents } from './progress.js';
import { renderMaterialsTable } from './materials.js';
import { syncCreateSelectors, bindCreateEvents } from './create.js';
import { syncEditSelectors, bindEditEvents } from './edit.js';
import { bindMaterialOverviewEvents, renderMaterialOverview } from './material_overview.js';
import { bindVendorManagementEvents, renderVendorManagement } from './vendor_management.js?v=6';

// ✨ EXISTING: Import Steven's Material Overview feature
import { initMaterialOverview } from '../material/overview.js';

// ✅ NEW: Import Alerts & Reports modules
import { AlertsManager } from './alerts.js';
import { ReportsManager } from './reports.js';
import { initRFQ } from './rfq.js';

// --- 元素快取 (只保留共用元素) ---
const detailTitle = document.getElementById("detailTitle");
const detailMeta = document.getElementById("detailMeta");

// --- 頁面主渲染 ---
export function renderDetail(p) {
  // Update state
  state.currentProject = p;

  const detailTitle = document.getElementById("detailTitle");
  const detailMeta = document.getElementById("detailMeta");

  // Update page title and metadata
  detailTitle.textContent = p.name || "專案細項";
  detailMeta.textContent = `Owner：${p.owner || "-"}　｜　Tags：${Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "-"}`;

  // Set default active tab
  setActiveTab("progress");

  // 同步所有需要初始化的 UI
  syncProgressDates();
  renderProgress('all');
  syncCreateSelectors();
  syncEditSelectors();
  renderMaterialsTable();

  // ✨ EXISTING: Setup Material Overview tab lazy loading
  setupMaterialOverviewTab();

  // ✅ NEW: Initialize Alerts & Reports System
  initAlertsAndReports(p.id);
  setupRFQTab();
  console.log("✅ Detail page rendered with all features including Alerts & Reports");
}

// ✅ NEW: Initialize Alerts & Reports System
async function initAlertsAndReports(projectId) {
  try {
    await AlertsManager.init(projectId);
    await ReportsManager.init(projectId);
    console.log("✅ Alerts & Reports initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing Alerts & Reports:", error);
  }
}
// ✅ NEW: Setup RFQ tab with lazy initialization
function setupRFQTab() {
  const rfqTab = document.querySelector('.tab-btn[data-tab="rfq"]');

  if (!rfqTab) {
    console.warn('RFQ tab button not found');
    return;
  }

  // Add click listener for lazy loading
  rfqTab.addEventListener('click', () => {
    // Initialize RFQ only once when first clicked
    if (!rfqTab.dataset.initialized) {
      console.log('🚀 Initializing RFQ for the first time...');
      initRFQ();
      rfqTab.dataset.initialized = 'true';
    }
  });

  // If user directly opens detail page on rfq tab, initialize it
  if (location.hash.includes('tab=rfq')) {
    console.log('🚀 Auto-initializing RFQ (direct link)...');
    initRFQ();
    rfqTab.dataset.initialized = 'true';
  }
}
// ✨ EXISTING: Setup Material Overview tab with lazy initialization
function setupMaterialOverviewTab() {
  const overviewTab = document.querySelector('.tab-btn[data-tab="overview"]');

  if (!overviewTab) {
    console.warn('Material Overview tab button not found');
    return;
  }

  // Add click listener for lazy loading
  overviewTab.addEventListener('click', () => {
    // Initialize Material Overview only once when first clicked
    if (!overviewTab.dataset.initialized) {
      console.log('🚀 Initializing Material Overview for the first time...');
      initMaterialOverview();
      overviewTab.dataset.initialized = 'true';
    }
  });

  // ✨ If user directly opens detail page on overview tab, initialize it
  if (location.hash.includes('tab=overview')) {
    console.log('🚀 Auto-initializing Material Overview (direct link)...');
    initMaterialOverview();
    overviewTab.dataset.initialized = 'true';
  }
}

// --- 事件綁定：將所有子模組的事件集中綁定 ---
export function bindDetailEvents() {
  bindProgressEvents();
  bindCreateEvents();
  bindEditEvents();
  bindMaterialOverviewEvents();
  bindVendorManagementEvents();

  // ✨ EXISTING: Bind tab switching events with Material Overview support
  bindTabSwitchingWithMaterialOverview();

  // ✅ NEW: Bind tab switching for Alerts & Reports
  bindAlertsReportsTabEvents();
}

// ✨ EXISTING: Enhanced tab switching that supports Material Overview
function bindTabSwitchingWithMaterialOverview() {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Special handling for Material Overview tab
      if (target === 'overview' && !btn.dataset.initialized) {
        console.log('🚀 Initializing Material Overview via tab click...');
        initMaterialOverview();
        btn.dataset.initialized = 'true';
      }
    });
  });
}

// ✅ NEW: Bind events for Alerts & Reports tabs
function bindAlertsReportsTabEvents() {
  const alertsTab = document.querySelector('.tab-btn[data-tab="alerts"]');
  const reportsTab = document.querySelector('.tab-btn[data-tab="reports"]');

  if (alertsTab) {
    alertsTab.addEventListener('click', () => {
      console.log('🚨 Alerts tab clicked - refreshing alerts...');
      AlertsManager.loadAlerts();
    });
  }

  if (reportsTab) {
    reportsTab.addEventListener('click', () => {
      console.log('📊 Reports tab clicked');
      // Reports render on demand when user clicks generate button
    });
  }
}

// ✨ EXISTING: Alternative function for auto-initializing Material Overview on page load
export function renderDetailWithAutoInit(p) {
  // Update state
  state.currentProject = p;

  const detailTitle = document.getElementById("detailTitle");
  const detailMeta = document.getElementById("detailMeta");

  // Update page title and metadata
  detailTitle.textContent = p.name || "專案細項";
  detailMeta.textContent = `Owner：${p.owner || "-"}　｜　Tags：${Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "-"}`;

  // Set default active tab
  setActiveTab("progress");

  // Initialize all tabs
  syncProgressDates();
  renderProgress('all');
  syncCreateSelectors();
  syncEditSelectors();
  renderMaterialsTable();

  // ✨ EXISTING: Auto-initialize Material Overview on page load (not lazy)
  console.log('🚀 Auto-initializing Material Overview...');
  initMaterialOverview();

  // Mark as initialized
  const overviewTab = document.querySelector('.tab-btn[data-tab="overview"]');
  if (overviewTab) {
    overviewTab.dataset.initialized = 'true';
  }

  // ✅ NEW: Initialize Alerts & Reports
  initAlertsAndReports(p.id);

  console.log("✅ Detail page rendered with Material Overview auto-initialized and Alerts & Reports");
}

// ✨ EXISTING: Force refresh Material Overview
export function refreshMaterialOverview() {
  const overviewTab = document.querySelector('.tab-btn[data-tab="overview"]');

  if (overviewTab?.dataset.initialized === 'true') {
    console.log('🔄 Refreshing Material Overview...');
    initMaterialOverview();
  }
}

// ✅ NEW: Force refresh Alerts (call this after updating materials/work items)
export function refreshAlerts() {
  console.log('🔄 Refreshing Alerts...');
  AlertsManager.loadAlerts();
}

/** 
 * ✨ EXISTING: 重新獲取專案細節數據，更新前端狀態，並重新渲染所有頁籤 
 * @param {string} projectId - 當前專案ID
 * @param {string} activeTab - 刷新完成後應切換到的目標頁籤
 */
async function refreshDetailData(projectId, activeTab = 'progress') {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    const result = await response.json();

    if (result.success && result.project) {
      state.currentProject = result.project;

      // 重新渲染/同步所有依賴於 state.currentProject 的頁面元素
      syncProgressDates();
      renderProgress('all');
      syncCreateSelectors();
      syncEditSelectors();
      renderMaterialsTable();

      // ✅ NEW: Refresh Alerts after data update
      AlertsManager.loadAlerts();

      setActiveTab(activeTab);
    } else {
      console.error("Failed to refresh detail data:", result.message);
      alert(`資料刷新失敗: ${result.message}`);
    }
  } catch (error) {
    console.error("Refresh fetch failed:", error);
    alert('網路錯誤，無法刷新資料。');
  }
}

// --- 匯出供外部 (router, common) 呼叫 ---
export {
  renderProgress,
  renderMaterialsTable,
  syncCreateSelectors,
  syncEditSelectors,
  renderMaterialOverview,
  renderVendorManagement,
  initMaterialOverview,
  refreshDetailData,
  AlertsManager,
  ReportsManager,
  initRFQ
};