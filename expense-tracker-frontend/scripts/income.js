const addIncomeBtn = document.getElementById("addIncomeBtn");
const incomeModal = document.getElementById("incomeModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelIncomeBtn = document.getElementById("cancelIncomeBtn");
const saveIncomeBtn = document.getElementById("saveIncomeBtn");

const editIncomeModal = document.getElementById("editIncomeModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditIncomeBtn = document.getElementById("cancelEditIncomeBtn");
const updateIncomeBtn = document.getElementById("updateIncomeBtn");

const searchIncomeInput = document.getElementById("searchIncomeInput");
const filterCategoryInput = document.getElementById("filterCategory");
const minIncomeAmountInput = document.getElementById("minIncomeAmount");
const maxIncomeAmountInput = document.getElementById("maxIncomeAmount");
const startIncomeDateInput = document.getElementById("startIncomeDate");
const endIncomeDateInput = document.getElementById("endIncomeDate");

const incomeTableBody = document.getElementById("incomeTableBody") || document.querySelector(".data-table tbody");

const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const deleteMessageText = document.getElementById("deleteMessageText");

let incomes = [];
let categories = [];
let editingIncomeId = null;
let pendingDeleteIncomeId = null;
let isDataLoading = true;
let loadErrorMessage = "";

addIncomeBtn.addEventListener("click", () => {
    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    const incomeCategories = categories.filter(c => c.type === 'income');
    document.getElementById("category").value = incomeCategories.length ? incomeCategories[0].id : "";
    document.getElementById("date").value = new Date().toISOString().split("T")[0];
    incomeModal.style.display = "flex";
});

const closeCreateModal = () => {
    incomeModal.style.display = "none";
};
closeModalBtn.addEventListener("click", closeCreateModal);
cancelIncomeBtn.addEventListener("click", closeCreateModal);

const closeEditModal = () => {
    editIncomeModal.style.display = "none";
    editingIncomeId = null;
};
closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditIncomeBtn.addEventListener("click", closeEditModal);

window.addEventListener("click", (e) => {
    if (e.target === incomeModal) closeCreateModal();
    if (e.target === editIncomeModal) closeEditModal();
    if (e.target === confirmDeleteModal) closeDeleteModal();
});

function closeDeleteModal() {
    if (confirmDeleteBtn && confirmDeleteBtn.disabled) return;
    if (confirmDeleteModal) confirmDeleteModal.style.display = "none";
    pendingDeleteIncomeId = null;
}

closeDeleteModalBtn?.addEventListener("click", closeDeleteModal);
cancelDeleteBtn?.addEventListener("click", closeDeleteModal);

function getReadableErrorMessage(error, fallbackMessage) {
    const raw = String(error?.message || "").trim();

    if (!raw) return fallbackMessage;
    if (raw === "Failed to fetch") {
        return "Network error. Please check your connection and try again.";
    }

    return raw;
}

function getLocalISODate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function normalizeText(value) {
    return String(value ?? "").toLowerCase().trim();
}

function attachFilterListeners() {
    searchIncomeInput?.addEventListener("input", renderIncomes);
    filterCategoryInput?.addEventListener("change", renderIncomes);
    minIncomeAmountInput?.addEventListener("input", renderIncomes);
    maxIncomeAmountInput?.addEventListener("input", renderIncomes);
    startIncomeDateInput?.addEventListener("change", renderIncomes);
    endIncomeDateInput?.addEventListener("change", renderIncomes);
}

function getFilteredIncomes() {
    const searchTerm = normalizeText(searchIncomeInput?.value);
    const categoryId = filterCategoryInput?.value || "";
    const minAmount = minIncomeAmountInput?.value === "" ? null : parseFloat(minIncomeAmountInput.value);
    const maxAmount = maxIncomeAmountInput?.value === "" ? null : parseFloat(maxIncomeAmountInput.value);
    const startDate = startIncomeDateInput?.value || "";
    const endDate = endIncomeDateInput?.value || "";

    return incomes.filter((income) => {
        const category = categories.find((c) => c.id === income.category_id);
        const title = normalizeText(income.title || income.source || "Income");
        const categoryName = normalizeText(category?.name || "Unknown");
        const amountText = normalizeText(income.amount);
        const incomeDate = getLocalISODate(income.date);

        if (searchTerm) {
            const matchesSearch =
                title.includes(searchTerm) ||
                categoryName.includes(searchTerm) ||
                amountText.includes(searchTerm) ||
                incomeDate.includes(searchTerm);

            if (!matchesSearch) return false;
        }

        if (categoryId && String(income.category_id) !== String(categoryId)) {
            return false;
        }

        if (minAmount !== null && !Number.isNaN(minAmount) && income.amount < minAmount) {
            return false;
        }

        if (maxAmount !== null && !Number.isNaN(maxAmount) && income.amount > maxAmount) {
            return false;
        }

        if (startDate && incomeDate && incomeDate < startDate) {
            return false;
        }

        if (endDate && incomeDate && incomeDate > endDate) {
            return false;
        }

        return true;
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) {
        return;
    }

    attachFilterListeners();
    incomeTableBody?.addEventListener("click", onIncomeTableClick);
    confirmDeleteBtn?.addEventListener("click", handleConfirmDeleteIncome);

    isDataLoading = true;
    loadErrorMessage = "";
    renderIncomes();

    try {
        [incomes, categories] = await Promise.all([
            apiCall('/incomes/'),
            apiCall('/categories/')
        ]);

        populateCategorySelects();
        loadErrorMessage = "";
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to load incomes right now.");
        loadErrorMessage = `Could not load income data. ${message}`;
        showNotification(loadErrorMessage, 'error', 4000);
        console.error("Error loading income data:", error);
    } finally {
        isDataLoading = false;
        renderIncomes();
    }
});

function populateCategorySelects() {
    const incomeCategories = categories.filter(c => c.type === 'income');

    const categorySelects = [
        document.getElementById("category"),
        document.getElementById("editIncomeCategory")
    ];
    
    categorySelects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Select a category</option>' +
                incomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    });

    // filterCategoryInput removed; no filter select to populate.
}

