// js/pages/detail/vendor_management.js

import { state } from '../../app.js';

let cachedVendors = [];
console.log("Vendor Management script v4 loaded");

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

    // 3. Fetch & Render Metrics (New)
    await loadVendorMetrics();

    // 4. Load initial history (All or first)
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

// State for sorting
let deliverySort = { field: 'pct', order: 'desc' }; // Default: On-Time % High to Low

async function loadVendorMetrics() {
    const container = document.getElementById("vendor-metrics-section");
    if (!container) {
        const mainContainer = document.getElementById("vendor-dashboard").parentNode;
        const metricsDiv = document.createElement("div");
        metricsDiv.id = "vendor-metrics-section";
        metricsDiv.className = "stack";
        metricsDiv.style.marginTop = "30px";
        metricsDiv.innerHTML = `<h3>Vendor Performance Metrics</h3><div id="metrics-grid" class="grid cols-2"></div>`;
        document.getElementById("vendor-dashboard").after(metricsDiv);
    }

    const grid = document.getElementById("metrics-grid");
    if (!grid) return;

    try {
        const res = await fetch('/api/vendor-metrics');
        const result = await res.json();

        if (result.success && result.metrics.length > 0) {
            console.log('[Vendor Metrics] Loaded metrics:', result.metrics.length);

            // --- RENDER FUNCTIONS ---

            const renderDeliveryCard = () => {
                // 1. Sort Data
                const sortedMetrics = [...result.metrics].sort((a, b) => {
                    let valA, valB;
                    if (deliverySort.field === 'pct') {
                        // Handle N/A as -1 for sorting
                        valA = a.delivery.pct === 'N/A' ? -1 : parseFloat(a.delivery.pct);
                        valB = b.delivery.pct === 'N/A' ? -1 : parseFloat(b.delivery.pct);
                    } else {
                        valA = a.delivery.total;
                        valB = b.delivery.total;
                    }

                    if (deliverySort.order === 'desc') return valB - valA;
                    return valA - valB;
                });

                // 2. Slice Top 6
                const DISPLAY_LIMIT = 6;
                const displayMetrics = sortedMetrics.slice(0, DISPLAY_LIMIT);
                const hasMore = sortedMetrics.length > DISPLAY_LIMIT;

                // 3. Generate Rows
                const rowsHTML = displayMetrics.map(m => {
                    const pct = m.delivery.pct;
                    const color = pct === "N/A" ? "#999" : (pct >= 90 ? "green" : (pct >= 70 ? "orange" : "red"));
                    return `
                        <tr style="border-bottom: 1px solid #f9f9f9;">
                            <td style="padding: 8px;">${m.vendor_name}</td>
                            <td style="padding: 8px; font-weight:bold; color: ${color};">
                                ${pct === "N/A" ? "N/A" : pct + "%"}
                            </td>
                            <td style="padding: 8px; color: #777;">${m.delivery.total}</td>
                        </tr>
                    `;
                }).join("");

                // 4. Generate Card HTML
                const sortIcon = (field) => {
                    if (deliverySort.field !== field) return '<span style="color:#ccc; font-size:0.8em">⇅</span>';
                    return deliverySort.order === 'desc' ? '↓' : '↑';
                };

                return `
                    <div class="card" style="padding: 20px;">
                        <h4 style="margin-bottom: 15px; color: #667eea;">🚚 Delivery Punctuality</h4>
                        <table style="width:100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid #eee; text-align:left;">
                                    <th style="padding: 8px;">Vendor</th>
                                    <th style="padding: 8px; cursor:pointer; user-select:none;" id="sort-delivery-pct">
                                        On-Time % ${sortIcon('pct')}
                                    </th>
                                    <th style="padding: 8px; cursor:pointer; user-select:none;" id="sort-delivery-total">
                                        Total Orders ${sortIcon('total')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>${rowsHTML}</tbody>
                        </table>
                        ${hasMore ? `
                            <div style="text-align: center; margin-top: 15px;">
                                <button class="btn" id="view-more-delivery" style="font-size: 0.9em;">
                                    View More (${result.metrics.length} Vendors)
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            };

            const renderPriceCard = () => {
                const DISPLAY_LIMIT = 6;
                const displayMetrics = result.metrics.slice(0, DISPLAY_LIMIT);
                const hasMore = result.metrics.length > DISPLAY_LIMIT;

                const rowsHTML = displayMetrics.map(m => {
                    const val = m.price_competitiveness;
                    let status = "Neutral";
                    let color = "#777";

                    if (val !== "N/A") {
                        const num = parseFloat(val);
                        if (num > 0) { status = "Good"; color = "green"; }
                        else if (num < 0) { status = "Expensive"; color = "red"; }
                        else { status = "Neutral"; color = "gray"; }
                    }

                    return `
                        <tr style="border-bottom: 1px solid #f9f9f9;">
                            <td style="padding: 8px;">${m.vendor_name}</td>
                            <td style="padding: 8px; font-weight:bold; color: ${color};">
                                ${val === "N/A" ? "N/A" : (val > 0 ? "+" + val : val) + "%"}
                            </td>
                            <td style="padding: 8px;">
                                <span class="tag" style="background:${color}15; color:${color}; font-size:0.8em;">${status}</span>
                            </td>
                        </tr>
                    `;
                }).join("");

                return `
                    <div class="card" style="padding: 20px;">
                        <h4 style="margin-bottom: 15px; color: #667eea;">💰 Price Competitiveness</h4>
                        <p class="muted" style="font-size: 0.9em; margin-bottom: 10px;">Compared to Market Average Price</p>
                        <table style="width:100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid #eee; text-align:left;">
                                    <th style="padding: 8px;">Vendor</th>
                                    <th style="padding: 8px;">Savings %</th>
                                    <th style="padding: 8px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHTML}</tbody>
                        </table>
                        ${hasMore ? `
                            <div style="text-align: center; margin-top: 15px;">
                                <button class="btn" id="view-more-price" style="font-size: 0.9em;">
                                    View More (${result.metrics.length} Vendors)
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            };

            // --- MAIN RENDER LOGIC ---
            const updateGrid = () => {
                grid.innerHTML = renderDeliveryCard() + renderPriceCard();

                // Bind Events
                const deliveryBtn = document.getElementById("view-more-delivery");
                const priceBtn = document.getElementById("view-more-price");
                const sortPctBtn = document.getElementById("sort-delivery-pct");
                const sortTotalBtn = document.getElementById("sort-delivery-total");

                if (deliveryBtn) {
                    deliveryBtn.onclick = () => showVendorModal('Delivery Punctuality', result.metrics, 'delivery');
                }
                if (priceBtn) {
                    priceBtn.onclick = () => showVendorModal('Price Competitiveness', result.metrics, 'price');
                }

                // Sort Events
                if (sortPctBtn) {
                    sortPctBtn.onclick = () => {
                        if (deliverySort.field === 'pct') {
                            deliverySort.order = deliverySort.order === 'desc' ? 'asc' : 'desc';
                        } else {
                            deliverySort.field = 'pct';
                            deliverySort.order = 'desc'; // Default desc for new field
                        }
                        updateGrid();
                    };
                }
                if (sortTotalBtn) {
                    sortTotalBtn.onclick = () => {
                        if (deliverySort.field === 'total') {
                            deliverySort.order = deliverySort.order === 'desc' ? 'asc' : 'desc';
                        } else {
                            deliverySort.field = 'total';
                            deliverySort.order = 'desc';
                        }
                        updateGrid();
                    };
                }
            };

            // Initial Render
            updateGrid();

        } else {
            grid.innerHTML = `<p class="muted col-span-2" style="text-align:center;">No metric data available.</p>`;
        }
    } catch (e) {
        console.error("Failed to load metrics", e);
        grid.innerHTML = `<p class="muted">Error loading metrics.</p>`;
    }
}

