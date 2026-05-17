document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tableBody = document.getElementById('table-body');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const totalCount = document.getElementById('total-count');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-input');
    const serviceFilter = document.getElementById('service-filter');
    const modal = document.getElementById('view-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalBody = document.getElementById('modal-body');

    // Global Data State
    let requestData = [];
    let uniqueServices = new Set();

    // Initialize
    fetchData();

    // Event Listeners
    refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('fa-spin');
        fetchData().finally(() => {
            setTimeout(() => icon.classList.remove('fa-spin'), 500);
        });
    });

    searchInput.addEventListener('input', renderTable);
    serviceFilter.addEventListener('change', renderTable);
    
    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Fetch Data from API
    async function fetchData() {
        showState(loadingState);
        
        try {
            // Pointing to the local Express server we just created
            const response = await fetch('/api/requests');
            const result = await response.json();

            if (result.success) {
                requestData = result.data;
                updateFilters();
                renderTable();
            } else {
                throw new Error(result.error || 'Failed to fetch data');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showState(errorState);
            errorMessage.textContent = 'Could not connect to database. Make sure the server is running.';
        }
    }

    // Update Filter Options
    function updateFilters() {
        uniqueServices.clear();
        requestData.forEach(item => {
            if (item.service) uniqueServices.add(item.service);
        });

        // Keep 'all' option
        serviceFilter.innerHTML = '<option value="all">All Services</option>';
        
        uniqueServices.forEach(service => {
            const option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            serviceFilter.appendChild(option);
        });
    }

    // Render Table
    function renderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedService = serviceFilter.value;

        // Filter Data
        const filteredData = requestData.filter(item => {
            const matchesSearch = 
                (item.full_name && item.full_name.toLowerCase().includes(searchTerm)) ||
                (item.company_name && item.company_name.toLowerCase().includes(searchTerm)) ||
                (item.email && item.email.toLowerCase().includes(searchTerm));
            
            const matchesService = selectedService === 'all' || item.service === selectedService;

            return matchesSearch && matchesService;
        });

        // Update Total
        totalCount.textContent = filteredData.length;

        // Handle Empty State
        if (filteredData.length === 0) {
            if (requestData.length === 0) {
                showState(emptyState);
            } else {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:3rem;">No results match your search criteria.</td></tr>`;
                hideStates();
            }
            return;
        }

        // Render Rows
        tableBody.innerHTML = '';
        filteredData.forEach(item => {
            const date = new Date(item.created_at);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="td-id">#${item.id}</td>
                <td class="td-date">${formattedDate}</td>
                <td>
                    <div class="client-info">
                        <span class="client-name">${escapeHTML(item.full_name)}</span>
                        <div class="client-contact">
                            <a href="mailto:${escapeHTML(item.email)}"><i class="fa-regular fa-envelope"></i> ${escapeHTML(item.email)}</a>
                            ${item.phone ? `<a href="tel:${escapeHTML(item.phone)}"><i class="fa-solid fa-phone"></i> ${escapeHTML(item.phone)}</a>` : '<span style="opacity:0.5">No phone provided</span>'}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="company-info">
                        <span class="company-name">${escapeHTML(item.company_name || 'N/A')}</span>
                        <span class="business-type">${escapeHTML(item.business_type || 'N/A')}</span>
                    </div>
                </td>
                <td>
                    <span class="service-badge">${escapeHTML(item.service || 'General Inquiry')}</span>
                </td>
                <td class="td-message">
                    <div class="message-preview">${escapeHTML(item.message || 'No message provided.')}</div>
                </td>
                <td>
                    <button class="btn btn-sm view-btn" data-id="${item.id}">
                        <i class="fa-regular fa-eye"></i> View Full
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Add event listeners to view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const request = requestData.find(r => r.id === id);
                if (request) openModal(request);
            });
        });

        hideStates();
    }

    // Open Modal with Details
    function openModal(item) {
        const date = new Date(item.created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        modalBody.innerHTML = `
            <div class="modal-grid">
                <div class="modal-item">
                    <h4>Client Name</h4>
                    <p>${escapeHTML(item.full_name)}</p>
                </div>
                <div class="modal-item">
                    <h4>Submission Date</h4>
                    <p>${formattedDate}</p>
                </div>
                <div class="modal-item">
                    <h4>Email Address</h4>
                    <p><a href="mailto:${escapeHTML(item.email)}" style="color:var(--primary);text-decoration:none;">${escapeHTML(item.email)}</a></p>
                </div>
                <div class="modal-item">
                    <h4>Phone Number</h4>
                    <p>${item.phone ? escapeHTML(item.phone) : '<span style="opacity:0.5">Not provided</span>'}</p>
                </div>
                <div class="modal-item">
                    <h4>Company Name</h4>
                    <p>${escapeHTML(item.company_name || 'Not provided')}</p>
                </div>
                <div class="modal-item">
                    <h4>Business Type</h4>
                    <p>${escapeHTML(item.business_type || 'Not provided')}</p>
                </div>
                <div class="modal-item" style="grid-column: 1 / -1;">
                    <h4>Service Requested</h4>
                    <p><span class="service-badge">${escapeHTML(item.service || 'General Inquiry')}</span></p>
                </div>
            </div>
            <div class="modal-item">
                <h4>Message Details</h4>
                <div class="modal-message">${escapeHTML(item.message || 'No message provided.')}</div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    // Utility: Show specific state, hide others and table
    function showState(stateElement) {
        document.querySelector('table').style.opacity = '0';
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');
        errorState.classList.add('hidden');
        stateElement.classList.remove('hidden');
    }

    // Utility: Hide all states, show table
    function hideStates() {
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');
        errorState.classList.add('hidden');
        document.querySelector('table').style.opacity = '1';
    }

    // Utility: HTML Escaper to prevent XSS
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
