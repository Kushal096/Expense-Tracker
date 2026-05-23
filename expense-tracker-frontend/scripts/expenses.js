const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseModal = document.getElementById("expenseModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");

const editExpenseModal = document.getElementById("editExpenseModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditExpenseBtn = document.getElementById("cancelEditExpenseBtn");
const updateExpenseBtn = document.getElementById("updateExpenseBtn");

const searchExpenseInput = document.getElementById("searchExpenseInput");
const filterCategoryInput = document.getElementById("filterCategory");
const minExpenseAmountInput = document.getElementById("minExpenseAmount");
const maxExpenseAmountInput = document.getElementById("maxExpenseAmount");
const startExpenseDateInput = document.getElementById("startExpenseDate");
const endExpenseDateInput = document.getElementById("endExpenseDate");

let expenses = [];
let categories = [];
let editingExpenseId = null;

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

function getFilteredExpenses() {
    const searchTerm = normalizeText(searchExpenseInput?.value);
    const categoryId = filterCategoryInput?.value || "";
    const minAmount = minExpenseAmountInput?.value === "" ? null : parseFloat(minExpenseAmountInput.value);
    const maxAmount = maxExpenseAmountInput?.value === "" ? null : parseFloat(maxExpenseAmountInput.value);
    const startDate = startExpenseDateInput?.value || "";
    const endDate = endExpenseDateInput?.value || "";

    return expenses.filter((expense) => {
        const category = categories.find((c) => c.id === expense.category_id);
        const description = normalizeText(expense.description || "Untitled");
        const categoryName = normalizeText(category?.name || "Unknown");
        const amountText = normalizeText(expense.amount);
        const expenseDate = getLocalISODate(expense.date);

        if (searchTerm) {
            const matchesSearch =
                description.includes(searchTerm) ||
                categoryName.includes(searchTerm) ||
                amountText.includes(searchTerm) ||
                expenseDate.includes(searchTerm);

            if (!matchesSearch) return false;
        }

        if (categoryId && String(expense.category_id) !== String(categoryId)) {
            return false;
        }

        if (minAmount !== null && !Number.isNaN(minAmount) && expense.amount < minAmount) {
            return false;
        }

        if (maxAmount !== null && !Number.isNaN(maxAmount) && expense.amount > maxAmount) {
            return false;
        }

        if (startDate && expenseDate && expenseDate < startDate) {
            return false;
        }

        if (endDate && expenseDate && expenseDate > endDate) {
            return false;
        }

        return true;
    });
}

function renderExpenses() {
    const tbody = document.getElementById("expenseTableBody") || document.querySelector(".data-table tbody");
    if (!tbody) return;

    const filteredExpenses = getFilteredExpenses();
    tbody.innerHTML = "";

    let totalAmount = 0;

    if (!filteredExpenses.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 24px; opacity: 0.75;">
                    No expenses match the current filters.
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
                    <svg onclick="openEditModal(${expense.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit" style="cursor: pointer; margin-right: 8px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <svg onclick="deleteExpense(event, ${expense.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2" style="cursor: pointer; color: red;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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

function attachFilterListeners() {
    searchExpenseInput?.addEventListener("input", renderExpenses);
    filterCategoryInput?.addEventListener("change", renderExpenses);
    minExpenseAmountInput?.addEventListener("input", renderExpenses);
    maxExpenseAmountInput?.addEventListener("input", renderExpenses);
    startExpenseDateInput?.addEventListener("change", renderExpenses);
    endExpenseDateInput?.addEventListener("change", renderExpenses);
}

function populateCategorySelects() {
    const expenseCategories = categories.filter((c) => c.type === "expense");

    [document.getElementById("category"), document.getElementById("editExpenseCategory")].forEach((select) => {
        if (select) {
            select.innerHTML = '<option value="">Select a category</option>' +
                expenseCategories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
        }
    });

    if (filterCategoryInput) {
        filterCategoryInput.innerHTML = '<option value="">All Categories</option>' +
            expenseCategories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    }
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
        const expenseCategories = categories.filter((c) => c.type === "expense");
        document.getElementById("category").value = expenseCategories.length ? String(expenseCategories[0].id) : "";
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
});

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) {
        return;
    }

    attachFilterListeners();

    try {
        [expenses, categories] = await Promise.all([
            apiCall('/expenses/'),
            apiCall('/categories/')
        ]);

        populateCategorySelects();
        renderExpenses();
    } catch (error) {
        console.error("Error loading data:", error);
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
        showNotification("Failed to create expense: " + error.message, 'error');
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

    if (isNaN(amount) || amount <= 0) {
        showNotification("Amount must be greater than 0", "error");
        return;
    }

    const category_id = parseInt(document.getElementById("editExpenseCategory").value);
    const date = document.getElementById("editExpenseDate").value;

    try {
        await loadingManager.executeWithLoading(updateExpenseBtn, async () => {
            const updatedExpense = await apiCall(`/expenses/${editingExpenseId}`, 'PATCH', {
                description, amount, category_id, date
            });

            expenses = expenses.map((e) =>
                e.id === editingExpenseId ? updatedExpense : e
            );

            renderExpenses();
            closeEditModal();

            showNotification('Expense updated successfully!', 'success');
        });
    } catch (error) {
        showNotification("Failed to update expense: " + error.message, 'error');
        console.error("Error updating expense:", error);
    }
}

if (updateExpenseBtn) updateExpenseBtn.addEventListener("click", executeEditExpense);

async function deleteExpense(event, id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const deleteButton = event?.target?.closest('svg');
    if (deleteButton) {
        deleteButton.style.pointerEvents = 'none';
        deleteButton.style.opacity = '0.5';
    }

    try {
        await apiCall(`/expenses/${id}`, 'DELETE');
        expenses = expenses.filter((e) => e.id !== id);
        renderExpenses();
        showNotification('Expense deleted successfully!', 'success');
    } catch (error) {
        showNotification("Failed to delete expense: " + error.message, 'error');
        console.error("Error deleting expense:", error);

        if (deleteButton) {
            deleteButton.style.pointerEvents = 'auto';
            deleteButton.style.opacity = '1';
        }
    }
}
