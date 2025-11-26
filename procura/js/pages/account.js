// js/pages/account.js
import { state } from '../app.js';

export function bindAccountEvents() {
    const accountBtn = document.getElementById("accountBtn");
    const savePasswordBtn = document.getElementById("savePasswordBtn");
    const saveProfileBtn = document.getElementById("saveProfileBtn");

    // 1. Header Account 按鈕導航
    if (accountBtn) {
        accountBtn.onclick = () => {
            location.hash = "#account";
            renderAccountDetail(state.user.id);
        };
    }

    // 2. 密碼修改邏輯 (此處為架構，需連結到 PUT /api/users/:id/password)
    if (savePasswordBtn) {
        savePasswordBtn.onclick = async () => {
            const userId = state.user.id; // 🚨 從全域狀態獲取用戶 ID

            if (!userId) {
                alert("用戶 ID 遺失，請重新登入。");
                return;
            }

            const oldPass = document.getElementById("oldPassword").value;
            const newPass = document.getElementById("newPassword").value;
            const confPass = document.getElementById("confirmPassword").value;

            if (newPass !== confPass) {
                alert("新密碼與確認密碼不一致！");
                return;
            }
            if (newPass.length < 1) {
                alert("密碼長度至少為 1 個字元。");
                return;
            }
            if (!oldPass) {
                alert("請輸入當前密碼。");
                return;
            }

            try {
                const response = await fetch(`/api/users/${userId}/password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
                });

                const result = await response.json();

                if (result.success) {
                    alert(`密碼修改成功: ${result.message}！請使用新密碼重新登入。`);

                    // 清空表單欄位
                    document.getElementById("oldPassword").value = '';
                    document.getElementById("newPassword").value = '';
                    document.getElementById("confirmPassword").value = '';

                    // 導向登入頁
                    location.hash = "#login";
                } else {
                    alert(`密碼修改失敗: ${result.message}`);
                }

            } catch (error) {
                console.error('Password Update Fetch Error:', error);
                alert('網路錯誤或伺服器無法連線，請稍後再試。');
            }
        };
    }

    // 3. 帳號資訊修改邏輯
    if (saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const userId = state.user.id;

            if (!userId) {
                alert("用戶 ID 遺失，請重新登入。");
                return;
            }

            const company = document.getElementById("accCompany").value;
            const phone = document.getElementById("accPhone").value;
            const email = document.getElementById("accEmail").value;       // 🚨 新增 Email 獲取
            const plan = document.getElementById("accPlan").value;           // 🚨 從 <select> 獲取值

            // 簡單的驗證
            if (!company || !phone || !email || !plan) {
                alert("所有欄位不能為空。");
                return;
            }

            try {
                const response = await fetch(`/api/users/${userId}/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company_name: company,
                        phone: phone,
                        email: email,
                        subscription_plan: plan
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert(`帳號資訊更新成功！`);

                    state.user.company_name = company;
                    state.user.phone = phone;
                    state.user.subscription_plan = plan;
                    renderAccountDetail(userId);

                } else {
                    alert(`更新失敗: ${result.message}`);
                }

            } catch (error) {
                console.error('Profile Update Fetch Error:', error);
                alert('網路錯誤，無法更新帳號資訊。');
            }
        };
    }
}

export async function renderAccountDetail(userId) {
    if (!userId) return;

    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (data.success && data.user) {
            const user = data.user;

            const emailEl = document.getElementById("accEmail");
            if (emailEl) {
                emailEl.value = user.email || '';
            }

            const companyEl = document.getElementById("accCompany");
            if (companyEl) {
                companyEl.value = user.company_name || '';
            }

            const phoneEl = document.getElementById("accPhone");
            if (phoneEl) {
                phoneEl.value = user.phone || '';
            }

            const planEl = document.getElementById("accPlan");
            if (planEl) {
                planEl.value = user.subscription_plan || 'trial';
            }
        }
    } catch (error) {
        console.error("Failed to fetch user data:", error);
    }
}