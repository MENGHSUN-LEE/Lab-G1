// js/pages/login.js

import { state } from '../app.js';

/** 綁定登入相關的按鈕事件 */
export function bindLoginEvents(){
  
  // 登入
  document.getElementById("loginBtn").onclick = ()=>{ 
    state.authed=true; 
    location.hash="#search"; 
  };
  
  // 登出
  document.getElementById("logoutBtn").onclick = ()=>{ 
    state.authed=false; 
    state.currentProject=null; 
    location.hash="#login"; 
  };
  
  // 導向註冊
  document.getElementById("signupBtn").onclick = ()=>{ 
    location.hash = "#signup"; 
  };
  
  // 導回登入
  document.getElementById("backToLoginBtn")?.addEventListener("click", ()=> {
    location.hash="#login";
  });

  // demo：創建帳號按鈕（僅導回登入，不存資料）
  document.getElementById("createAccountBtn")?.addEventListener("click", ()=>{
    alert("Demo：尚未接上後端，僅導回登入頁。");
    location.hash = "#login";
  });
  
  // header 導覽
  document.querySelectorAll("[data-nav]").forEach(btn=> btn.onclick=()=> location.hash=btn.getAttribute("data-nav"));
}