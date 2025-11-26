// js/pages/detail/vendor_management.js

import { state } from '../../app.js';

let cachedVendors = [];

export function bindVendorManagementEvents() {
    const rateStars = document.getElementById("rate-stars");
    const rateValue = document.getElementById("rate-value");
    const submitBtn = document.getElementById("submitRatingBtn");
    const rateVendorSel = document.getElementById("rate-vendor-select");
    const historyVendorSel = document.getElementById("history-vendor-filter");

    // 1. Star Rating Interaction
    if (rateStars) {
        const stars = rateStars.querySelectorAll("span");
        stars.forEach(star => {
            star.onclick = () => {
                const val = parseInt(star.dataset.val);
                rateValue.value = val;
                updateStarVisuals(val);
            };
        });
    }

    // 2. Submit Rating
    if (submitBtn) {
        submitBtn.onclick = async () => {
            const vendor = rateVendorSel.value;
            const rating = parseInt(rateValue.value);
            const comment = document.getElementById("rate-comment").value;
            const proj = state.currentProject;

            if (!vendor) { alert("Please select a vendor."); return; }
            if (!rating) { alert("Please select a rating."); return; }

            try {
                const response = await fetch('/api/vendor-ratings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vendor_name: vendor,
                        rating: rating,
                        comment: comment,
                        project_id: proj ? proj.id : null
                    })
                });
                const result = await response.json();
                if (result.success) {
                    alert("Rating submitted!");
                    // Reset form
                    rateVendorSel.value = "";
                    rateValue.value = 0;
                    document.getElementById("rate-comment").value = "";
                    updateStarVisuals(0);
                    // Refresh data
                    renderVendorManagement(proj);
                } else {
                    alert("Failed: " + result.message);
                }
            } catch (e) {
                console.error(e);
                alert("Error submitting rating.");
            }
        };
    }

    // 3. Filter History
    if (historyVendorSel) {
        historyVendorSel.onchange = () => {
            loadRatingHistory(historyVendorSel.value);
        };
    }

    // Auto-select history filter when rating vendor changes (optional UX)
    if (rateVendorSel && historyVendorSel) {
        rateVendorSel.addEventListener('change', () => {
            if (rateVendorSel.value) {
                historyVendorSel.value = rateVendorSel.value;
                loadRatingHistory(rateVendorSel.value);
            }
        });
    }
}

function updateStarVisuals(val) {
    const stars = document.querySelectorAll("#rate-stars span");
    stars.forEach(s => {
        const sVal = parseInt(s.dataset.val);
        s.style.color = sVal <= val ? "#FFD700" : "#ccc"; // Gold vs Gray
    });
}

export async function renderVendorManagement(project) {
    console.log(`[Vendor Management] Rendering...`);

    // 1. Fetch Vendors & Populate Selects
    await loadVendors();

    // 2. Fetch & Render Dashboard
    await loadDashboard();

    // 3. Load initial history (All or first)
    const historyVendorSel = document.getElementById("history-vendor-filter");
    const initialVendor = historyVendorSel ? historyVendorSel.value : "";
    await loadRatingHistory(initialVendor);
}

async function loadVendors() {
    try {
        const res = await fetch('/api/vendors');
        const data = await res.json();
        console.log('[Vendor Management] Fetched vendors:', data);
        if (data.success) {
            cachedVendors = data.vendors;
            const options = `<option value="">-- Select Vendor --</option>` +
                cachedVendors.map(v => `<option value="${v}">${v}</option>`).join("");

            const rateSel = document.getElementById("rate-vendor-select");
            const histSel = document.getElementById("history-vendor-filter");

            // Preserve selection if re-rendering
            const currentRateVal = rateSel ? rateSel.value : "";
            const currentHistVal = histSel ? histSel.value : "";

            if (rateSel) rateSel.innerHTML = options;
            if (histSel) histSel.innerHTML = `<option value="">All Vendors</option>` +
                cachedVendors.map(v => `<option value="${v}">${v}</option>`).join("");

            if (rateSel && currentRateVal) rateSel.value = currentRateVal;
            if (histSel && currentHistVal) histSel.value = currentHistVal;
        }
    } catch (e) {
        console.error("Failed to load vendors", e);
    }
}

async function loadDashboard() {
    const container = document.getElementById("vendor-dashboard");
    if (!container) return;

    try {
        const res = await fetch('/api/vendor-performance');
        const result = await res.json();

        if (result.success && result.data.length > 0) {
            // Clear container and remove grid class to allow custom stacking
            container.className = "stack";
            container.innerHTML = result.data.map(group => `
                <div class="category-section" style="margin-bottom: 20px;">
                    <h5 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px; color: #667eea;">
                        ${group.category}
                    </h5>
                    <div class="grid cols-3" style="gap: 15px;">
                        ${group.vendors.map(d => `
                            <div class="card" style="padding: 15px; border-left: 4px solid #667eea; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                <h5 style="margin-bottom: 5px; font-size: 1.1em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${d.vendor_name}">
                                    ${d.vendor_name}
                                </h5>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <span style="font-size: 1.5em; font-weight:bold; color: #333;">${d.avg_rating}</span>
                                        <span style="color: #FFD700;">★</span>
                                        <div style="font-size: 0.8em; color: #777;">(${d.rating_count} ratings)</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <div style="font-size: 1.2em; font-weight:bold;">${d.order_count}</div>
                                        <div style="font-size: 0.8em; color: #777;">Orders</div>
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `).join("");
        } else {
            container.innerHTML = `<p class="muted" style="text-align:center;">No performance data available yet.</p>`;
        }
    } catch (e) {
        console.error("Failed to load dashboard", e);
        container.innerHTML = `<p class="muted">Error loading data.</p>`;
    }
}

async function loadRatingHistory(vendorName) {
    const list = document.getElementById("rating-history-list");
    if (!list) return;

    if (!vendorName) {
        list.innerHTML = `<p class="muted" style="text-align:center; padding: 20px;">Please select a vendor to view rating history.</p>`;
        return;
    }

    try {
        const res = await fetch(`/api/vendor-ratings?vendor_name=${encodeURIComponent(vendorName)}`);
        const result = await res.json();

        if (result.success && result.ratings.length > 0) {
            list.innerHTML = result.ratings.map(r => `
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-weight:bold;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
                        <span class="muted" style="font-size: 0.85em;">${new Date(r.rated_at).toLocaleDateString()}</span>
                    </div>
                    <p style="margin-top: 5px; color: #555;">${r.comment || "No comment"}</p>
                </div>
            `).join("");
        } else {
            list.innerHTML = `<p class="muted" style="text-align:center; padding: 20px;">No ratings found for this vendor.</p>`;
        }
    } catch (e) {
        console.error("Failed to load history", e);
        list.innerHTML = `<p class="muted">Error loading history.</p>`;
    }
}