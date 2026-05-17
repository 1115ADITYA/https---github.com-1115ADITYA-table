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
                <td style="white-space: nowrap;">
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm view-btn" data-id="${item.id}" title="View">
                            <i class="fa-regular fa-eye"></i>
                        </button>
                        <button class="btn btn-sm edit-btn" style="background: rgba(99,102,241,0.1); color: var(--primary); border: 1px solid rgba(99,102,241,0.2);" data-id="${item.id}" title="Edit">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}" title="Delete">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
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

        // Add event listeners to edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const request = requestData.find(r => r.id === id);
                if (request) openEditModal(request);
            });
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
                    deleteRequest(id);
                }
            });
        });

        hideStates();
    }

    // Delete Request
    async function deleteRequest(id) {
        try {
            const response = await fetch(`/api/requests/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                // Remove from local state
                requestData = requestData.filter(item => item.id !== id);
                updateFilters();
                renderTable();
            } else {
                alert('Failed to delete: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error deleting record.');
        }
    }

    // Edit Modal Logic
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeEditBtns = document.querySelectorAll('.close-edit-modal');

    closeEditBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            editModal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.remove('active');
        }
    });

    function openEditModal(item) {
        document.getElementById('edit-id').value = item.id;
        document.getElementById('edit-full-name').value = item.full_name || '';
        document.getElementById('edit-company-name').value = item.company_name || '';
        document.getElementById('edit-email').value = item.email || '';
        document.getElementById('edit-phone').value = item.phone || '';
        document.getElementById('edit-business-type').value = item.business_type || '';
        
        // Select service or default
        const serviceSelect = document.getElementById('edit-service');
        if (item.service) {
            const exists = Array.from(serviceSelect.options).some(opt => opt.value === item.service);
            if (!exists) {
                const newOpt = new Option(item.service, item.service);
                serviceSelect.add(newOpt);
            }
            serviceSelect.value = item.service;
        } else {
            serviceSelect.value = 'chatbot';
        }
        
        document.getElementById('edit-message').value = item.message || '';
        editModal.classList.add('active');
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const payload = {
            full_name: document.getElementById('edit-full-name').value,
            company_name: document.getElementById('edit-company-name').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            business_type: document.getElementById('edit-business-type').value,
            service: document.getElementById('edit-service').value,
            message: document.getElementById('edit-message').value
        };

        const submitBtn = editForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/api/requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.success) {
                // Update local state
                const index = requestData.findIndex(item => item.id == id);
                if (index !== -1) {
                    requestData[index] = { ...requestData[index], ...result.data };
                }
                editModal.classList.remove('active');
                updateFilters();
                renderTable();
            } else {
                alert('Failed to update: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating:', error);
            alert('Error updating record.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

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
