// js/pages/detail/rfq.js

import { state } from '../../app.js';

let currentTab = 'create';
let rfqList = [];
let suppliers = [];
let products = [];
let selectedRFQ = null;
let quotations = [];

/**
 * Initialize RFQ Tab
 */
export async function initRFQ() {
    const container = document.getElementById('rfq-container');
    
    if (!container) {
        console.error('RFQ container not found');
        return;
    }

    container.innerHTML = `
        <!-- Header -->
        <div style="background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h2 style="margin: 0 0 8px 0; font-size: 2em; color: #1f2937;">Request for Quotation (RFQ)</h2>
                    <p style="margin: 0; color: #6b7280;">Create RFQs and compare supplier quotations</p>
                </div>
                <span class="material-symbols-outlined" style="font-size: 48px; color: #6366f1;">inventory_2</span>
            </div>
        </div>

        <!-- Message Area -->
        <div id="rfq-message" class="hidden" style="margin-bottom: 24px; padding: 16px; border-radius: 12px;"></div>

        <!-- Tab Navigation -->
        <div style="background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 24px;">
            <div style="display: flex; border-bottom: 2px solid #e5e7eb;">
                <button id="rfq-tab-create" class="rfq-tab-btn active" style="flex: 1; padding: 16px; font-weight: 600; border: none; background: #6366f1; color: white; cursor: pointer; border-radius: 16px 0 0 0;">
                    📝 Create RFQ
                </button>
                <button id="rfq-tab-list" class="rfq-tab-btn" style="flex: 1; padding: 16px; font-weight: 600; border: none; background: transparent; color: #6b7280; cursor: pointer;">
                    👁️ My RFQs (<span id="rfq-count">0</span>)
                </button>
                <button id="rfq-tab-browse" class="rfq-tab-btn" style="flex: 1; padding: 16px; font-weight: 600; border: none; background: transparent; color: #6b7280; cursor: pointer; border-radius: 0 16px 0 0;">
                    📦 Browse Products
                </button>
            </div>

            <!-- Tab Content -->
            <div id="rfq-tab-content" style="padding: 32px;">
                <p class="muted">Loading...</p>
            </div>
        </div>

        <!-- Quotations Modal (hidden by default) -->
        <div id="rfq-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;">
            <div style="background: white; border-radius: 16px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
                        <div id="modal-rfq-info">
                            <h2 style="margin: 0 0 8px 0;">RFQ Details</h2>
                            <p style="margin: 0; color: #6b7280;"></p>
                        </div>
                        <button id="close-modal" style="font-size: 32px; border: none; background: transparent; cursor: pointer; color: #6b7280;">×</button>
                    </div>
                    <div id="modal-quotations-list"></div>
                </div>
            </div>
        </div>
    `;

    // Bind tab switching
    document.getElementById('rfq-tab-create').addEventListener('click', () => switchRFQTab('create'));
    document.getElementById('rfq-tab-list').addEventListener('click', () => switchRFQTab('list'));
    document.getElementById('rfq-tab-browse').addEventListener('click', () => switchRFQTab('browse'));
    
    // Close modal
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('rfq-modal').classList.add('hidden');
    });

    // Load initial data
    await loadSuppliers();
    await loadRFQs();
    await loadProducts();
    
    // Render default tab
    switchRFQTab('create');
}

/**
 * Switch between RFQ tabs
 */
function switchRFQTab(tabName) {
    currentTab = tabName;
    
    // Update tab button styles
    document.querySelectorAll('.rfq-tab-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#6b7280';
    });
    
    const activeBtn = document.getElementById(`rfq-tab-${tabName}`);
    activeBtn.style.background = '#6366f1';
    activeBtn.style.color = 'white';

    // Render content
    const content = document.getElementById('rfq-tab-content');
    
    switch(tabName) {
        case 'create':
            renderCreateRFQ(content);
            break;
        case 'list':
            renderRFQList(content);
            break;
        case 'browse':
            renderBrowseProducts(content);
            break;
    }
}

