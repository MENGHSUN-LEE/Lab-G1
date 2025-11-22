// js/pages/detail/edit.js

import { state } from '../../app.js';
import { renderProgress } from './progress.js';
import { renderMaterialsTable } from './materials.js';
import { setActiveTab } from '../common.js';
import { WORK_STATUS, MAT_STATUS } from '../../constants.js';

// ⚠️ 確保所有元素查找都發生在函式內部
function getEditElements() {
    return {
        editDateSel: document.getElementById("edit-date"),     // 檢查 ID
        editWorkSel: document.getElementById("edit-work"),     // 檢查 ID
        editStatus: document.getElementById("edit-status"),
        editMatSel: document.getElementById("edit-material"),  // 檢查 ID
        editMatStatus: document.getElementById("edit-mstatus"),
        saveStatusBtn: document.getElementById("saveStatusBtn"),
        saveMatStatusBtn: document.getElementById("saveMatStatusBtn"),
    };
}

/**
 * 同步編輯建材的建材下拉選單
 * @param {string} dateStr - 日期字串
 * @param {number} workIdx - 工項索引
 */
function syncEditMaterialOptions(dateStr, workIdx){
  const { editMatSel } = getEditElements(); 
  const proj = state.currentProject;
  const node = (proj.progress||[]).find(x=>x.date===dateStr);
  const materials = node?.items?.[workIdx]?.materials||[];
  
  if (editMatSel) {
      editMatSel.innerHTML = materials.map((m,idx)=>`<option value="${idx}">${m.name}</option>`).join("");
  }
}

/**
 * 同步編輯工項的下拉選單選項
 * @param {string} dateStr - 日期字串
 */
function syncEditWorkOptions(dateStr){
  const { editWorkSel } = getEditElements(); 
  const proj = state.currentProject;
  const node = (proj.progress||[]).find(x=>x.date===dateStr);
  const items = node?.items||[];
  
  if (editWorkSel) {
      editWorkSel.innerHTML = items.map((it,idx)=>`<option value="${idx}">${it.name}</option>`).join("");
      
      // 確保在工項選項同步後，立即同步建材選項
      const wIdx = parseInt(editWorkSel.value||"0",10) || 0;
      syncEditMaterialOptions(dateStr, wIdx);
  }
}

/** 同步編輯工項/建材的日期下拉選單 */
export function syncEditSelectors(){
  const { editDateSel } = getEditElements(); // 動態取得元素
  const proj=state.currentProject; if(!proj) return;
  const dates=(proj.progress||[]).map(d=>d.date);
  
  if (editDateSel) { // 🚨 增加檢查
      editDateSel.innerHTML = dates.map(d=>`<option value="${d}">${d}</option>`).join(""); 
      syncEditWorkOptions(editDateSel.value);
  }
}

/** 綁定編輯功能事件 */
export function bindEditEvents(){
  const elements = getEditElements();
  const { editDateSel, editWorkSel, editStatus, editMatSel, editMatStatus, saveStatusBtn, saveMatStatusBtn } = elements;

  // 1. 編輯頁籤下拉選單變動 (日期)
  if (editDateSel) { // 🚨 增加空值檢查，解決 TypeError
      editDateSel.onchange = ()=>{ 
          const d = editDateSel.value;
          syncEditWorkOptions(d);
      };
  }

  // 2. 編輯頁籤下拉選單變動 (工項)
  if (editWorkSel) { // 🚨 增加空值檢查，解決 TypeError
      editWorkSel.onchange = ()=>{
          const d = editDateSel?.value;
          const wIdx = parseInt(editWorkSel.value||"0",10) || 0;
          const proj=state.currentProject;
          const node=(proj.progress||[]).find(x=>x.date===d);
          const work=node?.items?.[wIdx];
          if(work && editStatus) editStatus.value = String(work.status ?? 1);
          syncEditMaterialOptions(d, wIdx);
      };
  }
  
  // 3. 編輯頁籤下拉選單變動 (建材) - 使用 addEventListener 更標準
  if (editMatSel) { // 🚨 增加空值檢查，解決 TypeError
      editMatSel.addEventListener("change", ()=>{
          const d=editDateSel?.value;
          const wIdx=parseInt(editWorkSel?.value||"0",10)||0;
          const mIdx=parseInt(editMatSel.value||"0",10)||0;
          const proj=state.currentProject;
          const node=(proj.progress||[]).find(x=>x.date===d);
          const mat=node?.items?.[wIdx]?.materials?.[mIdx];
          if(mat && editMatStatus) editMatStatus.value = String(mat.mstatus ?? 2);
      });
  }
  
  // 4. 儲存工項狀態
  if (saveStatusBtn) {
      saveStatusBtn.onclick = ()=>{
          const proj = state.currentProject;
          const d = editDateSel?.value;
          const wIdx = parseInt(editWorkSel?.value||"0",10)||0;
          if(!d || Number.isNaN(wIdx)){ alert("請選擇日期與工項"); return; }
          
          const node=proj.progress.find(x=>x.date===d);
          const work=node?.items?.[wIdx];
          if(!work){ alert("工項不存在"); return; }

          work.status = parseInt(editStatus?.value,10);
          renderProgress(d);
          setActiveTab("progress");
      };
  }

  // 5. 儲存建材狀態
  if (saveMatStatusBtn) {
      saveMatStatusBtn.onclick = ()=>{
          const proj = state.currentProject;
          const d = editDateSel?.value;
          const wIdx = parseInt(editWorkSel?.value||"0",10)||0;
          const mIdx = parseInt(editMatSel?.value||"0",10)||0;
          if(!d || Number.isNaN(wIdx) || Number.isNaN(mIdx)){ alert("請選擇日期/工項/建材"); return; }
          
          const node=proj.progress.find(x=>x.date===d);
          const work=node?.items?.[wIdx];
          const mat=work?.materials?.[mIdx];
          if(!mat){ alert("建材不存在"); return; }
          
          mat.mstatus = parseInt(editMatStatus?.value,10);
          renderProgress(d);
          renderMaterialsTable();
          setActiveTab("materials");
      };
  }
}