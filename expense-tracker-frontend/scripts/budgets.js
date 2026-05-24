const addBudgetBtn = document.getElementById("addBudgetBtn");
const budgetModal = document.getElementById("budgetModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBudgetBtn = document.getElementById("cancelBudgetBtn");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");

const editBudgetModal = document.getElementById("editBudgetModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditBudgetBtn = document.getElementById("cancelEditBudgetBtn");
const updateBudgetBtn = document.getElementById("updateBudgetBtn");

// const searchBudgetInput = document.getElementById("searchBudgetInput");
const filterCategoryInput = document.getElementById("filterBudgetCategory");
const filterStatusInput = document.getElementById("filterBudgetStatus");

const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

let budgets = [];
let categories = [];
let budgetSummary = null;
let editingBudgetId = null;
let deletingBudgetId = null;

function getCategoriesList(categoriesData) {
    if (Array.isArray(categoriesData?.items)) {
        return categoriesData.items;
    }

    if (Array.isArray(categoriesData)) {
        return categoriesData;
    }

    return [];
}

function getLocalISODate(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

function normalizeText(value) {
    return String(value ?? "").toLowerCase().trim();
}

function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function getFilteredBudgets() {
    // const searchTerm = normalizeText(searchBudgetInput?.value);
    const categoryId = filterCategoryInput?.value || "";
    const status = filterStatusInput?.value || "";

    return budgets.filter((budget) => {
        const category = categories.find((c) => c.id === budget.category_id);
        const categoryName = normalizeText(category?.name || "Unknown");

        // if (searchTerm && !categoryName.includes(searchTerm)) {
        //     return false;
        // }

        if (categoryId && String(budget.category_id) !== String(categoryId)) {
            return false;
        }

        if (status) {
            const spent = Number(budget.spent_amount ?? budget.spent ?? 0);
            const usagePercent = budget.limit_amount > 0
                ? (spent / budget.limit_amount) * 100
                : 0;
            if (status === "within" && usagePercent > 100) return false;
            if (status === "exceeded" && usagePercent <= 100) return false;
            if (status === "warning" && (usagePercent <= 80 || usagePercent > 100)) return false;
        }

        return true;
    });
}

function getBudgetStatus(usagePercent) {
    if (usagePercent > 100) return "exceeded";
    if (usagePercent > 80) return "warning";
    return "within";
}

function renderBudgets() {
    const tbody = document.getElementById("budgetTableBody") || document.querySelector("table tbody");
    if (!tbody) return;

    const filteredBudgets = getFilteredBudgets();
    tbody.innerHTML = "";

    if (!filteredBudgets.length) {
        tbody.innerHTML = `
            <tr class="table-state-row">
                <td colspan="6">No budgets match the current filters.</td>
            </tr>
        `;
        return;
    }

    filteredBudgets.forEach((budget) => {
        const category = categories.find((c) => c.id === budget.category_id) || {};
        const spent = Number(budget.spent_amount ?? budget.spent ?? 0);
        const limit = budget.limit_amount || 0;
        const usagePercent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        const status = getBudgetStatus(usagePercent);
        const statusLabel = status === "within" ? "On Track" : status === "warning" ? "Warning" : "Exceeded";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${category.name || "Unknown"}</td>
            <td>$${limit.toFixed(2)}</td>
            <td>$${spent.toFixed(2)}</td>
            <td>${usagePercent}%</td>
            <td>${statusLabel}</td>
            <td class="actions">
                <button class="icon-action-btn edit-btn" data-budget-id="${budget.id}" title="Edit">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="icon-action-btn icon-action-btn-delete delete-btn" data-budget-id="${budget.id}" title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const budgetId = btn.dataset.budgetId;
            openEditBudgetModal(budgetId);
        });
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const budgetId = btn.dataset.budgetId;
            openDeleteConfirmation(budgetId);
        });
    });
}

function updateBudgetSummary() {
    if (!budgetSummary) return;

    const totalBudget = budgetSummary.total_limit ?? budgetSummary.total_budget ?? 0;
    const totalSpent = budgetSummary.total_spent || 0;

    document.getElementById("totalBudgetAmount").textContent = `$${totalBudget.toFixed(2)}`;
    document.getElementById("totalSpentAmount").textContent = `$${totalSpent.toFixed(2)}`;
}
// bugfix
async function loadBudgets() {
    try {
        showLoading();
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const [budgetsData, summaryData, categoriesData] = await Promise.all([
            apiCall(`/budgets?month=${month}&year=${year}`),
            apiCall(`/budgets/summary?month=${month}&year=${year}`),
            apiCall("/categories/"),
        ]);

        budgets = budgetsData.items || [];
        budgetSummary = summaryData;
        categories = getCategoriesList(categoriesData).filter((category) => category.type === "expense");

        populateFilters();
        updateBudgetSummary();
        renderBudgets();
        hideLoading();
    } catch (error) {
        console.error("Error loading budgets:", error);
        hideLoading();
        showNotification("Failed to load budgets: " + error.message, 'error');
    }
}

