// js/pages/detail/edit.js

import { state } from '../../app.js';
import { renderProgress } from './progress.js';
import { renderMaterialsTable } from './materials.js';
import { setActiveTab } from '../common.js';
import { WORK_STATUS, MAT_STATUS } from '../../constants.js';

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
 * @param {string} dateStr - YYYY-MM-DD 格式的日期字串
 * @param {number} workIdx - 工項索引
 */
function syncEditMaterialOptions(dateStr, workIdx) {
    const { editMatSel, editMatStatus } = getEditElements();
    const proj = state.currentProject;
    const node = (proj.progress || []).find(pNode =>
        pNode.date.split('T')[0] === dateStr // 確保日期格式匹配
    );

    // 2. 獲取工項節點
    const work = node?.items?.[workIdx];
    const mats = work?.materials || [];
    if (editMatSel) {
        // 填充建材選項 (選項值應該是材料的索引)
        editMatSel.innerHTML = mats.map((m, idx) => `<option value="${idx}">${m.name}</option>`).join("");
    }

    // 3. 同步建材狀態
    if (mats.length && editMatStatus) {
        editMatStatus.value = String(mats[0].mstatus ?? 2);
    }
    else if (editMatStatus) {
        editMatStatus.value = "2"; // 預設未叫貨
    }
}

/**
 * 同步編輯工項的工項下拉選單
 * @param {string} dateStr - YYYY-MM-DD 格式的日期字串
 */
function syncEditWorkOptions(dateStr) {
    const { editWorkSel, editStatus } = getEditElements();
    const proj = state.currentProject;
    const node = (proj.progress || []).find(pNode =>
        pNode.date.split('T')[0] === dateStr
    );
    const items = node?.items || [];

    if (editWorkSel) {
        editWorkSel.innerHTML = items.map((it, idx) => `<option value="${idx}">${it.name}</option>`).join("");
        let wIdx = parseInt(editWorkSel.value || "0", 10) || 0;
        if (items.length && editStatus) { editStatus.value = String(items[wIdx].status ?? 1); }
        // 確保在工項選項同步後，立即同步建材選項       
        syncEditMaterialOptions(dateStr, wIdx);
    }
}

/** 同步編輯工項/建材的日期下拉選單 */
export function syncEditSelectors() {
    const { editDateSel } = getEditElements();
    const proj = state.currentProject; if (!proj) return;
    if (!proj) return;
    const dates = (proj.progress || [])
        .map(d => d.date.split('T')[0]);
    const uniqueDates = [...new Set(dates)].sort();
    if (editDateSel) {
        editDateSel.innerHTML = uniqueDates.map(d => `<option value="${d}">${d}</option>`).join("");

        syncEditWorkOptions(editDateSel.value);
    }
}

/** 綁定編輯功能事件 */
export function bindEditEvents() {
    const elements = getEditElements();
    const { editDateSel, editWorkSel, editStatus, editMatSel, editMatStatus, saveStatusBtn, saveMatStatusBtn } = elements;

    // 1. 編輯頁籤下拉選單變動 (日期)
    if (editDateSel) {
        editDateSel.onchange = () => {
            const d = editDateSel.value;
            syncEditWorkOptions(d);
        };
    }

    // 2. 編輯頁籤下拉選單變動 (工項)
    if (editWorkSel) {
        editWorkSel.onchange = () => {
            const d = editDateSel?.value;
            const wIdx = parseInt(editWorkSel.value || "0", 10) || 0;
            const proj = state.currentProject;
            const node = (proj.progress || []).find(x => x.date === d);
            const work = node?.items?.[wIdx];
            if (work && editStatus) editStatus.value = String(work.status ?? 1);
            syncEditMaterialOptions(d, wIdx);
        };
    }

    // 3. 編輯頁籤下拉選單變動 (建材) - 使用 addEventListener 更標準
    if (editMatSel) {
        editMatSel.addEventListener("change", () => {
            const d = editDateSel?.value;
            const wIdx = parseInt(editWorkSel?.value || "0", 10) || 0;
            const mIdx = parseInt(editMatSel.value || "0", 10) || 0;
            const proj = state.currentProject;
            const node = (proj.progress || []).find(x => x.date === d);
            const mat = node?.items?.[wIdx]?.materials?.[mIdx];
            if (mat && editMatStatus) editMatStatus.value = String(mat.mstatus ?? 2);
        });
    }

    // 4. 儲存工項狀態
    if (saveStatusBtn) {
        saveStatusBtn.onclick = async () => {
            const proj = state.currentProject;
            const d = editDateSel?.value;
            const idx = parseInt(editWorkSel?.value || "0", 10) || 0;
            const newStatus = parseInt(editStatus?.value, 10);

            if (!d || Number.isNaN(idx)) { alert("請選擇日期與工項"); return; }

            const node = (proj.progress || []).find(pNode => pNode.date.split('T')[0] === d);
            const work = node?.items?.[idx];

            if (!work || !work.id) { alert("工項不存在或 ID 遺失，請重新載入。"); return; } // 檢查 ID

            try {
                const response = await fetch(`/api/work-items/${work.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                const result = await response.json();

                if (result.success) {
                    alert("工項狀態儲存成功！");

                    work.status = newStatus;
                    renderProgress(d);
                    setActiveTab("progress");

                } else {
                    alert(`更新失敗: ${result.message}`);
                }
            } catch (error) {
                console.error('Status Update Fetch Error:', error);
                alert('網路錯誤，無法更新狀態。');
            }
        };
    }

    // 5. 儲存建材狀態
    if (saveMatStatusBtn) {
        saveMatStatusBtn.onclick = async () => {
            const proj = state.currentProject;
            const d = editDateSel?.value;
            const wIdx = parseInt(editWorkSel?.value || "0", 10) || 0;
            const mIdx = parseInt(editMatSel?.value || "0", 10) || 0;
            const newMStatus = parseInt(editMatStatus?.value, 10); // 獲取新的狀態值

            if (!d || Number.isNaN(wIdx) || Number.isNaN(mIdx)) { alert("請選擇日期/工項/建材"); return; }

            // 查找建材節點 (需要前面修復過的日期格式化邏輯)
            const node = (proj.progress || []).find(pNode => pNode.date.split('T')[0] === d);
            const work = node?.items?.[wIdx];
            const mat = work?.materials?.[mIdx];

            if (!mat || !mat.id) { alert("建材紀錄不存在或 ID 遺失，請重新載入。"); return; }

            try {
                const response = await fetch(`/api/materials-used/${mat.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newMStatus })
                });
                const result = await response.json();

                if (result.success) {
                    alert("建材狀態儲存成功！");

                    mat.mstatus = newMStatus;
                    renderProgress(d); // 重新渲染進度
                    renderMaterialsTable(); // 重新渲染材料總管
                    setActiveTab("materials"); // 切換到材料總管顯示即時變化

                    // --- Check if Status is Arrived (0) and Trigger Rating ---
                    if (newMStatus === 0 && mat.vendor) {
                        showRatingModal(mat.vendor, mat.name, proj.id);
                    }

                } else {
                    alert(`更新失敗: ${result.message}`);
                }
            } catch (error) {
                console.error('Material Status Update Fetch Error:', error);
                alert('網路錯誤，無法更新建材狀態。');
            }
        };
    }
}

