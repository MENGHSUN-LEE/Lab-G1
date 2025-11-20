// js/pages/login.js

import { state } from '../app.js';

/** 綁定登入相關的按鈕事件 */
export function bindLoginEvents(){
  
  // 登入
  document.getElementById("loginBtn").onclick = ()=>{ 
    // 這裡是 Demo，略過表單驗證
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
    alert("Not connected to DB");
    location.hash = "#login";
  });
  
  // header 導覽
  document.querySelectorAll("[data-nav]").forEach(btn=> btn.onclick=()=> location.hash=btn.getAttribute("data-nav"));
  
  // 密碼切換邏輯
  const passwordInput = document.getElementById('loginPassword');
  const toggleIcon = document.getElementById('togglePassword');

  if (passwordInput && toggleIcon) {
      toggleIcon.addEventListener('click', function () {
          // 切換 type 屬性
          const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordInput.setAttribute('type', type);
          
          // 切換 Icon 樣式
          this.textContent = (type === 'password' ? 'visibility_off' : 'visibility');
      });
  }
  document.getElementById("forgotPasswordLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      // console.log("DEMO: 觸發忘記密碼流程。此功能尚未實作後端。");
      alert("Please contact customer service at: 02-1234-1234");
  });
}