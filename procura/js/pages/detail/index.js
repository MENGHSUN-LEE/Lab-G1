// js/pages/detail/index.js

import { state } from '../../app.js';
import { setActiveTab } from '../common.js';
import { renderProgress, syncProgressDates, bindProgressEvents } from './progress.js';
import { renderMaterialsTable } from './materials.js';
import { syncCreateSelectors, bindCreateEvents } from './create.js';
import { syncEditSelectors, bindEditEvents } from './edit.js';
import { bindMaterialOverviewEvents, renderMaterialOverview } from './material_overview.js';
import { bindVendorManagementEvents, renderVendorManagement } from './vendor_management.js';

// ✨ NEW: Import Steven's Material Overview feature
import { initMaterialOverview } from '../material/overview.js';

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
  
  // ✨ NEW: Setup Material Overview tab lazy loading
  setupMaterialOverviewTab();
  
  console.log("✅ Detail page rendered with all features");
}

// ✨ NEW: Setup Material Overview tab with lazy initialization
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
  
  // ✨ NEW: Bind tab switching events with Material Overview support
  bindTabSwitchingWithMaterialOverview();
}

// ✨ NEW: Enhanced tab switching that supports Material Overview
function bindTabSwitchingWithMaterialOverview() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    // Check if this button already has a click listener from setActiveTab
    // We'll add an additional listener specifically for Material Overview
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

// ✨ OPTIONAL: Alternative function for auto-initializing Material Overview on page load
// Use this if you want Material Overview to load immediately when detail page opens
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
  
  // ✨ Auto-initialize Material Overview on page load (not lazy)
  console.log('🚀 Auto-initializing Material Overview...');
  initMaterialOverview();
  
  // Mark as initialized
  const overviewTab = document.querySelector('.tab-btn[data-tab="overview"]');
  if (overviewTab) {
    overviewTab.dataset.initialized = 'true';
  }
  
  console.log("✅ Detail page rendered with Material Overview auto-initialized");
}

// ✨ NEW: Force refresh Material Overview (useful after data updates)
export function refreshMaterialOverview() {
  const overviewTab = document.querySelector('.tab-btn[data-tab="overview"]');
  
  if (overviewTab?.dataset.initialized === 'true') {
    console.log('🔄 Refreshing Material Overview...');
    initMaterialOverview();
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
  initMaterialOverview  // ✨ Export for external use
};