// js/pages/search.js

import { state } from '../app.js';

/**
 * 渲染專案搜尋結果列表
 * @param {Array<Object>} items - 專案列表
 */
export function renderSearchResults(items) { // 確保有 export
  const resultBox = document.getElementById("result");

  resultBox.innerHTML = "";
  if (!items.length) {
    resultBox.innerHTML = "<div class='muted'>查無結果</div>";
    return;
  }

  items.forEach(p => {
    const li = document.createElement("div");
    li.className = "list-item";
    li.innerHTML = `
      <div>
        <h4>${p.project_name}</h4>
        <div class="muted">#${p.tags.join(" #")}　|　Owner：${p.owner}</div>
      </div>
      <button class="btn"><span class="material-symbols-outlined">info</span>Detail</button>
    `;
    li.querySelector("button").onclick = () => location.hash = `#detail?id=${p.id}`;
    resultBox.appendChild(li);
  });
}

/** 執行搜尋邏輯 */
export async function doSearch(){
  const searchInput = document.getElementById("q");
  const term = (searchInput.value||"").trim();

  // 檢查用戶是否已登入並取得 ID
  if (!state.user.id) {
      alert("請先登入以載入專案。");
      renderSearchResults([]);
      return;
  }
  
  // 構造 API URL (帶上 user_id 和搜尋詞)
  const apiUrl = `/api/projects?user_id=${state.user.id}` + (term ? `&q=${encodeURIComponent(term)}` : '');

  try {
      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.success) {
          // 使用從 DB 返回的 projects 列表進行渲染
          renderSearchResults(result.projects);
      } else {
          alert(`載入專案失敗: ${result.message}`);
          renderSearchResults([]);
      }
  } catch (error) {
      console.error('Fetch Projects failed:', error);
      alert('無法連線到伺服器，無法載入專案列表。');
      renderSearchResults([]);
  }
}

/** 綁定搜尋頁面的事件 (包含新專案創建) */
export function bindSearchEvents() {
  // ⚠️ 在此處取得所有元素
  const searchInput = document.getElementById("q");
  const searchBtn = document.getElementById("searchBtn");
  const createProjectBtn = document.getElementById("createProjectBtn");
  const newProjectName = document.getElementById("newProjectName");
  const newProjectTags = document.getElementById("newProjectTags");
  const newProjectOwner = document.getElementById("newProjectOwner");
  const createProjectSection = document.getElementById("createProjectSection"); 
  const toggleCreateFormBtn = document.getElementById("toggleCreateFormBtn");
  
  // 綁定搜尋事件
  if (searchBtn) searchBtn.onclick = () => doSearch();
  if (searchInput) searchInput.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
  if (toggleCreateFormBtn && createProjectSection) {
    toggleCreateFormBtn.onclick = () => {
      // 切換 hidden class 來控制顯示/隱藏
      createProjectSection.classList.toggle("hidden");

      // 選擇性：改變按鈕文字/圖示
      if (createProjectSection.classList.contains("hidden")) {
        toggleCreateFormBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Add';
      } else {
        toggleCreateFormBtn.innerHTML = '<span class="material-symbols-outlined">close</span> Close';
      }
    };
  }
  // 1. 創建新專案功能
  if (createProjectBtn) {
    createProjectBtn.onclick = async () => {
      const name = newProjectName.value.trim();
      const tagsInput = newProjectTags.value.trim();
      const owner = newProjectOwner.value.trim();

      if (!name || !tagsInput || !owner) {
        alert("請填寫專案名稱、標籤和擁有者。");
        return;
      }

      const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      const projectData = {
        user_id: state.user.id,
        user_plan: state.user.plan,
        name,
        tags: tagsArray,
        owner
      };

      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });

        const result = await response.json();

        if (result.success) {
          alert(`專案 "${result.name}" 創建成功！`);
          // 清空表單
          newProjectName.value = '';
          newProjectTags.value = '';
          newProjectOwner.value = '';

          // 隱藏表單並恢復按鈕文字
          if (createProjectSection) createProjectSection.classList.add("hidden");
          if (toggleCreateFormBtn) toggleCreateFormBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Add';

          location.hash = '#search';
        } else {
          alert(`創建失敗: ${result.message}`);
        }
      } catch (error) {
        console.error('Create Project request failed:', error);
        alert('網路錯誤或伺服器無法連線。');
      }
    };
  } 
}