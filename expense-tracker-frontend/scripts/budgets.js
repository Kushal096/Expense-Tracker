const addBudgetBtn = document.getElementById("addBudgetBtn");
const budgetModal = document.getElementById("budgetModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBudgetBtn = document.getElementById("cancelBudgetBtn");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");

const editBudgetModal = document.getElementById("editBudgetModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditBudgetBtn = document.getElementById("cancelEditBudgetBtn");
const updateBudgetBtn = document.getElementById("updateBudgetBtn");

const budgetTableBody = document.getElementById("budgetTableBody") || document.querySelector(".data-table tbody");

const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const deleteBudgetCategoryName = document.getElementById("deleteBudgetCategoryName");

const searchBudgetInput = document.getElementById("searchBudgetInput");
const filterStatus = document.getElementById("filterStatus");

let budgets = [];
let expenses = [];
let categories = [];
let editingBudgetId = null;
let pendingDeleteBudgetId = null;
let isDataLoading = true;
let loadErrorMessage = "";

// Initialize budgets from localStorage
function loadBudgetsFromStorage() {
    const stored = localStorage.getItem('user_budgets');
    if (stored) {
        try {
            budgets = JSON.parse(stored);
        } catch (e) {
            budgets = [];
        }
    } else {
        budgets = [];
    }
}

function saveBudgetsToStorage() {
    localStorage.setItem('user_budgets', JSON.stringify(budgets));
}

function getReadableErrorMessage(error, fallbackMessage) {
    const raw = String(error?.message || "").trim();
    if (!raw) return fallbackMessage;
    if (raw === "Failed to fetch") {
        return "Network error. Please check your connection and try again.";
    }
    return raw;
}

function calculateCurrentMonthSpent(categoryId) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return exp.category_id === categoryId &&
                   expDate.getMonth() === currentMonth &&
                   expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + Number(exp.amount), 0);
}

function getStatusInfo(usagePercentage) {
    if (usagePercentage <= 80) return { label: 'ON TRACK', className: 'status-on-track' };
    if (usagePercentage <= 100) return { label: 'NEAR LIMIT', className: 'status-near-limit' };
    return { label: 'EXCEEDED', className: 'status-exceeded' };
}

