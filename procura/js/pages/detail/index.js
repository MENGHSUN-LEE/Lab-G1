// js/pages/detail/index.js

import { state } from '../../app.js';
import { setActiveTab } from '../common.js';
import { renderProgress, syncProgressDates, bindProgressEvents } from './progress.js';
import { renderMaterialsTable } from './materials.js';
import { syncCreateSelectors, bindCreateEvents } from './create.js';
import { syncEditSelectors, bindEditEvents } from './edit.js';

// --- 元素快取 (只保留共用元素) ---
const detailTitle  = document.getElementById("detailTitle");
const detailMeta   = document.getElementById("detailMeta");

// --- 頁面主渲染 ---
export function renderDetail(p){
  const detailTitle  = document.getElementById("detailTitle");
  const detailMeta   = document.getElementById("detailMeta");
  
  detailTitle.textContent = p.name;
  detailMeta.textContent  = `Owner：${p.owner}　｜　Tags：${p.tags.join(", ")}`;
  setActiveTab("progress"); // 預設顯示進度頁籤
  
  // 同步所有需要初始化的 UI
  syncProgressDates();
  renderProgress('all'); 
  syncCreateSelectors();
  syncEditSelectors();
  renderMaterialsTable(); // 初始化材料總管數據
}

// --- 事件綁定：將所有子模組的事件集中綁定 ---

export function bindDetailEvents(){
  bindProgressEvents();
  bindCreateEvents();
  bindEditEvents();
  // 注意：materials.js 和 index.js 本身沒有新增的事件
}

// --- 匯出供外部 (router, common) 呼叫 ---
export { renderProgress, renderMaterialsTable, syncCreateSelectors, syncEditSelectors };