// Show modal with all vendors
function showVendorModal(title, metrics, type) {
    const modal = document.createElement('div');
    modal.id = 'vendor-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
        justify-content: center; z-index: 9999;
    `;

    // Sort metrics for modal based on current sort if it's delivery
    let displayMetrics = [...metrics];
    if (type === 'delivery') {
        displayMetrics.sort((a, b) => {
            let valA, valB;
            if (deliverySort.field === 'pct') {
                valA = a.delivery.pct === 'N/A' ? -1 : parseFloat(a.delivery.pct);
                valB = b.delivery.pct === 'N/A' ? -1 : parseFloat(b.delivery.pct);
            } else {
                valA = a.delivery.total;
                valB = b.delivery.total;
            }
            if (deliverySort.order === 'desc') return valB - valA;
            return valA - valB;
        });
    }

    let tableContent = '';

    if (type === 'delivery') {
        tableContent = `
            <table style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #eee; text-align:left;">
                        <th style="padding: 10px;">Vendor</th>
                        <th style="padding: 10px;">On-Time %</th>
                        <th style="padding: 10px;">Total Orders</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayMetrics.map(m => {
            const pct = m.delivery.pct;
            const color = pct === "N/A" ? "#999" : (pct >= 90 ? "green" : (pct >= 70 ? "orange" : "red"));
            return `
                            <tr style="border-bottom: 1px solid #f9f9f9;">
                                <td style="padding: 10px;">${m.vendor_name}</td>
                                <td style="padding: 10px; font-weight:bold; color: ${color};">
                                    ${pct === "N/A" ? "N/A" : pct + "%"}
                                </td>
                                <td style="padding: 10px; color: #777;">${m.delivery.total}</td>
                            </tr>
                        `;
        }).join("")}
                </tbody>
            </table>
        `;
    } else {
        tableContent = `
            <table style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #eee; text-align:left;">
                        <th style="padding: 10px;">Vendor</th>
                        <th style="padding: 10px;">Savings %</th>
                        <th style="padding: 10px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayMetrics.map(m => {
            const val = m.price_competitiveness;
            let status = "Neutral";
            let color = "#777";
            if (val !== "N/A") {
                const num = parseFloat(val);
                if (num > 0) { status = "Good"; color = "green"; }
                else if (num < 0) { status = "Expensive"; color = "red"; }
                else { status = "Neutral"; color = "gray"; }
            }
            return `
                            <tr style="border-bottom: 1px solid #f9f9f9;">
                                <td style="padding: 10px;">${m.vendor_name}</td>
                                <td style="padding: 10px; font-weight:bold; color: ${color};">
                                    ${val === "N/A" ? "N/A" : (val > 0 ? "+" + val : val) + "%"}
                                </td>
                                <td style="padding: 10px;">
                                    <span class="tag" style="background:${color}15; color:${color}; font-size:0.9em; padding: 4px 8px;">${status}</span>
                                </td>
                            </tr>
                        `;
        }).join("")}
                </tbody>
            </table>
        `;
    }

    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #667eea;">${title === 'Delivery Punctuality' ? '🚚' : '💰'} ${title}</h3>
                <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
            </div>
            ${type === 'price' ? '<p class="muted" style="margin-bottom: 15px;">Compared to Market Average Price</p>' : ''}
            <div style="overflow-x: auto;">${tableContent}</div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn" id="close-modal-btn">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    document.getElementById('close-modal').onclick = closeModal;
    document.getElementById('close-modal-btn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}