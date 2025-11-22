// js/pages/detail/create.js

import { state } from '../../app.js';
import { renderProgress, syncProgressDates } from './progress.js';
import { renderMaterialsTable } from './materials.js';
import { setActiveTab } from '../common.js';
import { MATERIAL_CATEGORIES, WORK_STATUS, MAT_STATUS } from '../../constants.js';

let workItemsGroupedByDate = {}; 
let materialMasterList = [];

/** 取得新增頁面所有相關 DOM 元素 */
function getCreateElements() {
    return {
        createDate: document.getElementById("create-date"),
        createWorkName: document.getElementById("create-work-name"),
        createStartTime: document.getElementById("create-start-time"),
        matDateSel: document.getElementById("mat-date"),
        matWorkSel: document.getElementById("mat-work"),
        matCategorySel: document.getElementById("mat-category"),
        matName: document.getElementById("mat-name"),
        matDatalist: document.getElementById("material-options"),
        matVendorDatalist: document.getElementById("vendor-options"),
        matVendor: document.getElementById("mat-vendor"),
        matQty: document.getElementById("mat-qty"),
        matUnit: document.getElementById("mat-unit"),
        addWorkBtn: document.getElementById("addWorkBtn"),
        addMaterialBtn: document.getElementById("addMaterialBtn"),
        progressDateSelector: document.getElementById("progressDateSelector")
    };
}

/**
 * 同步新增建材的工項下拉選單 (使用 API 緩存的數據)
 * @param {string} dateStr 
 */
function syncCreateWorkOptions(dateStr) {
    const { matWorkSel } = getCreateElements();
    const items = workItemsGroupedByDate[dateStr] || [];

    if (matWorkSel) {
        matWorkSel.innerHTML = items.map(it => `<option value="${it.id}">${it.name}</option>`).join("");
    }
}


/** 同步新增建材的日期/工項下拉選單 */
export async function syncCreateSelectors() {
    const { matDateSel, matCategorySel } = getCreateElements();
    const proj = state.currentProject;
    if (!proj?.id) return;

    // --- 1. 獲取工項資料 (Work Items) ---
    try {
        const response = await fetch(`/api/work-items/selectors?project_id=${proj.id}`);
        const result = await response.json();

        if (result.success) {
            workItemsGroupedByDate = result.data; // 緩存數據
            const dates = Object.keys(workItemsGroupedByDate).sort();

            if (matDateSel) {
                matDateSel.innerHTML = dates.map(d => `<option value="${d}">${d}</option>`).join("");
                // 載入第一個日期的工項選項
                syncCreateWorkOptions(matDateSel.value);
            }
        } else {
            console.error('Failed to load work item selectors:', result.message);
        }
    
    } catch (error) {
        console.error('Work Item Selector Fetch Error:', error);
    }

    if (matCategorySel) {
        let options = '<option value="0">-- 請選擇類別 --</option>'; 
        options += MATERIAL_CATEGORIES.map(c => 
            `<option value="${c.id}">${c.name}</option>`
        ).join("");
        
        matCategorySel.innerHTML = options;
        syncMaterialOptions(matCategorySel.value); 
    }
}

