// js/app.js

import { router } from './router.js';
import { bindLoginEvents } from './pages/login.js';
import { bindSearchEvents } from './pages/search.js';
import { bindDetailEvents } from './pages/detail.js';
import { bindTabEvents } from './pages/common.js';

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

  // 2. 啟動路由監聽 (處理 URL 雜湊變更)
  window.addEventListener("hashchange", router);

  // 3. 首次載入執行路由
  router(); 
}

// 應用程式啟動
init();