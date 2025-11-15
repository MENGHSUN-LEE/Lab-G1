// js/pages/search.js

import { PROJECTS } from '../data.js';

const resultBox = document.getElementById("result");
const searchInput = document.getElementById("q");
const searchBtn = document.getElementById("searchBtn");

/**
 * 渲染專案搜尋結果列表
 * @param {Array<Object>} items - 專案列表
 */
export function renderSearchResults(items){
  resultBox.innerHTML = "";
  if(!items.length){ 
    resultBox.innerHTML="<div class='muted'>查無結果</div>"; 
    return; 
  }
  
  items.forEach(p=>{
    const li = document.createElement("div");
    li.className = "list-item";
    // 引入 Icon 讓視覺更生動
    li.innerHTML = `
      <div>
        <h4>${p.name}</h4>
        <div class="muted">#${p.tags.join(" #")}　|　Owner：${p.owner}</div>
      </div>
      <button class="btn"><span class="material-symbols-outlined">info</span>Detail</button>
    `;
    li.querySelector("button").onclick = ()=> location.hash = `#detail?id=${p.id}`;
    resultBox.appendChild(li);
  });
}

/** 執行搜尋邏輯 */
export function doSearch(){
  const term = (searchInput.value||"").trim().toLowerCase();
  if(!term) return renderSearchResults(PROJECTS);
  
  const filtered = PROJECTS.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.tags.join(" ").toLowerCase().includes(term) ||
    p.owner.toLowerCase().includes(term)
  );
  renderSearchResults(filtered);
}

/** 綁定搜尋事件 */
export function bindSearchEvents(){
  searchBtn.onclick = ()=> doSearch();
  searchInput.addEventListener("keydown", e=>{ if(e.key==="Enter") doSearch(); });
}