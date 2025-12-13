// procura/js/pages/rfq/create.js

import { showMessage } from './index.js';

export function renderCreateRFQ(container, projectId) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Material Name -->
                <div class="md:col-span-2">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Material Name *</label>
                    <input type="text" id="material_name" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" 
                           placeholder="e.g., Portland Cement Type I" required>
                </div>

                <!-- Description -->
                <div class="md:col-span-2">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea id="description" rows="3" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"
                              placeholder="Detailed specifications..."></textarea>
                </div>

                <!-- Quantity -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                    <input type="number" step="0.01" id="quantity" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" required>
                </div>

                <!-- Unit -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Unit *</label>
                    <input type="text" id="unit" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" 
                           placeholder="bags, m³, kg" required>
                </div>

                <!-- Required Date -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Required By Date *</label>
                    <input type="date" id="required_by_date" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" required>
                </div>

                <!-- Budget Range -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Budget Range (Optional)</label>
                    <div class="flex gap-2">
                        <input type="number" step="0.01" id="budget_min" class="w-1/2 px-4 py-3 border-2 border-gray-300 rounded-xl" placeholder="Min $">
                        <input type="number" step="0.01" id="budget_max" class="w-1/2 px-4 py-3 border-2 border-gray-300 rounded-xl" placeholder="Max $">
                    </div>
                </div>

                <!-- Delivery Address -->
                <div class="md:col-span-2">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Delivery Address</label>
                    <input type="text" id="delivery_address" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">
                </div>

                <!-- Special Requirements -->
                <div class="md:col-span-2">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Special Requirements</label>
                    <textarea id="special_requirements" rows="2" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"></textarea>
                </div>
            </div>

            <!-- Supplier Selection -->
            <div class="border-t-2 pt-6">
                <label class="block text-lg font-bold text-gray-800 mb-4">
                    🏢 Invite Suppliers (<span id="supplier-count">0</span> selected)
                </label>
                <div id="supplier-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-xl">
                    <p class="text-gray-600">Loading suppliers...</p>
                </div>
                <p class="text-sm text-gray-600 mt-2">💡 Tip: Leave empty to publish publicly to all suppliers</p>
            </div>

            <!-- Submit Button -->
            <button id="btn-submit-rfq" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700">
                📤 Send RFQ to Suppliers
            </button>
        </div>
    `;

    // Load suppliers
    loadSuppliers();

    // Submit handler
    document.getElementById('btn-submit-rfq').addEventListener('click', () => submitRFQ(projectId));
}

async function loadSuppliers() {
    try {
        const response = await fetch('/api/vendors');
        const data = await response.json();
        
        if (data.success) {
            const supplierList = document.getElementById('supplier-list');
            const selectedSuppliers = new Set();
            
            supplierList.innerHTML = data.vendors.map(vendor => `
                <label class="flex items-center p-4 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-indigo-300 supplier-checkbox">
                    <input type="checkbox" value="${vendor}" class="w-5 h-5 text-indigo-600 mr-3">
                    <span class="font-medium">${vendor}</span>
                </label>
            `).join('');

            // Update count on checkbox change
            supplierList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedSuppliers.add(e.target.value);
                        e.target.parentElement.classList.add('border-indigo-600', 'bg-indigo-50');
                    } else {
                        selectedSuppliers.delete(e.target.value);
                        e.target.parentElement.classList.remove('border-indigo-600', 'bg-indigo-50');
                    }
                    document.getElementById('supplier-count').textContent = selectedSuppliers.size;
                });
            });
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

async function submitRFQ(projectId) {
    // Get form values
    const rfqData = {
        requester_user_id: parseInt(sessionStorage.getItem('user_id')),
        material_name: document.getElementById('material_name').value,
        description: document.getElementById('description').value,
        quantity: document.getElementById('quantity').value,
        unit: document.getElementById('unit').value,
        required_by_date: document.getElementById('required_by_date').value,
        budget_range_min: document.getElementById('budget_min').value,
        budget_range_max: document.getElementById('budget_max').value,
        delivery_address: document.getElementById('delivery_address').value,
        special_requirements: document.getElementById('special_requirements').value,
        invited_suppliers: Array.from(document.querySelectorAll('.supplier-checkbox input:checked')).map(cb => cb.value)
    };

    // Validation
    if (!rfqData.material_name || !rfqData.quantity || !rfqData.unit || !rfqData.required_by_date) {
        showMessage('Please fill in all required fields (*)', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/projects/${projectId}/rfqs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rfqData)
        });

        const data = await response.json();

        if (data.success) {
            showMessage(`RFQ created successfully! Invited ${rfqData.invited_suppliers.length} suppliers.`, 'success');
            
            // Clear form
            document.getElementById('material_name').value = '';
            document.getElementById('description').value = '';
            document.getElementById('quantity').value = '';
            document.getElementById('unit').value = '';
            document.getElementById('required_by_date').value = '';
            document.querySelectorAll('.supplier-checkbox input:checked').forEach(cb => cb.checked = false);
            
            // Switch to list tab after 2 seconds
            setTimeout(() => {
                document.getElementById('tab-list').click();
            }, 2000);
        } else {
            showMessage(data.message || 'Failed to create RFQ', 'error');
        }
    } catch (error) {
        console.error('Error creating RFQ:', error);
        showMessage('Server error. Please try again.', 'error');
    }
}