/**
 * Render Create RFQ Form
 */
function renderCreateRFQ(container) {
    container.innerHTML = `
        <div class="stack">
            <div class="grid cols-2" style="gap: 20px;">
                <!-- Material Name -->
                <div class="stack" style="grid-column: span 2;">
                    <label>Material Name *</label>
                    <input type="text" id="rfq-material-name" placeholder="e.g., Portland Cement Type I" required>
                </div>

                <!-- Description -->
                <div class="stack" style="grid-column: span 2;">
                    <label>Description</label>
                    <textarea id="rfq-description" rows="3" placeholder="Detailed specifications..."></textarea>
                </div>

                <!-- Quantity -->
                <div class="stack">
                    <label>Quantity *</label>
                    <input type="number" step="0.01" id="rfq-quantity" placeholder="100" required>
                </div>

                <!-- Unit -->
                <div class="stack">
                    <label>Unit *</label>
                    <input type="text" id="rfq-unit" placeholder="bags, m³, kg" required>
                </div>

                <!-- Required Date -->
                <div class="stack">
                    <label>Required By Date *</label>
                    <input type="date" id="rfq-required-date" required>
                </div>

                <!-- Budget Range -->
                <div class="stack">
                    <label>Budget Range (Optional)</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="number" step="0.01" id="rfq-budget-min" placeholder="Min $">
                        <input type="number" step="0.01" id="rfq-budget-max" placeholder="Max $">
                    </div>
                </div>

                <!-- Delivery Address -->
                <div class="stack" style="grid-column: span 2;">
                    <label>Delivery Address</label>
                    <input type="text" id="rfq-delivery-address" placeholder="Project site address...">
                </div>

                <!-- Special Requirements -->
                <div class="stack" style="grid-column: span 2;">
                    <label>Special Requirements</label>
                    <textarea id="rfq-special-requirements" rows="2" placeholder="Certifications, quality standards..."></textarea>
                </div>
            </div>

            <!-- Supplier Selection -->
            <div style="border-top: 2px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
                <label style="font-weight: bold; font-size: 1.1em; margin-bottom: 16px; display: block;">
                    🏢 Invite Suppliers (<span id="supplier-count">0</span> selected)
                </label>
                <div id="supplier-list" class="grid cols-3" style="gap: 12px; max-height: 300px; overflow-y: auto; padding: 16px; background: #f9fafb; border-radius: 12px;">
                    <p class="muted">Loading suppliers...</p>
                </div>
                <p class="muted" style="margin-top: 8px;">💡 Tip: Leave empty to publish publicly to all suppliers</p>
            </div>

            <!-- Submit Button -->
            <button id="submit-rfq-btn" class="btn-primary" style="width: 100%; padding: 16px; font-size: 1.1em; margin-top: 24px;">
                📤 Send RFQ to Suppliers
            </button>
        </div>
    `;

    // Populate supplier list
    renderSupplierCheckboxes();

    // Bind submit
    document.getElementById('submit-rfq-btn').addEventListener('click', submitRFQ);
}

/**
 * Render supplier checkboxes
 */
