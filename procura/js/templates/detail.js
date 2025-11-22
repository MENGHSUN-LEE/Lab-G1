// js/templates/detail.js

/** 匯出專案細項頁面的 HTML 結構 */
export const detailTemplate = `
    <section id="page-detail" class="card stack hidden">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <h2 id="detailTitle">專案細項</h2>
        <button class="btn" data-nav="#search"><span class="material-symbols-outlined">arrow_back</span> Back</button>
      </div>
      <p class="muted" id="detailMeta"></p>

      <div class="tabs">
    <button class="tab-btn active" data-tab="progress">Project Progress</button>
    <button class="tab-btn" data-tab="create">Add Item</button>
    <button class="tab-btn" data-tab="edit">Edit Item</button>
    <button class="tab-btn" data-tab="materials">Materials Management</button>
</div>

<div id="tab-progress" class="tab-panel active">
    <div class="stack" style="width: 250px; margin-bottom: 20px;">
        <label for="progressDateSelector">Filter by Date</label>
        <select id="progressDateSelector"></select>
    </div>

    <div id="progressContainer" class="stack"></div>
</div>

<div id="tab-create" class="tab-panel">
    <h3>Add Work Item</h3>
    <div class="grid cols-3">
        <div class="stack"><label>Date</label><input type="date" id="create-date" /></div>
        <div class="stack"><label>Item Name</label><input type="text" id="create-work-name" /></div>
        <div class="stack"><label>Start Time</label><input type="time" id="create-start-time" value="08:00" /></div>
        <div class="stack align-end"><button id="addWorkBtn" class="btn-primary">Add Work Item</button></div>
    </div>

    <hr />

    <h3>Add Material</h3>
    <div class="grid cols-3">
        <div class="stack"><label>Date</label><select id="mat-date"></select></div>
        <div class="stack"><label>Work Item</label><select id="mat-work"></select></div>
        <div class="stack"><label>Material Category</label><select id="mat-category"></select></div> 
        <div class="stack"><label>Material</label>
            <input 
                type="text" 
                id="mat-name" 
                list="material-options" 
                placeholder="Enter or select material name" 
            />
            <datalist id="material-options"></datalist>
        </div>
        <div class="stack"><label>Supplier</label>
            <input 
                type="text" 
                id="mat-vendor" 
                list="vendor-options" 
                placeholder="Select or enter supplier name" 
            />
            <datalist id="vendor-options"></datalist>
        </div>
        <div class="stack"><label>Quantity</label><input type="number" id="mat-qty" value="0" min="0" /></div>
        <div class="stack"><label>Unit</label><input type="text" id="mat-unit" placeholder="kg / L" /></div>
        <div class="stack align-end"><button id="addMaterialBtn" class="btn-primary">Add Material</button></div>
    </div>
    <p class="muted">（Default status for new material: Pending Order）</p>
</div>

      <div id="tab-edit" class="tab-panel">
        <h3>編輯工項狀態</h3>
        <div class="grid cols-3">
          <div class="stack"><label>日期</label><select id="edit-date"></select></div>
          <div class="stack"><label>工項</label><select id="edit-work"></select></div>
          <div class="stack"><label>狀態</label>
            <select id="edit-status">
              <option value="0">0. 提前</option>
              <option value="1">1. 正常</option>
              <option value="2">2. 延後</option>
            </select>
          </div>
          <div class="stack align-end"><button id="saveStatusBtn" class="btn-primary">儲存狀態</button></div>
        </div>

        <hr />

        <h3>編輯建材狀態</h3>
        <div class="grid cols-3">
          <div class="stack"><label>建材</label><select id="edit-material"></select></div>
          <div class="stack">
            <label>建材狀態</label>
            <select id="edit-mstatus">
              <option value="0">0. 已到貨</option>
              <option value="1">1. 已叫貨</option>
              <option value="2">2. 未叫貨</option>
              <option value="3">3. 已叫貨但未抵達</option>
            </select>
          </div>
          <div class="stack align-end"><button id="saveMatStatusBtn" class="btn-primary">儲存建材狀態</button></div>
        </div>
      </div>

      <div id="tab-materials" class="tab-panel">
        <table class="table" id="materialsTable">
          <thead>
            <tr>
              <th>建材細項</th>
              <th>供應商</th>
              <th>數量</th>
              <th>單位</th>
              <th>狀態</th>
              <th>日期</th>
              <th>工項</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
`;