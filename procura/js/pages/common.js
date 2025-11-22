// js/pages/common.js

import { WORK_STATUS, MAT_STATUS } from '../constants.js'; 
import { state } from '../app.js';
import { renderMaterialsTable, syncCreateSelectors, syncEditSelectors } from './detail/index.js';

/** 根據工項狀態值返回 CSS 類別 */
export function getWorkStatusClass(status){
    switch(status){
        case 0: return "badge-ahead"; // 提前
        case 1: return "badge-normal"; // 正常
        case 2: return "badge-delayed"; // 延後
        default: return "";
    }
}

/** 根據建材狀態值返回 CSS 類別 */
export function getMatStatusClass(mstatus){
    switch(mstatus){
        case 0: return "badge-mat-arrived"; // 已到貨
        case 1: return "badge-mat-ordered"; // 已叫貨
        case 2: return "badge-mat-pending"; // 未叫貨
        case 3: return "badge-mat-enroute"; // 已叫貨但未抵達
        default: return "";
    }
}

/**
 * 設定專案細項頁面的 active Tab
 * @param {string} key - 欲啟動的 tab key (progress, create, edit, materials)
 */
export function setActiveTab(key){
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active", b.dataset.tab===key));
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
  document.getElementById(`tab-${key}`).classList.add("active");
  
  // 根據 Tab 執行不同的渲染/同步動作
  if(key==="materials") renderMaterialsTable();
  if(key==="create")   syncCreateSelectors();
  if(key==="edit")     syncEditSelectors();
  // 'progress' tab 只需要在頁面載入時 (renderDetail) 渲染，切換 tab 時通常不需重複渲染
}

/** 綁定 Tab 按鈕事件 */
export function bindTabEvents(){
  document.querySelectorAll(".tab-btn").forEach(btn=> btn.onclick=()=> setActiveTab(btn.dataset.tab));
}