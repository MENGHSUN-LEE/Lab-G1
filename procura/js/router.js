// js/router.js
import { state, pages, headerEl } from './app.js';
import { doSearch, renderSearchResults } from './pages/search.js';
import { renderDetail } from './pages/detail/index.js';
import { renderAccountDetail } from './pages/account.js';

/**
 * 顯示指定的頁面，並隱藏其他頁面
 * @param {string} name - 頁面名稱 (login, signup, search, detail)
 */
export function showPage(name) {
  Object.values(pages).forEach(s => s && s.classList.add("hidden"));
  pages[name]?.classList.remove("hidden");
  // 登入後才顯示 Header，且登入/註冊頁面不顯示 Header
  headerEl.style.display = (state.authed && name !== "login" && name !== "signup") ? "block" : "none";
}

/** 處理 URL 雜湊變更的路由邏輯 */
export function router() {
  const hash = location.hash || "#login";

  // 未登入時限制路由
  if (!state.authed && hash !== "#login" && hash !== "#signup") { showPage("login"); return; }

  if (hash.startsWith("#signup")) {
    showPage("signup");
  } else if (hash.startsWith("#search")) {
    showPage("search");
    doSearch();
  } else if (hash.startsWith("#account")) {
    showPage("account");
    if (state.user?.id) {
      renderAccountDetail(state.user.id);
    } else {
      location.hash = "#login";
    }
  } else if (hash.startsWith("#detail")) {
    const id = new URLSearchParams(hash.split("?")[1]).get("id");
    fetch(`/api/projects/${id}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.project) {
          const proj = result.project;
          state.currentProject = proj;
          showPage("detail");
          renderDetail(proj);
        } else {
          // 如果 API 失敗，返回搜尋頁面
          alert(`無法載入專案: ${result.message}`);
          location.hash = "#search";
        }
      })
      .catch(error => {
        console.error("Detail Fetch Error:", error);
        alert("網路錯誤，無法獲取專案細節。");
        location.hash = "#search";
      });

  } else {
    showPage("login");
  }
}