// js/app.js
import { bindMaterialEvents, MaterialsModule } from './pages/materials.js';
import { bindVendorEvents } from './pages/vendors.js';
import { router } from './router.js';
import { bindLoginEvents } from './pages/login.js';
import { bindSearchEvents } from './pages/search.js';
import { bindDetailEvents } from './pages/detail.js';
import { bindTabEvents } from './pages/common.js';
import { Store } from './store.js';

// --- 全域狀態與元素 (Exported for other modules) ---
export const state = { authed:false, currentProject:null };
export const pages = {
  login:   document.getElementById("page-login"),
  signup:  document.getElementById("page-signup"),
  search:  document.getElementById("page-search"),
  detail:  document.getElementById("page-detail"),
};
export const headerEl = document.getElementById("appHeader");

function init(){
  // 1. 綁定所有頁面的事件
  bindLoginEvents();
  bindSearchEvents();
  bindDetailEvents();
  bindTabEvents();
  bindMaterialEvents();
  bindVendorEvents(); 

  // 2. 啟動路由監聽 (處理 URL 雜湊變更)
  window.addEventListener("hashchange", router);

  // 3. 首次載入執行路由
  router(); 

  // 4. Export to window for inline onclick handlers
  window.MaterialsModule = MaterialsModule;
  window.Store = Store;

  console.log('Procura App Initialized');
}

// 應用程式啟動
init();