// --- Dynamic Rating Modal Logic ---

function injectModalAssets() {
    if (document.getElementById("rating-modal-style")) return;

    const style = document.createElement('style');
    style.id = "rating-modal-style";
    style.textContent = `
        .modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; pointer-events: none; transition: opacity 0.3s;
        }
        .modal-overlay.active { opacity: 1; pointer-events: auto; }
        .modal-content {
            background: white; padding: 30px; border-radius: 15px;
            width: 90%; max-width: 500px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
        }
        .modal-stars { font-size: 2.5em; color: #ccc; cursor: pointer; margin: 15px 0; }
        .modal-stars span { transition: color 0.2s; }
        .modal-stars span.active { color: #FFD700; }
        .modal-actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
    `;
    document.head.appendChild(style);

    const modalHTML = `
        <div id="rating-modal" class="modal-overlay">
            <div class="modal-content">
                <h3 id="rm-vendor">Rate Vendor</h3>
                <p id="rm-material" class="muted" style="margin-bottom: 15px;"></p>
                
                <div class="modal-stars" id="rm-stars">
                    <span data-val="1">★</span><span data-val="2">★</span><span data-val="3">★</span><span data-val="4">★</span><span data-val="5">★</span>
                </div>
                <input type="hidden" id="rm-rating-val" value="0">
                
                <textarea id="rm-comment" class="input" rows="3" placeholder="Optional comments..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;"></textarea>
                
                <div class="modal-actions">
                    <button id="rm-cancel" class="btn" style="background: #eee; color: #333;">Skip</button>
                    <button id="rm-submit" class="btn-primary">Submit Rating</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Bind Events
    const stars = document.querySelectorAll("#rm-stars span");
    const valInput = document.getElementById("rm-rating-val");
    stars.forEach(s => {
        s.onclick = () => {
            const val = parseInt(s.dataset.val);
            valInput.value = val;
            stars.forEach(st => st.classList.toggle('active', parseInt(st.dataset.val) <= val));
        };
    });

    document.getElementById("rm-cancel").onclick = closeRatingModal;
}

function showRatingModal(vendor, material, projectId) {
    injectModalAssets();

    const modal = document.getElementById("rating-modal");
    document.getElementById("rm-vendor").textContent = `Rate Vendor: ${vendor}`;
    document.getElementById("rm-material").textContent = `Material: ${material}`;
    document.getElementById("rm-rating-val").value = 0;
    document.getElementById("rm-comment").value = "";
    document.querySelectorAll("#rm-stars span").forEach(s => s.classList.remove('active'));

    // Re-bind submit to include closure variables
    const submitBtn = document.getElementById("rm-submit");
    submitBtn.onclick = async () => {
        const rating = parseInt(document.getElementById("rm-rating-val").value);
        const comment = document.getElementById("rm-comment").value;

        if (!rating) { alert("Please select a star rating."); return; }

        try {
            const response = await fetch('/api/vendor-ratings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor_name: vendor,
                    rating: rating,
                    comment: comment,
                    project_id: projectId
                })
            });
            const res = await response.json();
            if (res.success) {
                alert("Rating submitted! Thank you.");
                closeRatingModal();
            } else {
                alert("Failed: " + res.message);
            }
        } catch (e) {
            console.error(e);
            alert("Error submitting rating.");
        }
    };

    modal.classList.add("active");
}

function closeRatingModal() {
    const modal = document.getElementById("rating-modal");
    if (modal) modal.classList.remove("active");
}