function renderIncomes() {
    const tbody = incomeTableBody;
    if (!tbody) return;

    if (isDataLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-state-row">
                    <span class="table-state-spinner" aria-hidden="true"></span>
                    Loading incomes...
                </td>
            </tr>
        `;
        return;
    }

    if (loadErrorMessage) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-state-row table-state-error">${loadErrorMessage}</td>
            </tr>
        `;
        return;
    }
    
    const filteredIncomes = getFilteredIncomes();
    tbody.innerHTML = "";
        
    let totalAmount = 0;

    if (!filteredIncomes.length) {
        const emptyMessage = incomes.length
            ? "No incomes match your current filters."
            : "No data yet. Add your first income to get started.";

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-state-row">
                    ${emptyMessage}
                </td>
            </tr>
        `;
    } else {
        filteredIncomes.forEach((income) => {
            totalAmount += Number(income.amount) || 0;
            const category = categories.find((c) => c.id === income.category_id);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${income.title || income.source || 'Income'}</td>
                <td>${category ? category.name : 'Unknown'}</td>
                <td>$${Number(income.amount).toFixed(2)}</td>
                <td>${new Date(income.date).toLocaleDateString()}</td>
                <td class="actions">
                    <button type="button" class="icon-action-btn" data-action="edit" data-id="${income.id}" aria-label="Edit income">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="icon-action-btn icon-action-btn-delete" data-action="delete" data-id="${income.id}" aria-label="Delete income">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const countEl = document.getElementById("totalIncomeCount");
    const amountEl = document.getElementById("totalIncomeAmount");
    if (countEl) countEl.textContent = `Total Income (${filteredIncomes.length})`;
    if (amountEl) amountEl.textContent = `$${totalAmount.toFixed(2)}`;
}

async function createIncome(e) {
    e.preventDefault();
    
    if (!saveIncomeBtn || saveIncomeBtn.disabled) {
        return;
    }

    const source = document.getElementById("title").value;

    const amount = parseFloat(document.getElementById("amount").value);

    if (isNaN(amount) || amount <= 0) {
        showNotification("Amount must be greater than 0", "error");
        return;
    }

    const category_id = parseInt(document.getElementById("category").value);
    const date = document.getElementById("date").value;

    try {
        await loadingManager.executeWithLoading(saveIncomeBtn, async () => {
            const newIncome = await apiCall('/incomes/', 'POST', {
                source,
                amount,
                date,
                category_id,
            });

            incomes.push(newIncome);
            renderIncomes();
            closeCreateModal();

            showNotification('Income created successfully!', 'success');
        });
    } catch (error) {
        const message = getReadableErrorMessage(
            error,
            "Unable to add income."
        );

        showNotification(
            `Failed to add income. ${message}`,
            'error'
        );

        console.error("Error creating income:", error);
    }
}
if (saveIncomeBtn) saveIncomeBtn.addEventListener("click", createIncome);

function openEditModal(id) {
    const income = incomes.find(i => i.id === id);
    if (!income) return;
    
    editingIncomeId = id;
    
    const titleEl = document.getElementById("editIncomeTitle");
    if (titleEl) titleEl.value = income.source || '';
    
    const sourceEl = document.getElementById("editIncomeSource");
    if (sourceEl) sourceEl.value = income.source || '';
    
    document.getElementById("editIncomeAmount").value = income.amount;
    document.getElementById("editIncomeCategory").value = income.category_id;
    document.getElementById("editIncomeDate").value = income.date.split("T")[0];
    
    editIncomeModal.style.display = "flex";
}

async function executeEditIncome(e) {
    e.preventDefault();
    
    if (!editingIncomeId) return;
    
    if (!updateIncomeBtn || updateIncomeBtn.disabled) {
        return;
    }

    const sourceEl = document.getElementById("editIncomeSource") || document.getElementById("editIncomeTitle");
    const source = sourceEl ? sourceEl.value : "";
    const amount = parseFloat(document.getElementById("editIncomeAmount").value);
    const category_id = parseInt(document.getElementById("editIncomeCategory").value);
    const date = document.getElementById("editIncomeDate").value;

    try {
        await loadingManager.executeWithLoading(updateIncomeBtn, async () => {
            const updatedIncome = await apiCall(`/incomes/${editingIncomeId}`, 'PATCH', {
                source, amount, date, category_id
            });
            incomes = incomes.map(i => i.id === editingIncomeId ? updatedIncome : i);
            renderIncomes();
            closeEditModal();
            showNotification('Income updated successfully!', 'success');
        });
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to update income.");
        showNotification(`Failed to update income. ${message}`, 'error');
        console.error("Error updating income:", error);
    }
}
if (updateIncomeBtn) updateIncomeBtn.addEventListener("click", executeEditIncome);

function onIncomeTableClick(event) {
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
        openDeleteIncomeModal(id);
    }
}

function openDeleteIncomeModal(id) {
    const income = incomes.find((i) => i.id === id);
    if (!income) return;

    pendingDeleteIncomeId = id;

    if (deleteMessageText) {
        const label = income.title || income.source || "this income";
        deleteMessageText.textContent = `Delete "${label}"? This action cannot be undone.`;
    }

    if (confirmDeleteModal) {
        confirmDeleteModal.style.display = "flex";
    }
}

async function handleConfirmDeleteIncome() {
    if (!pendingDeleteIncomeId) return;
    if (!confirmDeleteBtn || confirmDeleteBtn.disabled) return;

    const deletingId = pendingDeleteIncomeId;

    try {
        await loadingManager.executeWithLoading(confirmDeleteBtn, async () => {
            await apiCall(`/incomes/${deletingId}`, 'DELETE');
        });

        incomes = incomes.filter((i) => i.id !== deletingId);
        closeDeleteModal();
        renderIncomes();
        showNotification('Income deleted successfully!', 'success');
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to delete income.");
        showNotification(`Failed to delete income. ${message}`, 'error');
        console.error("Error deleting income:", error);
    }
}
