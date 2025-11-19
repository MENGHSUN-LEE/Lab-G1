// js/pages/detail.js

import { state } from '../app.js';
import { WORK_STATUS, MAT_STATUS } from '../data.js';
import { setActiveTab, getWorkStatusClass, getMatStatusClass } from './common.js';

// --- 元素快取 (Cache Elements) ---
const detailTitle  = document.getElementById("detailTitle");
const detailMeta   = document.getElementById("detailMeta");
const progressContainer = document.getElementById("progressContainer");
const materialsTableTbody = document.querySelector("#materialsTable tbody");

// 進度日期選單
const progressDateSelector = document.getElementById("progressDateSelector");

// 新增工項/建材
const createDate = document.getElementById("create-date");
const createWorkName = document.getElementById("create-work-name");
const createStartTime = document.getElementById("create-start-time");
const matDateSel = document.getElementById("mat-date");
const matWorkSel = document.getElementById("mat-work");
const matName = document.getElementById("mat-name");
const matVendor = document.getElementById("mat-vendor");
const matQty = document.getElementById("mat-qty");
const matUnit = document.getElementById("mat-unit");

// 編輯工項/建材
const editDateSel = document.getElementById("edit-date");
const editWorkSel = document.getElementById("edit-work");
const editStatus = document.getElementById("edit-status");
const editMatSel = document.getElementById("edit-material");
const editMatStatus = document.getElementById("edit-mstatus");

// --- 頁面主渲染 ---

/**
 * 渲染專案細項頁面的主要資訊
 * @param {Object} p - 專案物件
 */
export function renderDetail(p){
  detailTitle.textContent = p.name;
  detailMeta.textContent  = `Owner：${p.owner}　｜　Tags：${p.tags.join(", ")}`;
  setActiveTab("progress"); // 預設顯示進度頁籤
  syncProgressDates();
  renderProgress('all'); 
  syncCreateSelectors();
  syncEditSelectors();
  renderMaterialsTable();
}

// 同步進度頁籤的日期選單
function syncProgressDates() {
    const proj = state.currentProject;
    const dates = (proj.progress || []).map(d => d.date).sort((a,b)=> b.localeCompare(a)); 

    let options = `<option value="all">-- Show All Dates --</option>`;
    options += dates.map(d => `<option value="${d}">${d}</option>`).join("");
    
    progressDateSelector.innerHTML = options;
}

// --- 專案進度 (Progress) ---

/** 渲染專案進度區塊
 * @param {string} dateFilter - 要顯示的日期字串，或 'all'
 */

/** 渲染專案進度區塊 */
export function renderProgress(dateFilter){
  const proj = state.currentProject;
  progressContainer.innerHTML = "";
  if(!proj?.progress?.length){ progressContainer.innerHTML = "<div class='muted'>No Progress Items.</div>"; return; }

  let dates = [...proj.progress].sort((a,b)=> a.date.localeCompare(b.date)); // 確保日期是升序

  // **根據 dateFilter 過濾要顯示的日期**
  if (dateFilter && dateFilter !== 'all') {
    dates = dates.filter(d => d.date === dateFilter);
  } else if (dateFilter === 'all') {
    // 預設顯示所有日期，不需要額外過濾
  }

  // 如果過濾後沒有資料
  if (!dates.length) {
    progressContainer.innerHTML = `<div class='muted'>No progress data found for the selected date.</div>`;
    return;
  }
  
  // 渲染篩選或排序後的日期
  dates.forEach(d=>{
    const div = document.createElement("div");
    div.className = "date-block";
    div.innerHTML = `<h4 class="date-title"> ${d.date}</h4>`;
    
    (d.items||[]).forEach(it=>{
      const w = document.createElement("div");
      w.className = "work-item";
      w.innerHTML = `
        <div>
          <div style="font-weight:600;">${it.name}</div>
          <div class="muted">
            Start Time：${it.start}　|　Status：
            <span class="badge ${getWorkStatusClass(it.status)}">${WORK_STATUS[it.status] ?? "-"}</span>
          </div>
        </div>
        <div style="margin-top:8px;">
          <table class="table">
            <thead><tr><th>Material Detail</th><th>Vendor</th><th>Quantity</th><th>Unit</th><th>Status</th></tr></thead>
            <tbody>
              ${(it.materials||[]).map(m=>`
                <tr>
                  <td>${m.name}</td><td>${m.vendor||"-"}</td><td>${m.qty}</td><td>${m.unit||"-"}</td>
                  <td><span class="badge ${getMatStatusClass(m.mstatus)}">${MAT_STATUS[m.mstatus] ?? "-"}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
      div.appendChild(w);
    });
    progressContainer.appendChild(div);
  });
}

