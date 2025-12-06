// procura/js/pages/rfq/index.js

import { renderCreateRFQ } from './create.js';
import { renderRFQList } from './list.js';
import { renderBrowseProducts } from './browse.js';

export function initRFQPage(projectId) {
    const container = document.getElementById('app-content');
    
    container.innerHTML = `
        <div class="rfq-management-container">
            <!-- Header -->
            <div class="rfq-header bg-white rounded-2xl shadow-xl p-8 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-4xl font-bold text-gray-800 mb-2">Request for Quotation (RFQ)</h1>
                        <p class="text-gray-600">Create RFQs and compare supplier quotations</p>
                    </div>
                    <svg class="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                </div>
            </div>

            <!-- Message Area -->
            <div id="rfq-message" class="hidden mb-6 p-4 rounded-xl"></div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-2xl shadow-xl mb-6">
                <div class="flex border-b">
                    <button id="tab-create" class="tab-button flex-1 py-4 px-6 font-semibold bg-indigo-600 text-white rounded-tl-2xl">
                        📝 Create RFQ
                    </button>
                    <button id="tab-list" class="tab-button flex-1 py-4 px-6 font-semibold text-gray-600 hover:bg-gray-50">
                        👁️ My RFQs (<span id="rfq-count">0</span>)
                    </button>
                    <button id="tab-browse" class="tab-button flex-1 py-4 px-6 font-semibold text-gray-600 hover:bg-gray-50 rounded-tr-2xl">
                        📦 Browse Products
                    </button>
                </div>

                <!-- Tab Content -->
                <div id="rfq-tab-content" class="p-8"></div>
            </div>
        </div>
    `;

    // Initialize tab switching
    const tabs = {
        create: document.getElementById('tab-create'),
        list: document.getElementById('tab-list'),
        browse: document.getElementById('tab-browse')
    };

    const contentArea = document.getElementById('rfq-tab-content');

    // Tab click handlers
    tabs.create.addEventListener('click', () => switchTab('create'));
    tabs.list.addEventListener('click', () => switchTab('list'));
    tabs.browse.addEventListener('click', () => switchTab('browse'));

    function switchTab(tabName) {
        // Update tab styles
        Object.entries(tabs).forEach(([name, button]) => {
            if (name === tabName) {
                button.className = 'tab-button flex-1 py-4 px-6 font-semibold bg-indigo-600 text-white rounded-t-2xl';
            } else {
                button.className = 'tab-button flex-1 py-4 px-6 font-semibold text-gray-600 hover:bg-gray-50';
            }
        });

        // Render content
        switch(tabName) {
            case 'create':
                renderCreateRFQ(contentArea, projectId);
                break;
            case 'list':
                renderRFQList(contentArea, projectId);
                break;
            case 'browse':
                renderBrowseProducts(contentArea, projectId);
                break;
        }
    }

    // Load initial tab
    switchTab('create');
    
    // Load RFQ count
    loadRFQCount(projectId);
}

async function loadRFQCount(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/rfqs`);
        const data = await response.json();
        if (data.success) {
            document.getElementById('rfq-count').textContent = data.rfqs.length;
        }
    } catch (error) {
        console.error('Error loading RFQ count:', error);
    }
}

export function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('rfq-message');
    messageDiv.className = `mb-6 p-4 rounded-xl ${
        type === 'success' ? 'bg-green-100 text-green-800' :
        type === 'error' ? 'bg-red-100 text-red-800' :
        'bg-blue-100 text-blue-800'
    }`;
    messageDiv.textContent = message;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}