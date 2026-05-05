const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseModal = document.getElementById("expenseModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");

const editExpenseModal = document.getElementById("editExpenseModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditExpenseBtn = document.getElementById("cancelEditExpenseBtn");
const updateExpenseBtn = document.getElementById("updateExpenseBtn");

const expenseTableBody = document.getElementById("expenseTableBody") || document.querySelector(".data-table tbody");

const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const deleteMessageText = document.getElementById("deleteMessageText");

let expenses = [];
let categories = [];
let editingExpenseId = null;
let pendingDeleteExpenseId = null;
let isDataLoading = true;
let loadErrorMessage = "";

function getReadableErrorMessage(error, fallbackMessage) {
    const raw = String(error?.message || "").trim();

    if (!raw) return fallbackMessage;
    if (raw === "Failed to fetch") {
        return "Network error. Please check your connection and try again.";
    }

    return raw;
}


function renderExpenses() {
    const tbody = expenseTableBody;
    if (!tbody) return;

    if (isDataLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-state-row">
                    <span class="table-state-spinner" aria-hidden="true"></span>
                    Loading expenses...
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

    const filteredExpenses = expenses.slice();
    tbody.innerHTML = "";

    let totalAmount = 0;

    if (!filteredExpenses.length) {
        const emptyMessage = expenses.length
            ? "No expenses match your current filters."
            : "No data yet. Add your first expense to get started.";

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-state-row">
                    ${emptyMessage}
                </td>
            </tr>
        `;
    } else {
        filteredExpenses.forEach((expense) => {
            totalAmount += Number(expense.amount) || 0;
            const category = categories.find((c) => c.id === expense.category_id);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${expense.description || 'Untitled'}</td>
                <td>${category ? category.name : 'Unknown'}</td>
                <td>$${Number(expense.amount).toFixed(2)}</td>
                <td>${new Date(expense.date).toLocaleDateString()}</td>
                <td class="actions">
                    <button type="button" class="icon-action-btn" data-action="edit" data-id="${expense.id}" aria-label="Edit expense">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="icon-action-btn icon-action-btn-delete" data-action="delete" data-id="${expense.id}" aria-label="Delete expense">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const countEl = document.getElementById("totalExpenseCount");
    const amountEl = document.getElementById("totalExpenseAmount");
    if (countEl) countEl.textContent = `Total Expenses (${filteredExpenses.length})`;
    if (amountEl) amountEl.textContent = `$${totalAmount.toFixed(2)}`;
}

function populateCategorySelects() {
    const expenseCategories = categories.filter((c) => c.type === "expense");

    const categorySelects = [
        document.getElementById("category"),
        document.getElementById("editExpenseCategory")
    ];

    categorySelects.forEach((select) => {
        if (select) {
            select.innerHTML = '<option value="">Select a category</option>' +
                expenseCategories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
        }
    });
}

function closeCreateModal() {
    expenseModal.style.display = "none";
}

function closeEditModal() {
    editExpenseModal.style.display = "none";
    editingExpenseId = null;
}

if (addExpenseBtn) {
    addExpenseBtn.addEventListener("click", () => {
        document.getElementById("title").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("category").value = categories.length ? String(categories[0].id) : "";
        document.getElementById("date").value = new Date().toISOString().split("T")[0];
        expenseModal.style.display = "flex";
    });
}

closeModalBtn?.addEventListener("click", closeCreateModal);
cancelExpenseBtn?.addEventListener("click", closeCreateModal);
closeEditModalBtn?.addEventListener("click", closeEditModal);
cancelEditExpenseBtn?.addEventListener("click", closeEditModal);

window.addEventListener("click", (e) => {
    if (e.target === expenseModal) closeCreateModal();
    if (e.target === editExpenseModal) closeEditModal();
    if (e.target === confirmDeleteModal) closeDeleteModal();
});

function closeDeleteModal() {
    if (confirmDeleteBtn && confirmDeleteBtn.disabled) return;
    if (confirmDeleteModal) confirmDeleteModal.style.display = "none";
    pendingDeleteExpenseId = null;
}

closeDeleteModalBtn?.addEventListener("click", closeDeleteModal);
cancelDeleteBtn?.addEventListener("click", closeDeleteModal);

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) {
        return;
    }
    expenseTableBody?.addEventListener("click", onExpenseTableClick);
    confirmDeleteBtn?.addEventListener("click", handleConfirmDeleteExpense);

    isDataLoading = true;
    loadErrorMessage = "";
    renderExpenses();

    try {
        [expenses, categories] = await Promise.all([
            apiCall('/expenses/'),
            apiCall('/categories/')
        ]);

        populateCategorySelects();
        loadErrorMessage = "";
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to load expenses right now.");
        loadErrorMessage = `Could not load expense data. ${message}`;
        showNotification(loadErrorMessage, 'error', 4000);
        console.error("Error loading data:", error);
    } finally {
        isDataLoading = false;
        renderExpenses();
    }
});

async function createExpense(e) {
    e.preventDefault();

    if (!saveExpenseBtn || saveExpenseBtn.disabled) {
        return;
    }

    const description = document.getElementById("title").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const category_id = parseInt(document.getElementById("category").value);
    const date = document.getElementById("date").value;

    try {
        await loadingManager.executeWithLoading(saveExpenseBtn, async () => {
            const newExpense = await apiCall('/expenses/', 'POST', {
                amount, category_id, date, description
            });
            expenses.push(newExpense);
            renderExpenses();
            closeCreateModal();
            showNotification('Expense created successfully!', 'success');
        });
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to create expense.");
        showNotification(`Failed to create expense. ${message}`, 'error');
        console.error("Error creating expense:", error);
    }
}

if (saveExpenseBtn) saveExpenseBtn.addEventListener("click", createExpense);

function openEditModal(id) {
    const expense = expenses.find((e) => e.id === id);
    if (!expense) return;

    editingExpenseId = id;
    document.getElementById("editExpenseTitle").value = expense.description;
    document.getElementById("editExpenseAmount").value = expense.amount;
    document.getElementById("editExpenseCategory").value = expense.category_id;
    document.getElementById("editExpenseDate").value = expense.date.split("T")[0];

    editExpenseModal.style.display = "flex";
}

async function executeEditExpense(e) {
    e.preventDefault();

    if (!editingExpenseId) return;

    if (!updateExpenseBtn || updateExpenseBtn.disabled) {
        return;
    }

    const description = document.getElementById("editExpenseTitle").value;
    const amount = parseFloat(document.getElementById("editExpenseAmount").value);
    const category_id = parseInt(document.getElementById("editExpenseCategory").value);
    const date = document.getElementById("editExpenseDate").value;

    try {
        await loadingManager.executeWithLoading(updateExpenseBtn, async () => {
            const updatedExpense = await apiCall(`/expenses/${editingExpenseId}`, 'PATCH', {
                description, amount, category_id, date
            });
            expenses = expenses.map((e) => e.id === editingExpenseId ? updatedExpense : e);
            renderExpenses();
            closeEditModal();
            showNotification('Expense updated successfully!', 'success');
        });
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to update expense.");
        showNotification(`Failed to update expense. ${message}`, 'error');
        console.error("Error updating expense:", error);
    }
}

if (updateExpenseBtn) updateExpenseBtn.addEventListener("click", executeEditExpense);

function onExpenseTableClick(event) {
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
        openDeleteExpenseModal(id);
    }
}

function openDeleteExpenseModal(id) {
    const expense = expenses.find((e) => e.id === id);
    if (!expense) return;

    pendingDeleteExpenseId = id;

    if (deleteMessageText) {
        const label = expense.description || "this expense";
        deleteMessageText.textContent = `Delete "${label}"? This action cannot be undone.`;
    }

    if (confirmDeleteModal) {
        confirmDeleteModal.style.display = "flex";
    }
}

async function handleConfirmDeleteExpense() {
    if (!pendingDeleteExpenseId) return;
    if (!confirmDeleteBtn || confirmDeleteBtn.disabled) return;

    const deletingId = pendingDeleteExpenseId;

    try {
        await loadingManager.executeWithLoading(confirmDeleteBtn, async () => {
            await apiCall(`/expenses/${deletingId}`, 'DELETE');
        });

        expenses = expenses.filter((e) => e.id !== deletingId);
        closeDeleteModal();
        renderExpenses();
        showNotification('Expense deleted successfully!', 'success');
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to delete expense.");
        showNotification(`Failed to delete expense. ${message}`, 'error');
        console.error("Error deleting expense:", error);
    }
}
