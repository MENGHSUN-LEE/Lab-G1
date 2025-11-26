// js/templates/account.js

export const accountTemplate = `
    <section id="page-account" class="card stack hidden">
      <h2>Account Management</h2>
      <p class="muted">Manage your profile, company details, and password.</p>

      <div id="account-info-container" class="stack">
        <h3>User Profile</h3>
        <div class="grid cols-2">
            <div class="stack">
                <label>Company</label>
                <input id="accCompany" type="text" /> 
            </div>
            <div class="stack">
                <label>Email (Login Account)</label>
                <input id="accEmail" type="email" />
            </div>
            <div class="stack">
                <label>Phone</label>
                <input id="accPhone" type="tel" /> 
            </div>
            <div class="stack">
                <label>Subscription Plan</label>
                <select id="accPlan">
                    <option value="trial">Free Trial (1 project)</option>
                    <option value="personal">Personal Account ($12.99/month)</option>
                    <option value="business">Business Account ($75.99/month)</option>
                </select>
            </div>
            <div class="stack align-end col-span-2"> 
                <button id="saveProfileBtn" class="btn-primary">Save Profile</button>
            </div>
        </div>
      </div>
      
      <hr />

      <h3>Change Password</h3>
      <div class="grid cols-2">
          <div class="stack">
              <label for="oldPassword">Current Password</label>
              <input id="oldPassword" type="password" placeholder="••••••••" required />
          </div>
          <div class="stack">
              <label for="newPassword">New Password</label>
              <input id="newPassword" type="password" placeholder="••••••••" required />
          </div>
          <div class="stack">
              <label for="confirmPassword">Confirm New Password</label>
              <input id="confirmPassword" type="password" placeholder="••••••••" required />
          </div>
          <div class="stack align-end">
              <button id="savePasswordBtn" class="btn-primary">Save New Password</button>
          </div>
      </div>
    </section>
`;