function renderSupplierCheckboxes() {
    const list = document.getElementById('supplier-list');
    const selectedSuppliers = new Set();

    if (suppliers.length === 0) {
        list.innerHTML = '<p class="muted" style="grid-column: span 3;">No suppliers available</p>';
        return;
    }

    // Filter out suppliers without company_id
    const validSuppliers = suppliers.filter(v => v.company_id != null);

    if (validSuppliers.length === 0) {
        list.innerHTML = '<p class="muted" style="grid-column: span 3;">No registered suppliers available. Suppliers must be registered in the system.</p>';
        return;
    }

    list.innerHTML = validSuppliers.map(vendor => `
        <label class="supplier-checkbox" style="display: flex; align-items: center; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; cursor: pointer;">
            <input type="checkbox" value="${vendor.company_id}" data-name="${vendor.name}" style="margin-right: 8px;">
            <span>${vendor.name}</span>
        </label>
    `).join('');

    // Update count
    list.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const label = e.target.closest('label');
            const companyId = parseInt(e.target.value);
            
            if (e.target.checked) {
                selectedSuppliers.add(companyId);
                label.style.borderColor = '#6366f1';
                label.style.background = '#eef2ff';
            } else {
                selectedSuppliers.delete(e.target.value);
                label.style.borderColor = '#d1d5db';
                label.style.background = 'transparent';
            }
            document.getElementById('supplier-count').textContent = selectedSuppliers.size;
        });
    });
}

/**
 * Submit RFQ
 */
