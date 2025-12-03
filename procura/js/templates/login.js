// js/templates/login.js

/** 匯出登入與註冊頁面的 HTML 結構 */
export const loginTemplate = `
    <section id="page-login" class="card stack">
      <h1>Procura 智供管理系統</h1>
      <h2>Log in</h2>

      <form class="stack" onsubmit="event.preventDefault(); document.getElementById('loginBtn').click();">
        <div class="stack">
          <label for="loginEmail">Email</label>
          <input id="loginEmail" type="email" placeholder="you@example.com" required />
        </div>
        <div class="stack">
          <label for="loginPassword">Password</label>
          <div class="password-container">
            <input id="loginPassword" type="password" placeholder="••••••••" required />
            <span class="material-symbols-outlined password-toggle" id="togglePassword">
              visibility_off
            </span>
          </div>
        </div>
        <div class="flex-between">
          <div class="flex-center">
            <input type="checkbox" id="rememberMe" style="width: auto; margin-right: 8px;" />
            <label for="rememberMe" style="margin-bottom: 0;">Remember Me</label>
          </div>
          <a href="#" class="muted" style="font-size: 14px; text-decoration: none;" id="forgotPasswordLink">Forgot
            Password？</a>
        </div>

        <div class="actions" style="margin-top: 12px;">
          <button id="loginBtn" class="btn-primary" type="submit">Log in</button>
          <button id="signupBtn" class="btn" type="button">Sign up</button>
        </div>
      </form>
    </section>

    <section id="page-signup" class="card stack hidden">
      <h2>Create your account</h2>
      <div class="grid cols-2">
        <div class="stack">
          <label>Company</label>
          <input id="suCompany" type="text" placeholder="Procura Co., Ltd." />
        </div>
        <div class="stack">
          <label>Email</label>
          <input id="suEmail" type="email" placeholder="you@example.com" />
        </div>
        <div class="stack">
          <label>Phone</label>
          <input id="suPhone" type="tel" placeholder="0912-345-678" />
        </div>
        <div class="stack">
          <label>Password</label>
          <input id="suPassword" type="password" placeholder="••••••••" />
        </div>
        <div class="stack">
          <label>Check Password</label>
          <input id="suPassword2" type="password" placeholder="Enter password agin" />
        </div>
        <div class="stack">
          <label>Subscription</label>
          <select id="suPlan">
            <option value="trial">Free Trial (1 project)</option>
            <option value="personal">Personal Account ($12.99/month)</option>
            <option value="business">Business Account ($75.99/month)</option>
          </select>
        </div>
      </div>

      <div class="actions">
        <button id="createAccountBtn" class="btn-primary">Sign up</button>
        <button id="backToLoginBtn" class="btn">← Back</button>
      </div>

      <p class="muted">
    For detailed subscription plans, please refer to the 
    <a href="./photos/subscription.jpg" 
       target="_blank" 
       style="text-decoration: underline; color: var(--primary); cursor: pointer;">
        company's official website
    </a>
</p>
    </section>
`;