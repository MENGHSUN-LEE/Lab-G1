// js/pages/vendors.js

// Vendor management data storage
const vendorData = {
  vendors: [],
  ratings: [],
  performance: []
};

export function bindVendorEvents() {
  // Add Vendor
  const addVendorBtn = document.querySelector('#tab-vendor .btn-primary');
  if (addVendorBtn) {
    addVendorBtn.addEventListener('click', addVendor);
  }

  // Save Rating
  const ratingBtn = document.querySelector('#tab-vendor .btn-success');
  if (ratingBtn) {
    ratingBtn.addEventListener('click', saveVendorRating);
  }

  // Calculate punctuality rate
  setupPunctualityCalculation();
  
  // Calculate average price
  setupPriceAnalysis();
}

function addVendor() {
  const name = document.querySelector('#tab-vendor input[placeholder="XX建材有限公司"]').value;
  const contact = document.querySelector('#tab-vendor input[placeholder="張三"]').value;
  const phone = document.querySelector('#tab-vendor input[placeholder="02-1234-5678"]').value;
  const email = document.querySelector('#tab-vendor input[placeholder="vendor@example.com"]').value;
  const address = document.querySelector('#tab-vendor input[placeholder="台北市..."]').value;

  if (!name) {
    alert('請填寫供應商名稱');
    return;
  }

  const vendor = { id: Date.now(), name, contact, phone, email, address, created: new Date().toISOString() };
  vendorData.vendors.push(vendor);
  
  alert(`✓ 供應商已新增\n名稱: ${name}\n聯絡人: ${contact}`);
  console.log('Vendors:', vendorData.vendors);
  
  // Clear form
  document.querySelector('#tab-vendor input[placeholder="XX建材有限公司"]').value = '';
  document.querySelector('#tab-vendor input[placeholder="張三"]').value = '';
  document.querySelector('#tab-vendor input[placeholder="02-1234-5678"]').value = '';
  document.querySelector('#tab-vendor input[placeholder="vendor@example.com"]').value = '';
  document.querySelector('#tab-vendor input[placeholder="台北市..."]').value = '';
}

function saveVendorRating() {
  const vendor = document.querySelector('#tab-vendor input[placeholder="選擇或輸入供應商..."]').value;
  const punctuality = document.querySelectorAll('#tab-vendor input[min="1"][max="10"]')[0].value;
  const price = document.querySelectorAll('#tab-vendor input[min="1"][max="10"]')[1].value;
  const quality = document.querySelectorAll('#tab-vendor input[min="1"][max="10"]')[2].value;
  const service = document.querySelectorAll('#tab-vendor input[min="1"][max="10"]')[3].value;
  const date = document.querySelectorAll('#tab-vendor input[type="date"]')[0].value;

  if (!vendor || !date) {
    alert('請填寫供應商名稱和評分日期');
    return;
  }

  const avgRating = ((parseFloat(punctuality) + parseFloat(price) + parseFloat(quality) + parseFloat(service)) / 4).toFixed(1);
  
  const rating = { vendor, punctuality, price, quality, service, date, avgRating, timestamp: Date.now() };
  vendorData.ratings.push(rating);
  
  alert(`✓ 供應商評分已儲存\n供應商: ${vendor}\n平均評分: ${avgRating}/10`);
  console.log('Vendor ratings:', vendorData.ratings);
}

function setupPunctualityCalculation() {
  const onTimeInput = document.querySelector('#tab-vendor input[value="18"]');
  const totalInput = document.querySelector('#tab-vendor input[value="20"]');
  const rateInput = document.querySelector('#tab-vendor input[value="90"]');

  if (onTimeInput && totalInput && rateInput) {
    const calculate = () => {
      const rate = (parseFloat(onTimeInput.value) / parseFloat(totalInput.value) * 100).toFixed(0);
      rateInput.value = rate;
    };
    
    onTimeInput.addEventListener('input', calculate);
    totalInput.addEventListener('input', calculate);
  }
}

function setupPriceAnalysis() {
  const inputs = document.querySelectorAll('#tab-vendor input[placeholder]');
  const priceInputs = Array.from(inputs).slice(-4, -1);
  const avgInput = inputs[inputs.length - 1];

  if (priceInputs.length === 3 && avgInput) {
    const calculate = () => {
      const prices = priceInputs.map(input => parseFloat(input.value) || 0).filter(p => p > 0);
      if (prices.length > 0) {
        const avg = (prices.reduce((sum, p) => sum + p, 0) / prices.length).toFixed(0);
        avgInput.value = avg;
      }
    };
    
    priceInputs.forEach(input => input.addEventListener('input', calculate));
  }
}

export function getVendorData() {
  return vendorData;
}