function populateFilters() {
    const categorySelect = document.getElementById("filterBudgetCategory");
    const categorySelectModal = document.getElementById("budgetCategory");
    const categorySelectEditModal = document.getElementById("editBudgetCategory");

    categorySelect.innerHTML = '<option value="">All Categories</option>';
    categorySelectModal.innerHTML = "";
    categorySelectEditModal.innerHTML = "";

    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);

        const modalOption = option.cloneNode(true);
        categorySelectModal.appendChild(modalOption);

        const editModalOption = option.cloneNode(true);
        categorySelectEditModal.appendChild(editModalOption);
    });
}

function openBudgetModal() {
    editingBudgetId = null;
    document.getElementById("modalTitle").textContent = "New Budget";
    document.getElementById("budgetLimit").value = "";
    document.getElementById("budgetMonth").value = getCurrentMonth();
    document.getElementById("budgetCategory").value = "";
    budgetModal.classList.add("active");
}

function closeAddBudgetModal() {
    budgetModal.classList.remove("active");
}

function openEditBudgetModal(budgetId) {
    const budget = budgets.find((b) => b.id === parseInt(budgetId));
    if (!budget) return;

    editingBudgetId = budgetId;
    document.getElementById("editModalTitle").textContent = "Edit Budget";
    document.getElementById("editBudgetCategory").value = budget.category_id;
    document.getElementById("editBudgetLimit").value = budget.limit_amount;
    editBudgetModal.classList.add("active");
}

function closeEditBudgetModal() {
    editBudgetModal.classList.remove("active");
}

function openDeleteConfirmation(budgetId) {
    deletingBudgetId = budgetId;
    confirmDeleteModal.classList.add("active");
}

function closeDeleteConfirmation() {
    deletingBudgetId = null;
    confirmDeleteModal.classList.remove("active");
}

async function saveBudget() {
    const categoryId = document.getElementById("budgetCategory").value;
    const limitAmount = parseFloat(document.getElementById("budgetLimit").value);
    const month = document.getElementById("budgetMonth").value;

    if (!categoryId) {
        showNotification("Please select a category", "error");
        return;
    }

    if (isNaN(limitAmount) || limitAmount <= 0) {
        showNotification("Please enter a valid budget limit", "error");
        return;
    }

    if (!month) {
        showNotification("Please select a month", "error");
        return;
    }

    try {
        showLoading();
        const [yearPart, monthPart] = month.split("-");
        const budgetData = {
            category_id: parseInt(categoryId),
            limit_amount: limitAmount,
            month: parseInt(monthPart, 10),
            year: parseInt(yearPart, 10),
        };

        await apiCall("/budgets/", "POST", budgetData);
        showNotification("Budget created successfully", "success");
        closeAddBudgetModal();
        await loadBudgets();
        hideLoading();
    } catch (error) {
        console.error("Error creating budget:", error);
        hideLoading();
        showNotification("Failed to create budget: " + error.message, "error");
    }
}

async function updateBudget() {
    if (!editingBudgetId) return;

    const limitAmount = parseFloat(document.getElementById("editBudgetLimit").value);

    if (isNaN(limitAmount) || limitAmount <= 0) {
        showNotification("Please enter a valid budget limit", "error");
        return;
    }

    try {
        showLoading();
        const budgetData = {
            limit_amount: limitAmount,
        };

        await apiCall(`/budgets/${editingBudgetId}`, "PATCH", budgetData);
        showNotification("Budget updated successfully", "success");
        closeEditBudgetModal();
        await loadBudgets();
        hideLoading();
    } catch (error) {
        console.error("Error updating budget:", error);
        hideLoading();
        showNotification("Failed to update budget: " + error.message, "error");
    }
}

async function deleteBudget() {
    if (!deletingBudgetId) return;

    try {
        showLoading();
        await apiCall(`/budgets/${deletingBudgetId}`, "DELETE");
        showNotification("Budget deleted successfully", "success");
        closeDeleteConfirmation();
        await loadBudgets();
        hideLoading();
    } catch (error) {
        console.error("Error deleting budget:", error);
        hideLoading();
        showNotification("Failed to delete budget: " + error.message, "error");
    }
}

function setupEventListeners() {
    addBudgetBtn.addEventListener("click", openBudgetModal);
    closeModalBtn.addEventListener("click", closeAddBudgetModal);
    cancelBudgetBtn.addEventListener("click", closeAddBudgetModal);
    saveBudgetBtn.addEventListener("click", saveBudget);

    closeEditModalBtn.addEventListener("click", closeEditBudgetModal);
    cancelEditBudgetBtn.addEventListener("click", closeEditBudgetModal);
    updateBudgetBtn.addEventListener("click", updateBudget);

    closeDeleteModalBtn.addEventListener("click", closeDeleteConfirmation);
    cancelDeleteBtn.addEventListener("click", closeDeleteConfirmation);
    confirmDeleteBtn.addEventListener("click", deleteBudget);

    // searchBudgetInput.addEventListener("input", renderBudgets);
    filterCategoryInput.addEventListener("change", renderBudgets);
    filterStatusInput.addEventListener("change", renderBudgets);

    budgetModal.addEventListener("click", (e) => {
        if (e.target === budgetModal) closeAddBudgetModal();
    });

    editBudgetModal.addEventListener("click", (e) => {
        if (e.target === editBudgetModal) closeEditBudgetModal();
    });

    confirmDeleteModal.addEventListener("click", (e) => {
        if (e.target === confirmDeleteModal) closeDeleteConfirmation();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    requireAuth();
    setupEventListeners();
    await loadBudgets();
});