function renderBudgets() {
    const tbody = budgetTableBody;
    if (!tbody) return;

    if (isDataLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-state-row">
                    <span class="table-state-spinner" aria-hidden="true"></span>
                    Loading budgets...
                </td>
            </tr>
        `;
        return;
    }

    if (loadErrorMessage) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-state-row table-state-error">${loadErrorMessage}</td>
            </tr>
        `;
        return;
    }

    const searchTerm = (searchBudgetInput?.value || "").toLowerCase();
    const statusFilter = filterStatus?.value || "";

    let totalLimit = 0;
    
    // Combine budgets with computed values
    let displayData = budgets.map(budget => {
        const category = categories.find((c) => c.id === budget.category_id);
        const categoryName = category ? category.name : 'Unknown';
        const amountSpent = calculateCurrentMonthSpent(budget.category_id);
        const usagePercentage = budget.limit > 0 ? (amountSpent / budget.limit) * 100 : 0;
        const statusInfo = getStatusInfo(usagePercentage);
        
        return {
            ...budget,
            categoryName,
            amountSpent,
            usagePercentage,
            statusInfo
        };
    });

    // Apply filters
    displayData = displayData.filter(item => {
        const matchSearch = item.categoryName.toLowerCase().includes(searchTerm);
        let matchStatus = true;
        if (statusFilter === "ON_TRACK") matchStatus = item.statusInfo.label === 'ON TRACK';
        else if (statusFilter === "NEAR_LIMIT") matchStatus = item.statusInfo.label === 'NEAR LIMIT';
        else if (statusFilter === "EXCEEDED") matchStatus = item.statusInfo.label === 'EXCEEDED';
        
        return matchSearch && matchStatus;
    });

    tbody.innerHTML = "";

    if (!displayData.length) {
        const emptyMessage = budgets.length
            ? "No budgets match your current filters."
            : "No budgets set yet. Add your first budget limit.";

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-state-row">
                    ${emptyMessage}
                </td>
            </tr>
        `;
    } else {
        displayData.forEach((item) => {
            totalLimit += Number(item.limit) || 0;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.categoryName}</td>
                <td>$${Number(item.limit).toFixed(2)}</td>
                <td>$${item.amountSpent.toFixed(2)}</td>
                <td>${item.usagePercentage.toFixed(1)}%</td>
                <td><span class="status-pill ${item.statusInfo.className}">${item.statusInfo.label}</span></td>
                <td class="actions">
                    <button type="button" class="icon-action-btn" data-action="edit" data-id="${item.id}" aria-label="Edit budget">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="icon-action-btn icon-action-btn-delete" data-action="delete" data-id="${item.id}" aria-label="Delete budget">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const countEl = document.getElementById("totalBudgetCount");
    const amountEl = document.getElementById("totalBudgetAmount");
    if (countEl) countEl.textContent = `Total Budgets (${displayData.length})`;
    if (amountEl) amountEl.textContent = `$${totalLimit.toFixed(2)}`;
}

function populateCategorySelects() {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    
    // Filter out categories that already have a budget for the add modal
    const availableCategories = expenseCategories.filter(c => !budgets.find(b => b.category_id === c.id));

    const budgetCategorySelect = document.getElementById("budgetCategory");

    if (budgetCategorySelect) {
        budgetCategorySelect.innerHTML = '<option value="">Select a category</option>' +
            availableCategories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    }
}

function closeCreateModal() {
    budgetModal.style.display = "none";
}

function closeEditModal() {
    editBudgetModal.style.display = "none";
    editingBudgetId = null;
}

function closeDeleteModal() {
    if (confirmDeleteModal) confirmDeleteModal.style.display = "none";
    pendingDeleteBudgetId = null;
}

if (addBudgetBtn) {
    addBudgetBtn.addEventListener("click", () => {
        populateCategorySelects(); // Refresh to ensure we don't show categories that already have budgets
        document.getElementById("budgetLimit").value = "";
        budgetModal.style.display = "flex";
    });
}

closeModalBtn?.addEventListener("click", closeCreateModal);
cancelBudgetBtn?.addEventListener("click", closeCreateModal);
closeEditModalBtn?.addEventListener("click", closeEditModal);
cancelEditBudgetBtn?.addEventListener("click", closeEditModal);
closeDeleteModalBtn?.addEventListener("click", closeDeleteModal);
cancelDeleteBtn?.addEventListener("click", closeDeleteModal);

window.addEventListener("click", (e) => {
    if (e.target === budgetModal) closeCreateModal();
    if (e.target === editBudgetModal) closeEditModal();
    if (e.target === confirmDeleteModal) closeDeleteModal();
});

searchBudgetInput?.addEventListener('input', renderBudgets);
filterStatus?.addEventListener('change', renderBudgets);

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) {
        return;
    }
    
    budgetTableBody?.addEventListener("click", onBudgetTableClick);
    confirmDeleteBtn?.addEventListener("click", handleConfirmDeleteBudget);

    loadBudgetsFromStorage();
    
    isDataLoading = true;
    loadErrorMessage = "";
    renderBudgets();

    try {
        [expenses, categories] = await Promise.all([
            apiCall('/expenses/'),
            apiCall('/categories/')
        ]);

        populateCategorySelects();
        loadErrorMessage = "";
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to load data right now.");
        loadErrorMessage = `Could not load data. ${message}`;
        if (typeof showNotification === 'function') {
            showNotification(loadErrorMessage, 'error', 4000);
        }
        console.error("Error loading data:", error);
    } finally {
        isDataLoading = false;
        renderBudgets();
    }
});

function createBudget(e) {
    e.preventDefault();

    const category_id = parseInt(document.getElementById("budgetCategory").value);
    const limit = parseFloat(document.getElementById("budgetLimit").value);

    if (!category_id || isNaN(limit) || limit <= 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a valid category and provide a budget limit greater than 0.', 'error');
        } else {
            alert('Please select a valid category and provide a budget limit greater than 0.');
        }
        return;
    }
    
    // Check if budget already exists for this category
    if (budgets.find(b => b.category_id === category_id)) {
        if (typeof showNotification === 'function') {
            showNotification('A budget for this category already exists.', 'error');
        } else {
            alert('A budget for this category already exists.');
        }
        return;
    }

    const newBudget = {
        id: Date.now(), // Generate a simple unique ID
        category_id,
        limit
    };

    budgets.push(newBudget);
    saveBudgetsToStorage();
    renderBudgets();
    closeCreateModal();
    
    if (typeof showNotification === 'function') {
        showNotification('Budget created successfully!', 'success');
    }
}

if (saveBudgetBtn) saveBudgetBtn.addEventListener("click", createBudget);

function openEditModal(id) {
    const budget = budgets.find((b) => b.id === id);
    if (!budget) return;

    editingBudgetId = id;
    
    const category = categories.find(c => c.id === budget.category_id);
    document.getElementById("editBudgetCategory").value = category ? category.name : "Unknown";
    document.getElementById("editBudgetLimit").value = budget.limit;

    editBudgetModal.style.display = "flex";
}

function executeEditBudget(e) {
    e.preventDefault();

    if (!editingBudgetId) return;

    const limit = parseFloat(document.getElementById("editBudgetLimit").value);

    if (isNaN(limit) || limit <= 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please provide a valid budget limit greater than 0.', 'error');
        } else {
            alert('Please provide a valid budget limit greater than 0.');
        }
        return;
    }

    budgets = budgets.map((b) => {
        if (b.id === editingBudgetId) {
            return { ...b, limit };
        }
        return b;
    });

    saveBudgetsToStorage();
    renderBudgets();
    closeEditModal();
    
    if (typeof showNotification === 'function') {
        showNotification('Budget updated successfully!', 'success');
    }
}

if (updateBudgetBtn) updateBudgetBtn.addEventListener("click", executeEditBudget);

function onBudgetTableClick(event) {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    const id = Number(actionButton.dataset.id);
    if (!id) return;

    if (action === "edit") {
        openEditModal(id);
        return;
    }

    if (action === "delete") {
        openDeleteBudgetModal(id);
    }
}

function openDeleteBudgetModal(id) {
    const budget = budgets.find((b) => b.id === id);
    if (!budget) return;

    pendingDeleteBudgetId = id;

    if (deleteBudgetCategoryName) {
        const category = categories.find(c => c.id === budget.category_id);
        deleteBudgetCategoryName.textContent = category ? category.name : "this category";
    }

    if (confirmDeleteModal) {
        confirmDeleteModal.style.display = "flex";
    }
}

function handleConfirmDeleteBudget() {
    if (!pendingDeleteBudgetId) return;

    const deletingId = pendingDeleteBudgetId;

    budgets = budgets.filter((b) => b.id !== deletingId);
    saveBudgetsToStorage();
    
    closeDeleteModal();
    renderBudgets();
    
    if (typeof showNotification === 'function') {
        showNotification('Budget deleted successfully!', 'success');
    }
}
