// js/pages/detail/progress.js

import { state } from '../../app.js'; 
import { WORK_STATUS, MAT_STATUS } from '../../constants.js';
import { getWorkStatusClass, getMatStatusClass } from '../common.js';

/** 取得進度頁籤所需的 DOM 元素 */
function getProgressElements() {
    return {
        progressContainer: document.getElementById("progressContainer"),
        progressDateSelector: document.getElementById("progressDateSelector")
    };
}

/** 渲染專案進度區塊
 * @param {string} dateFilter - 要顯示的日期字串，或 'all'
 */
export function renderProgress(dateFilter){
  const proj = state.currentProject;
  const { progressContainer } = getProgressElements();
  
  progressContainer.innerHTML = "";

  if(!proj?.progress?.length){ 
      progressContainer.innerHTML = "<div class='muted'>No Progress Items.</div>"; 
      return; 
  }

  let dates = [...proj.progress].sort((a,b)=> a.date.localeCompare(b.date));

  // 根據 dateFilter 過濾要顯示的日期
  if (dateFilter && dateFilter !== 'all') {
    dates = dates.filter(d => d.date.split('T')[0] === dateFilter); 
  } else if (dateFilter === 'all') {
  }

  if (!dates.length) {
    progressContainer.innerHTML = `<div class='muted'>No progress data found for the selected date.</div>`;
    return;
  }
  
  // 渲染篩選或排序後的日期
  dates.forEach(d=>{
    const div = document.createElement("div");
    div.className = "date-block";
    const displayDate = d.date.split('T')[0]; 
    
    div.innerHTML = `<h4 class="date-title"> ${displayDate}</h4>`;
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

/** 同步進度頁籤的日期選單 */
export function syncProgressDates() {
    const { progressDateSelector } = getProgressElements();
    
    const proj = state.currentProject;
    const dates = (proj.progress || [])
        .map(d => d.date.split('T')[0]) 
        .sort((a,b)=> b.localeCompare(a));

    let options = `<option value="all">-- Show All Dates --</option>`;
    options += dates.map(d => `<option value="${d}">${d}</option>`).join("");
    
    if (progressDateSelector) {
        progressDateSelector.innerHTML = options;
    }
}

/** 綁定進度日期選單變動事件 */
export function bindProgressEvents() {
    const { progressDateSelector } = getProgressElements();
    
    progressDateSelector?.addEventListener("change", (e) => {
        renderProgress(e.target.value);
    });
}