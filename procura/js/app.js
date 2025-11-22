// js/app.js

import { router } from './router.js';
import { bindLoginEvents } from './pages/login.js';
import { bindSearchEvents } from './pages/search.js';
import { bindDetailEvents } from './pages/detail/index.js';
import { bindTabEvents } from './pages/common.js';

import { loginTemplate } from './templates/login.js';
import { searchTemplate } from './templates/search.js';
import { detailTemplate } from './templates/detail.js';

// --- 全域狀態與元素 (Exported for other modules) ---
export const state = { authed:false, currentProject:null, user: { id: null, plan: null } };
export let pages = {};
export const headerEl = document.getElementById("appHeader");
const appContainer = document.getElementById("appContainer");

function loadTemplatesIntoDOM() {
    if (appContainer) {
        // 將所有頁面模版內容串聯並注入到主容器中
        appContainer.innerHTML = loginTemplate + searchTemplate + detailTemplate;
    }
}

function loadPageElements(){
    pages.login =   document.getElementById("page-login");
    pages.signup =  document.getElementById("page-signup");
    pages.search =  document.getElementById("page-search");
    pages.detail =  document.getElementById("page-detail");
}


function init(){
  // 1. 🚨 執行 HTML 模版注入 (解決 ReferenceError)
  loadTemplatesIntoDOM();
    
  // 2. 載入所有頁面元素 (此時 HTML 元素才存在)
  loadPageElements();

  // 3. 綁定事件
  bindLoginEvents();
  bindSearchEvents();
  bindDetailEvents();
  bindTabEvents();

  // 4. 啟動路由監聽 (處理 URL 雜湊變更)
  window.addEventListener("hashchange", router);

  // 5. 首次載入執行路由
  router(); 
}

// 應用程式啟動
init();