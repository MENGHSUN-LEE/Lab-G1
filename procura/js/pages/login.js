// js/pages/login.js

import { state } from '../app.js';

/** 綁定登入相關的按鈕事件 */
export function bindLoginEvents(){
  
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const signupBtn = document.getElementById("signupBtn");
  const backToLoginBtn = document.getElementById("backToLoginBtn");
  const createAccountBtn = document.getElementById("createAccountBtn");
  const passwordInput = document.getElementById('loginPassword');
  const toggleIcon = document.getElementById('togglePassword');
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  
  const suCompany = document.getElementById("suCompany");
  const suEmail = document.getElementById("suEmail");
  const suPhone = document.getElementById("suPhone");
  const suPassword = document.getElementById("suPassword");
  const suPassword2 = document.getElementById("suPassword2");
  const suPlan = document.getElementById("suPlan");

  // 1. 登入功能 (連接後端 API)
  if (loginBtn) { 
      loginBtn.onclick = async (e)=>{ 
          e.preventDefault();
          const email = loginEmail.value;
          const password = loginPassword.value;
          
          if(!email || !password) { alert("請輸入電子郵件和密碼。"); return; }
          
          try {
              const response = await fetch('/api/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ loginEmail: email, loginPassword: password })
              });
              
              const data = await response.json();
              
              if (data.success) {
                  alert("登入成功！");
                  state.authed = true; 
                  state.user.id = data.user_id;
                  state.user.plan = data.subscription_plan; 
                  location.hash = "#search"; 
              } else {
                  alert(`登入失敗: ${data.message}`);
              }
          } catch (error) {
              console.error('Login request failed:', error);
              alert('網路錯誤，請稍後再試。');
          }
      };
  }
  
  // 2. 登出
  if (logoutBtn) { 
      logoutBtn.onclick = ()=>{ 
          state.authed=false; 
          state.currentProject=null; 
          location.hash="#login"; 
      };
  }
  
  // 3. 導向註冊
  if (signupBtn) { 
      signupBtn.onclick = ()=>{ 
          location.hash = "#signup"; 
      };
  }
  
  // 4. 導回登入
  document.getElementById("backToLoginBtn")?.addEventListener("click", ()=> {
      location.hash="#login";
  });

  // 5. 創建帳號按鈕 (連接後端 API)
  if (createAccountBtn) { 
      createAccountBtn.addEventListener("click", async ()=>{
          const password = suPassword.value;
          const password2 = suPassword2.value;
    
          if (password !== password2) {
              alert("兩次輸入的密碼不一致！");
              return;
          }
          
          // ... (後續 API 請求邏輯不變) ...
          const formData = {
              suCompany: suCompany.value,
              suEmail: suEmail.value,
              suPhone: suPhone.value,
              suPassword: password,
              suPlan: suPlan.value
          };
          
          try {
              const response = await fetch('/api/signup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(formData)
              });
              
              const data = await response.json();
              
              if (data.success) {
                  alert(`註冊成功: ${data.message}`);
                  location.hash = "#login";
              } else {
                  alert(`註冊失敗: ${data.message}`);
              }
          } catch (error) {
              console.error('Signup request failed:', error);
              alert('網路錯誤，請稍後再試。');
          }
      });
  }
  
  // 6. Header 導覽
  document.querySelectorAll("[data-nav]").forEach(btn=> btn.onclick=()=> location.hash=btn.getAttribute("data-nav"));
  
  // 7. 密碼切換邏輯
  if (passwordInput && toggleIcon) {
      toggleIcon.addEventListener('click', function () {
          const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordInput.setAttribute('type', type);
          this.textContent = (type === 'password' ? 'visibility_off' : 'visibility');
      });
  }
  
  document.getElementById("forgotPasswordLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Please contact customer service at: 02-1234-1234");
  });
}