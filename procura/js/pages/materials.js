// js/pages/materials.js

// Material management data storage
const materialData = {
  qualityRecords: [],
  arrivalLogs: [],
  inventoryLevels: [],
  costAnalysis: []
};

export function bindMaterialEvents() {
  // Quality Score Save
  const qualityBtn = document.querySelector('#tab-materials .btn-success');
  if (qualityBtn) {
    qualityBtn.addEventListener('click', saveQualityScore);
  }

  // Arrival Log Save
  const arrivalBtns = document.querySelectorAll('#tab-materials .btn-success');
  if (arrivalBtns[1]) {
    arrivalBtns[1].addEventListener('click', saveArrivalLog);
  }

  // Stock Level Save
  const stockBtn = document.querySelector('#tab-materials .btn-warning');
  if (stockBtn) {
    stockBtn.addEventListener('click', saveStockLevel);
  }

  // Cost Analysis Save
  const costBtns = document.querySelectorAll('#tab-materials .btn-success');
  if (costBtns[2]) {
    costBtns[2].addEventListener('click', saveCostAnalysis);
  }

  // Auto-calculate total cost
  setupCostCalculation();
  
  // Auto-calculate delay days
  setupDelayCalculation();
}

function saveQualityScore() {
  const material = document.getElementById('quality-material').value;
  const score = document.getElementById('quality-score').value;
  const date = document.getElementById('quality-date').value;
  const notes = document.getElementById('quality-notes').value;

  if (!material || !date) {
    alert('請填寫材料名稱和檢驗日期');
    return;
  }

  const record = { material, score, date, notes, timestamp: Date.now() };
  materialData.qualityRecords.push(record);
  
  alert(`✓ 品質評分已儲存\n材料: ${material}\n評分: ${score}/10`);
  console.log('Quality records:', materialData.qualityRecords);
}

function saveArrivalLog() {
  const material = document.querySelector('#tab-materials input[placeholder="材料名稱..."]').value;
  const expected = document.querySelectorAll('#tab-materials input[type="date"]')[1].value;
  const actual = document.querySelectorAll('#tab-materials input[type="date"]')[2].value;

  if (!material || !expected) {
    alert('請填寫材料名稱和預計到貨日期');
    return;
  }

  const delayDays = actual && expected ? 
    Math.floor((new Date(actual) - new Date(expected)) / (1000 * 60 * 60 * 24)) : 0;

  const log = { material, expected, actual, delayDays, timestamp: Date.now() };
  materialData.arrivalLogs.push(log);
  
  alert(`✓ 進貨時間已記錄\n材料: ${material}\n${delayDays > 0 ? `延遲: ${delayDays}天` : '準時到貨'}`);
  console.log('Arrival logs:', materialData.arrivalLogs);
}

function saveStockLevel() {
  const material = document.querySelectorAll('#tab-materials input[placeholder="材料名稱..."]')[1].value;
  const current = document.querySelectorAll('#tab-materials input[type="number"]')[4].value;
  const safety = document.querySelectorAll('#tab-materials input[type="number"]')[5].value;
  const reorder = document.querySelectorAll('#tab-materials input[type="number"]')[6].value;

  if (!material) {
    alert('請填寫材料名稱');
    return;
  }

  const needsReorder = parseInt(current) <= parseInt(reorder);
  const level = { material, current, safety, reorder, needsReorder, timestamp: Date.now() };
  materialData.inventoryLevels.push(level);
  
  if (needsReorder) {
    alert(`⚠ 庫存警示\n材料: ${material}\n當前庫存: ${current}\n需要補貨!`);
  } else {
    alert(`✓ 庫存已更新\n材料: ${material}\n當前庫存: ${current}`);
  }
  
  console.log('Inventory levels:', materialData.inventoryLevels);
}

function saveCostAnalysis() {
  const material = document.querySelectorAll('#tab-materials input[placeholder="材料名稱..."]')[2].value;
  const unitPrice = document.querySelectorAll('#tab-materials input[placeholder]')[0].parentElement.nextElementSibling.querySelector('input').value;
  const quantity = document.querySelectorAll('#tab-materials input[placeholder]')[0].parentElement.nextElementSibling.nextElementSibling.querySelector('input').value;
  const total = unitPrice * quantity;

  if (!material) {
    alert('請填寫材料名稱');
    return;
  }

  const analysis = { material, unitPrice, quantity, total, timestamp: Date.now() };
  materialData.costAnalysis.push(analysis);
  
  alert(`✓ 成本資料已儲存\n材料: ${material}\n總成本: NT$ ${total.toLocaleString()}`);
  console.log('Cost analysis:', materialData.costAnalysis);
}

function setupCostCalculation() {
  const priceInput = document.querySelector('#tab-materials input[min="0"][value="1500"]');
  const qtyInput = document.querySelector('#tab-materials input[min="0"][value="100"]');
  const totalInput = document.querySelector('#tab-materials input[value="150000"]');

  if (priceInput && qtyInput && totalInput) {
    const calculate = () => {
      const total = (parseFloat(priceInput.value) || 0) * (parseFloat(qtyInput.value) || 0);
      totalInput.value = total;
    };
    
    priceInput.addEventListener('input', calculate);
    qtyInput.addEventListener('input', calculate);
  }
}

function setupDelayCalculation() {
  const expectedInput = document.querySelectorAll('#tab-materials input[type="date"]')[1];
  const actualInput = document.querySelectorAll('#tab-materials input[type="date"]')[2];
  const delayInput = document.querySelector('#tab-materials input[readonly][value="0"]');

  if (expectedInput && actualInput && delayInput) {
    const calculate = () => {
      if (expectedInput.value && actualInput.value) {
        const days = Math.floor((new Date(actualInput.value) - new Date(expectedInput.value)) / (1000 * 60 * 60 * 24));
        delayInput.value = days;
      }
    };
    
    expectedInput.addEventListener('change', calculate);
    actualInput.addEventListener('change', calculate);
  }
}

export function getMaterialData() {
  return materialData;
}