// --- 材料總管 (Materials) ---

/** 渲染材料總管表格 */
export function renderMaterialsTable(){
  const proj=state.currentProject;
  const rows=[];
  
  (proj.progress||[]).forEach(dn=>{
    (dn.items||[]).forEach(it=>{
      (it.materials||[]).forEach(m=>{
        rows.push({ name:m.name, vendor:m.vendor, qty:m.qty, unit:m.unit,
          status: MAT_STATUS[m.mstatus] ?? "-", date:dn.date, work:it.name });
      });
    });
  });
  
  materialsTableTbody.innerHTML = rows.length
    ? rows.map(r=>`<tr>
        <td>${r.name}</td><td>${r.vendor||"-"}</td><td>${r.qty}</td>
        <td>${r.unit||"-"}</td><td>${r.status}</td><td>${r.date}</td><td>${r.work}</td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="muted">尚無建材資料</td></tr>`;
}

// --- 新增 (Create) 邏輯 ---

/** 同步新增建材的日期下拉選單 */
export function syncCreateSelectors(){
  const proj=state.currentProject; if(!proj) return;
  const dates=(proj.progress||[]).map(d=>d.date);
  matDateSel.innerHTML = dates.map(d=>`<option value="${d}">${d}</option>`).join("");
  syncCreateWorkOptions(matDateSel.value);
}

/**
 * 同步新增建材的工項下拉選單
 * @param {string} dateStr - 日期字串
 */
function syncCreateWorkOptions(dateStr){
  const proj=state.currentProject;
  const node=(proj.progress||[]).find(d=>d.date===dateStr);
  const items=node?.items||[];
  matWorkSel.innerHTML = items.map((it,idx)=>`<option value="${idx}">${it.name}</option>`).join("");
}

// --- 編輯 (Edit) 邏輯 ---

/** 同步編輯工項/建材的日期下拉選單 */
export function syncEditSelectors(){
  const proj=state.currentProject; if(!proj) return;
  const dates=(proj.progress||[]).map(d=>d.date);
  editDateSel.innerHTML = dates.map(d=>`<option value="${d}">${d}</option>`).join("");
  syncEditWorkOptions(editDateSel.value);
}

/**
 * 同步編輯工項的工項下拉選單
 * @param {string} dateStr - 日期字串
 */
function syncEditWorkOptions(dateStr){
  const proj=state.currentProject;
  const node=(proj.progress||[]).find(d=>d.date===dateStr);
  const items=node?.items||[];
  editWorkSel.innerHTML = items.map((it,idx)=>`<option value="${idx}">${it.name}</option>`).join("");
  // 同步工項狀態和建材選單
  if(items.length){ editStatus.value = String(items[0].status ?? 1); }
  syncEditMaterialOptions(dateStr, 0);
}

/**
 * 同步編輯建材的建材下拉選單
 * @param {string} dateStr - 日期字串
 * @param {number} workIdx - 工項索引
 */
function syncEditMaterialOptions(dateStr, workIdx){
  const proj=state.currentProject;
  const node=(proj.progress||[]).find(d=>d.date===dateStr);
  const work=node?.items?.[workIdx];
  const mats=work?.materials||[];
  editMatSel.innerHTML = mats.map((m,idx)=>`<option value="${idx}">${m.name}</option>`).join("");
  // 同步建材狀態
  if(mats.length){ editMatStatus.value = String(mats[0].mstatus ?? 2); }
  else { editMatStatus.value = "2"; } // 預設未叫貨
}

// --- 事件綁定 ---

export function bindDetailEvents(){
  // **新增：進度日期選單變動事件**
  progressDateSelector?.addEventListener("change", (e) => {
      renderProgress(e.target.value);
  });

  // 新增工項
  document.getElementById("addWorkBtn").onclick = ()=>{
    const proj = state.currentProject;
    const d = (createDate.value||"").trim();
    const name = (createWorkName.value||"").trim();
    const start = (createStartTime.value||"08:00").trim();
    const statusDefault = 1; // 正常
    if(!d || !name){ alert("請填寫 日期 與 工項名稱"); return; }
    
    let dateNode = (proj.progress||[]).find(x=>x.date===d);
    if(!dateNode){ 
      if(!proj.progress) proj.progress=[]; 
      dateNode={date:d,items:[]}; 
      proj.progress.push(dateNode); 
    }
    dateNode.items.push({ name, start, status: statusDefault, materials: [] });
    
    createWorkName.value = "";
    syncProgressDates(); 
    progressDateSelector.value = d;
    renderProgress(d); 
    syncCreateSelectors(); 
    setActiveTab("progress");
  };

  // 新增建材
  document.getElementById("addMaterialBtn").onclick = ()=>{
    const proj = state.currentProject;
    const d = matDateSel.value;
    const workIdx = parseInt(matWorkSel.value,10);
    if(!d || Number.isNaN(workIdx)){ alert("請選擇日期與工項"); return; }
    const name = (matName.value||"").trim();
    if(!name){ alert("請填寫建材名稱"); return; }
    const vendor = (matVendor.value||"").trim();
    const qty = Number(matQty.value||0);
    const unit = (matUnit.value||"").trim();
    const mstatusDefault = 2; // 未叫貨
    
    const dateNode = proj.progress.find(x=>x.date===d);
    const work = dateNode?.items?.[workIdx];
    if(!work) { alert("找不到工項節點"); return; }

    if(!work.materials) work.materials=[];
    work.materials.push({ name, vendor, qty, unit, mstatus: mstatusDefault });
    
    matName.value=""; matVendor.value=""; matQty.value="0"; matUnit.value="";
    progressDateSelector.value = d; // 選中當前日期
    renderProgress(d); 
    renderMaterialsTable(); 
    setActiveTab("materials");
  };

  // 新增建材下拉選單變動
  matDateSel.onchange = ()=> syncCreateWorkOptions(matDateSel.value);


  // 儲存工項狀態
  document.getElementById("saveStatusBtn").onclick = ()=>{
    const proj=state.currentProject; if(!proj) return;
    const d=editDateSel.value;
    const idx=parseInt(editWorkSel.value,10);
    if(!d || Number.isNaN(idx)) { alert("請選擇日期與工項"); return; }
    
    const node=proj.progress.find(x=>x.date===d);
    const work=node?.items?.[idx];
    if(!work){ alert("工項不存在"); return; }
    
    work.status = parseInt(editStatus.value,10);
    renderProgress();
    setActiveTab("progress");
  };

  // 儲存建材狀態
  document.getElementById("saveMatStatusBtn").onclick = ()=>{
    const proj=state.currentProject; if(!proj) return;
    const d=editDateSel.value;
    const wIdx=parseInt(editWorkSel.value,10);
    const mIdx=parseInt(editMatSel.value,10);
    if(!d || Number.isNaN(wIdx) || Number.isNaN(mIdx)){ alert("請選擇日期/工項/建材"); return; }
    
    const node=proj.progress.find(x=>x.date===d);
    const work=node?.items?.[wIdx];
    const mat=work?.materials?.[mIdx];
    if(!mat){ alert("建材不存在"); return; }
    
    mat.mstatus = parseInt(editMatStatus.value,10);
    renderProgress();
    renderMaterialsTable();
    setActiveTab("materials");
  };

  // 編輯頁籤下拉選單變動
  editDateSel.onchange = ()=>{
    const d = editDateSel.value;
    syncEditWorkOptions(d);
    const wIdx = parseInt(editWorkSel.value||"0",10) || 0;
    syncEditMaterialOptions(d, wIdx);
  };
  editWorkSel.onchange = ()=>{
    const d = editDateSel.value;
    const wIdx = parseInt(editWorkSel.value||"0",10) || 0;
    const proj=state.currentProject;
    const node=(proj.progress||[]).find(x=>x.date===d);
    const work=node?.items?.[wIdx];
    if(work) editStatus.value = String(work.status ?? 1);
    syncEditMaterialOptions(d, wIdx);
  };
  editMatSel?.addEventListener("change", ()=>{
    const d=editDateSel.value;
    const wIdx=parseInt(editWorkSel.value||"0",10)||0;
    const mIdx=parseInt(editMatSel.value||"0",10)||0;
    const proj=state.currentProject;
    const node=(proj.progress||[]).find(x=>x.date===d);
    const mat=node?.items?.[wIdx]?.materials?.[mIdx];
    if(mat) editMatStatus.value = String(mat.mstatus ?? 2);
  });
}