async function submitRFQ() {
    const selectedCheckboxes = Array.from(document.querySelectorAll('.supplier-checkbox input:checked'));
    const invited_suppliers = selectedCheckboxes.map(cb => parseInt(cb.value));
    
    // Validate company IDs are valid integers
    const invalidSuppliers = invited_suppliers.filter(id => isNaN(id) || id === 0);
    if (invalidSuppliers.length > 0) {
        showMessage('Error: Invalid supplier selection. Please refresh and try again.', 'error');
        console.error('Invalid supplier IDs:', invalidSuppliers);
        return;
    }

    const rfqData = {
        requester_user_id: parseInt(state.user.id),
        material_name: document.getElementById('rfq-material-name').value,
        description: document.getElementById('rfq-description').value,
        quantity: document.getElementById('rfq-quantity').value,
        unit: document.getElementById('rfq-unit').value,
        required_by_date: document.getElementById('rfq-required-date').value,
        budget_range_min: document.getElementById('rfq-budget-min').value,
        budget_range_max: document.getElementById('rfq-budget-max').value,
        delivery_address: document.getElementById('rfq-delivery-address').value,
        special_requirements: document.getElementById('rfq-special-requirements').value,
        invited_suppliers: invited_suppliers
    };

    // Validation
    if (!rfqData.material_name || !rfqData.quantity || !rfqData.unit || !rfqData.required_by_date) {
        showMessage('Please fill in all required fields (*)', 'error');
        return;
    }

    console.log('Submitting RFQ with data:', rfqData); // Debug log

    try {
        const response = await fetch(`/api/projects/${state.currentProject.id}/rfqs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rfqData)
        });

        const data = await response.json();

        if (data.success) {
            showMessage(`RFQ created successfully! Invited ${rfqData.invited_suppliers.length} suppliers.`, 'success');
            
            // Clear form
            document.getElementById('rfq-material-name').value = '';
            document.getElementById('rfq-description').value = '';
            document.getElementById('rfq-quantity').value = '';
            document.getElementById('rfq-unit').value = '';
            document.getElementById('rfq-required-date').value = '';
            document.getElementById('rfq-budget-min').value = '';
            document.getElementById('rfq-budget-max').value = '';
            document.getElementById('rfq-delivery-address').value = '';
            document.getElementById('rfq-special-requirements').value = '';
            document.querySelectorAll('.supplier-checkbox input:checked').forEach(cb => {
                cb.checked = false;
                cb.closest('label').style.borderColor = '#d1d5db';
                cb.closest('label').style.background = 'transparent';
            });
            document.getElementById('supplier-count').textContent = '0';
            
            // Reload RFQs and switch to list tab
            await loadRFQs();
            setTimeout(() => switchRFQTab('list'), 2000);
        } else {
            showMessage(data.message || 'Failed to create RFQ', 'error');
        }
    } catch (error) {
        console.error('Error creating RFQ:', error);
        showMessage('Server error. Please try again.', 'error');
    }
}

/**
 * Render RFQ List
 */
function renderRFQList(container) {
    if (rfqList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px;">
                <span class="material-symbols-outlined" style="font-size: 64px; color: #d1d5db;">description</span>
                <p class="muted" style="margin: 16px 0;">No RFQs created yet</p>
                <button onclick="document.getElementById('rfq-tab-create').click()" class="btn-primary">
                    Create Your First RFQ
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="stack" style="gap: 16px;">
            ${rfqList.map(rfq => `
                <div class="card" style="padding: 24px; border: 2px solid #e5e7eb; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0 0 4px 0;">${rfq.material_name}</h3>
                            <p style="margin: 0; color: #6b7280;">${rfq.quantity} ${rfq.unit}</p>
                        </div>
                        <span style="padding: 8px 16px; border-radius: 9999px; font-size: 0.875em; font-weight: 600; ${
                            rfq.status === 'published' ? 'background: #d1fae5; color: #065f46;' :
                            rfq.status === 'closed' ? 'background: #e5e7eb; color: #374151;' :
                            'background: #fef3c7; color: #92400e;'
                        }">
                            ${rfq.status.toUpperCase()}
                        </span>
                    </div>

                    <div class="grid cols-4" style="gap: 16px; margin-bottom: 16px;">
                        <div>
                            <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Required By</p>
                            <p style="font-weight: 600; margin: 0;">${new Date(rfq.required_by_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Invited</p>
                            <p style="font-weight: 600; margin: 0;">${rfq.invited_count} suppliers</p>
                        </div>
                        <div>
                            <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Quotations</p>
                            <p style="font-weight: 600; margin: 0; color: #6366f1;">${rfq.quotation_count} received</p>
                        </div>
                        <div>
                            <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Price Range</p>
                            <p style="font-weight: 600; margin: 0;">
                                ${rfq.lowest_quote ? `$${parseFloat(rfq.lowest_quote).toFixed(2)} - $${parseFloat(rfq.highest_quote).toFixed(2)}` : 'N/A'}
                            </p>
                        </div>
                    </div>

                    <button onclick="window.rfqModule.viewRFQDetails(${rfq.id})" class="btn-primary" style="width: 100%;">
                        View ${rfq.quotation_count} Quotation${rfq.quotation_count !== 1 ? 's' : ''}
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render Browse Products
 */
function renderBrowseProducts(container) {
    if (products.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px;">
                <span class="material-symbols-outlined" style="font-size: 64px; color: #d1d5db;">inventory_2</span>
                <p class="muted">No products available</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <p class="muted" style="margin-bottom: 16px;">Browse supplier product catalogs and auto-fill RFQ details</p>
        <div class="grid cols-3" style="gap: 16px;">
            ${products.slice(0, 12).map(product => `
                <div class="card" style="padding: 20px; border: 2px solid #e5e7eb; border-radius: 12px;">
                    <h4 style="margin: 0 0 8px 0;">${product.product_name}</h4>
                    <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 16px 0;">${(product.description || '').substring(0, 80)}...</p>
                    <div class="stack" style="gap: 8px; margin-bottom: 16px;">
                        <p style="font-size: 0.875em; margin: 0;"><strong>Supplier:</strong> ${product.supplier_name}</p>
                        <p style="font-size: 0.875em; margin: 0;"><strong>Unit:</strong> ${product.unit}</p>
                        ${product.price_min ? `<p style="font-size: 0.875em; margin: 0;"><strong>Price:</strong> $${product.price_min} - $${product.price_max}</p>` : ''}
                    </div>
                    <button onclick="window.rfqModule.fillFromProduct(${product.id})" class="btn-primary" style="width: 100%;">
                        Use for RFQ
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * View RFQ Details (Quotations Modal)
 */
export async function viewRFQDetails(rfqId) {
    selectedRFQ = rfqList.find(r => r.id === rfqId);
    if (!selectedRFQ) return;

    // Load quotations
    try {
        const response = await fetch(`/api/rfqs/${rfqId}/quotations`);
        const data = await response.json();
        
        if (data.success) {
            quotations = data.quotations;
            renderQuotationsModal();
        }
    } catch (error) {
        console.error('Error loading quotations:', error);
        showMessage('Failed to load quotations', 'error');
    }
}

/**
 * Render Quotations Modal
 */
function renderQuotationsModal() {
    const modal = document.getElementById('rfq-modal');
    const infoDiv = document.getElementById('modal-rfq-info');
    const listDiv = document.getElementById('modal-quotations-list');

    infoDiv.innerHTML = `
        <h2 style="margin: 0 0 8px 0;">${selectedRFQ.material_name}</h2>
        <p style="margin: 0; color: #6b7280;">${selectedRFQ.quantity} ${selectedRFQ.unit} • Required by ${new Date(selectedRFQ.required_by_date).toLocaleDateString()}</p>
    `;

    if (quotations.length === 0) {
        listDiv.innerHTML = `
            <div style="text-align: center; padding: 48px;">
                <span class="material-symbols-outlined" style="font-size: 64px; color: #d1d5db;">schedule</span>
                <p class="muted">No quotations received yet</p>
            </div>
        `;
    } else {
        listDiv.innerHTML = `
            <div class="stack" style="gap: 16px;">
                ${quotations.map(quote => `
                    <div style="border: 2px solid ${quote.status === 'accepted' ? '#10b981' : '#e5e7eb'}; background: ${quote.status === 'accepted' ? '#d1fae5' : 'white'}; border-radius: 12px; padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                            <div>
                                <h3 style="margin: 0 0 4px 0;">${quote.supplier_name}</h3>
                                <p style="font-size: 0.875em; color: #6b7280; margin: 0;">${quote.supplier_email} • ${quote.supplier_phone}</p>
                                ${quote.supplier_avg_rating ? `<p style="font-size: 0.875em; color: #f59e0b; margin: 4px 0 0 0;">⭐ ${parseFloat(quote.supplier_avg_rating).toFixed(1)} rating</p>` : ''}
                            </div>
                            ${quote.status === 'accepted' ? '<span style="padding: 8px 16px; background: #10b981; color: white; border-radius: 9999px; font-size: 0.875em; font-weight: 600;">ACCEPTED</span>' : ''}
                        </div>

                        <div class="grid cols-4" style="gap: 16px; margin-bottom: 16px;">
                            <div>
                                <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Unit Price</p>
                                <p style="font-size: 1.5em; font-weight: bold; margin: 0; color: #6366f1;">$${parseFloat(quote.unit_price).toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Total Price</p>
                                <p style="font-size: 1.5em; font-weight: bold; margin: 0;">$${parseFloat(quote.total_price).toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Quantity</p>
                                <p style="font-weight: 600; margin: 0;">${quote.quantity_offered} ${quote.unit}</p>
                            </div>
                            <div>
                                <p style="font-size: 0.875em; color: #6b7280; margin: 0 0 4px 0;">Delivery</p>
                                <p style="font-weight: 600; margin: 0;">${new Date(quote.estimated_delivery_date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        ${quote.payment_terms ? `<p style="font-size: 0.875em; margin: 0 0 8px 0;"><strong>Payment Terms:</strong> ${quote.payment_terms}</p>` : ''}
                        ${quote.notes ? `<p style="font-size: 0.875em; margin: 0 0 16px 0;"><strong>Notes:</strong> ${quote.notes}</p>` : ''}

                        ${quote.status === 'submitted' ? `
                            <button onclick="window.rfqModule.acceptQuotation(${quote.id})" class="btn-primary" style="width: 100%;">
                                ✅ Accept This Quotation
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    modal.classList.remove('hidden');
}

/**
 * Accept Quotation
 */
export async function acceptQuotation(quotationId) {
    if (!confirm('Accept this quotation? This will reject all other quotes.')) return;

    try {
        const response = await fetch(`/api/quotations/${quotationId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Quotation accepted!', 'success');
            await loadRFQs();
            await viewRFQDetails(selectedRFQ.id);
        } else {
            showMessage('Failed to accept quotation', 'error');
        }
    } catch (error) {
        console.error('Error accepting quotation:', error);
        showMessage('Server error', 'error');
    }
}

/**
 * Fill form from product
 */
export function fillFromProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('rfq-material-name').value = product.product_name;
    document.getElementById('rfq-description').value = product.description || '';
    document.getElementById('rfq-unit').value = product.unit;
    if (product.price_min) document.getElementById('rfq-budget-min').value = product.price_min;
    if (product.price_max) document.getElementById('rfq-budget-max').value = product.price_max;

    switchRFQTab('create');
    showMessage('Product details filled. Complete the form and select suppliers.', 'info');
}

/**
 * Load suppliers
 */
async function loadSuppliers() {
    try {
        // Fetch vendors with their company IDs
        const response = await fetch('/api/vendors-with-ids');
        const data = await response.json();
        if (data.success) {
            suppliers = data.vendors; // Now contains {name, company_id}
            console.log(`Loaded ${suppliers.length} suppliers with IDs`);
            
            // Debug: Show which suppliers have valid company IDs
            const validSuppliers = suppliers.filter(s => s.company_id != null);
            const invalidSuppliers = suppliers.filter(s => s.company_id == null);
            
            if (invalidSuppliers.length > 0) {
                console.warn(`Warning: ${invalidSuppliers.length} suppliers without company IDs:`, 
                    invalidSuppliers.map(s => s.name));
            }
            
            console.log(`Valid suppliers for RFQ: ${validSuppliers.length}`);
        } else {
            console.error('Failed to load suppliers:', data.message);
            showMessage('Failed to load suppliers. Please refresh the page.', 'error');
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showMessage('Error loading suppliers. Please check your connection.', 'error');
    }
}

/**
 * Load RFQs
 */
async function loadRFQs() {
    try {
        const response = await fetch(`/api/projects/${state.currentProject.id}/rfqs`);
        const data = await response.json();
        if (data.success) {
            rfqList = data.rfqs;
            document.getElementById('rfq-count').textContent = rfqList.length;
            
            // If currently viewing list tab, refresh it
            if (currentTab === 'list') {
                const content = document.getElementById('rfq-tab-content');
                renderRFQList(content);
            }
        }
    } catch (error) {
        console.error('Error loading RFQs:', error);
    }
}

/**
 * Load Products
 */
async function loadProducts() {
    try {
        const response = await fetch('/api/products/browse');
        const data = await response.json();
        if (data.success) {
            products = data.products;
            
            // If currently viewing browse tab, refresh it
            if (currentTab === 'browse') {
                const content = document.getElementById('rfq-tab-content');
                renderBrowseProducts(content);
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

/**
 * Show Message
 */
function showMessage(message, type = 'info') {
    const messageEl = document.getElementById('rfq-message');
    messageEl.className = '';
    messageEl.classList.add('message', `message-${type}`);
    
    const bgColors = {
        success: '#d1fae5',
        error: '#fee2e2',
        info: '#dbeafe',
        warning: '#fef3c7'
    };
    
    const textColors = {
        success: '#065f46',
        error: '#991b1b',
        info: '#1e40af',
        warning: '#92400e'
    };
    
    messageEl.style.background = bgColors[type];
    messageEl.style.color = textColors[type];
    messageEl.style.display = 'block';
    messageEl.textContent = message;
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

/**
 * Export functions to window for onclick handlers
 */
window.rfqModule = {
    viewRFQDetails,
    acceptQuotation,
    fillFromProduct
};

/**
 * Refresh RFQs periodically (every 30 seconds)
 */
setInterval(() => {
    if (currentTab === 'list' && state.currentProject) {
        loadRFQs();
    }
}, 30000);