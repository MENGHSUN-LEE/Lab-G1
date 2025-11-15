// js/router.js

import { state, pages, headerEl } from './app.js';
import { PROJECTS } from './data.js';
import { renderSearchResults, doSearch } from './pages/search.js';
import { renderDetail } from './pages/detail.js';

/**
 * 顯示指定的頁面，並隱藏其他頁面
 * @param {string} name - 頁面名稱 (login, signup, search, detail)
 */
export function showPage(name){
  Object.values(pages).forEach(s=> s && s.classList.add("hidden"));
  pages[name]?.classList.remove("hidden");
  // 登入後才顯示 Header，且登入/註冊頁面不顯示 Header
  headerEl.style.display = (state.authed && name!=="login" && name!=="signup") ? "block" : "none";
}

/** 處理 URL 雜湊變更的路由邏輯 */
export function router(){
  const hash = location.hash || "#login";
  
  // 未登入時限制路由
  if(!state.authed && hash !== "#login" && hash !== "#signup"){ showPage("login"); return; }

  if(hash.startsWith("#signup")) {
    showPage("signup");
  } else if(hash.startsWith("#search")){
    showPage("search"); 
    // 渲染搜尋頁時，執行一次完整的搜尋（或顯示全部）
    renderSearchResults(PROJECTS); 
  } else if(hash.startsWith("#detail")){
    const id = new URLSearchParams(hash.split("?")[1]).get("id");
    const proj = PROJECTS.find(p=>p.id===id);
    if(proj){ 
      state.currentProject=proj; 
      showPage("detail"); 
      renderDetail(proj); 
    }
    else {
      // 找不到專案導回搜尋頁
      location.hash="#search";
    }
  } else {
    showPage("login");
  }
}