async function syncMaterialOptions(categoryId) {
    const { matDatalist } = getCreateElements();
    if (!matDatalist) return;

    // 選擇 "請選擇" 或無效 ID 時清空
    if (!categoryId || categoryId === '0') {
        matDatalist.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/api/materials?category_id=${categoryId}`);
        const result = await response.json();

        if (result.success && matDatalist) {
        materialMasterList = result.materials; 
        const options = result.materials.map(m => 
            `<option value="${m.Item_Description}"></option>`
        ).join('');
        matDatalist.innerHTML = options;   
        } else {
            matDatalist.innerHTML = `<option value="載入錯誤: ${result.message}"></option>`;
        }
    } catch (error) {
        console.error('Material Options Fetch Error:', error);
        matDatalist.innerHTML = '<option value="網路錯誤，無法載入建材清單"></option>';
    }
}

/** 綁定新增功能事件 */
export function bindCreateEvents(){
    const elements = getCreateElements();
    const { matDateSel, matWorkSel, matCategorySel, matName, matQty, matVendor, matUnit, matVendorDatalist, createDate, createWorkName, createStartTime, } = elements;

    if (matName) {
        matName.onchange = async () => {
            const selectedDescription = matName.value;
            // 從緩存中查找用戶選擇的 material_id
            const selectedMaterial = materialMasterList.find(m => m.Item_Description === selectedDescription);
            
            // 如果找不到匹配的建材，清空所有聯動欄位
            if (!selectedMaterial) {
                matUnit.value = '';
                matVendor.value = '';
                if (matVendorDatalist) matVendorDatalist.innerHTML = '';
                return;
            }

            // 呼叫 API 獲取單位和供應商列表
            try {
                const response = await fetch(`/api/material-details?material_id=${selectedMaterial.id}`);
                const result = await response.json();

                if (result.success) {
                    // 1. Autofill "單位"
                    matUnit.value = result.unit_name || '';

                    // 2. 填充 "供應商" datalist
                    if (matVendorDatalist && result.vendors?.length > 0) {
                        const vendorOptions = result.vendors.map(v => 
                            `<option value="${v}"></option>`
                        ).join('');
                        matVendorDatalist.innerHTML = vendorOptions;
                    } else if (matVendorDatalist) {
                        matVendorDatalist.innerHTML = '';
                        matVendor.value = '';
                    }
                }
            } catch (error) {
                console.error('Material Details Autofill Error:', error);
                alert('載入建材細節失敗。');
            }
        };
    }

    if (matDateSel) {
        matDateSel.onchange = () => syncCreateWorkOptions(matDateSel.value);
    }

    if (matCategorySel) {
      matCategorySel.onchange = () => {
          syncMaterialOptions(matCategorySel.value);
      };
      syncMaterialOptions(matCategorySel.value);
    }

    if (addWorkBtn) {
        addWorkBtn.onclick = async () => {
            const proj = state.currentProject;
            const d = (createDate?.value || "").trim();
            const name = (createWorkName?.value || "").trim();
            const start = (createStartTime?.value || "08:00").trim();

            if (!d || !name) { alert("請填寫 日期 與 工項名稱"); return; }
            if (!proj?.id) { alert("專案 ID 遺失，請重新載入專案。"); return; } // 檢查專案 ID

            const workData = {
                projectId: proj.id, // 傳遞專案 ID
                date: d,
                name: name,
                startTime: start,
                // status 預設為 1，不需要從前端傳遞
            };

            try {
                const response = await fetch('/api/work-items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workData)
                });

                const result = await response.json();

                if (result.success) {
                    alert(`工項 "${name}" 新增成功!`);

                    if (createWorkName) createWorkName.value = "";

                    location.hash = `#detail?id=${proj.id}`;

                } else {
                    alert(`新增失敗: ${result.message}`);
                }

            } catch (error) {
                console.error('Add Work Item Fetch Error:', error);
                alert('網路錯誤或伺服器無法連線。');
            }
        };
    }

    if (addMaterialBtn) {
      addMaterialBtn.onclick = async ()=>{
          const proj = state.currentProject;
          const d = matDateSel?.value;
          const workId = matWorkSel?.value;
          
          const name = (matName?.value||"").trim();
          const vendor = (matVendor?.value||"").trim();
          const qty = Number(matQty?.value||0);
          const unit = (matUnit?.value||"").trim();
          
          if(!workId || !name || qty <= 0){ 
              alert("請選擇日期/工項，並填寫有效的建材名稱與數量。"); 
              return; 
          }
          if(!proj?.id) { alert("專案 ID 遺失，請重新載入專案。"); return; }
          
          const materialData = {
              work_item_id: parseInt(workId, 10),
              material_name: name,
              vendor: vendor,
              qty: qty,
              unit: unit
          };

          try {
              const response = await fetch('/api/materials-used', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(materialData)
              });

              const result = await response.json();

              if (result.success) {
                  alert(`建材 "${name}" 新增成功!`);
                  
                  if(matName) matName.value=""; 
                  if(matVendor) matVendor.value=""; 
                  if(matQty) matQty.value="0"; 
                  if(matUnit) matUnit.value="";
                  
                  location.hash = `#detail?id=${proj.id}`;
                  
              } else {
                  alert(`新增建材失敗: ${result.message}`);
              }

          } catch (error) {
              console.error('Add Material Fetch Error:', error);
              alert('網路錯誤或伺服器無法連線。');
          }
      };
    }
}
