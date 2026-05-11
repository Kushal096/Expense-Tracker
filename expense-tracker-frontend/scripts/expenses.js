const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseModal = document.getElementById("expenseModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");

const editExpenseModal = document.getElementById("editExpenseModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditExpenseBtn = document.getElementById("cancelEditExpenseBtn");
const updateExpenseBtn = document.getElementById("updateExpenseBtn");

let expenses = [];
let categories = [];
let editingExpenseId = null;

addExpenseBtn.addEventListener("click", () => {
    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("category").value = categories.length ? categories[0].id : "";
    document.getElementById("date").value = new Date().toISOString().split("T")[0];
    expenseModal.style.display = "flex";
});

const closeCreateModal = () => {
    expenseModal.style.display = "none";
};
closeModalBtn.addEventListener("click", closeCreateModal);
cancelExpenseBtn.addEventListener("click", closeCreateModal);

const closeEditModal = () => {
    editExpenseModal.style.display = "none";
    editingExpenseId = null;
};
closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditExpenseBtn.addEventListener("click", closeEditModal);

window.addEventListener("click", (e) => {
    if (e.target === expenseModal) closeCreateModal();
    if (e.target === editExpenseModal) closeEditModal();
});

document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem('access_token')) {
        window.location.href = 'login.html';
        return;
    }

    try {
        [expenses, categories] = await Promise.all([
            apiCall('/expenses/'),
            apiCall('/categories/')
        ]);

        populateCategorySelects();
        setupFilters(); 
        renderExpenses(document.getElementById("filterCategory")?.value || "");
    } catch (error) {
        console.error("Error loading data:", error);
    }
});

function setupFilters() {
    document.getElementById("searchInput")?.addEventListener("input", applyFilters);
    document.getElementById("minAmount")?.addEventListener("input", applyFilters);
    document.getElementById("maxAmount")?.addEventListener("input", applyFilters);
}

function applyFilters() {
    renderExpenses(document.getElementById("filterCategory")?.value || "");
}

function populateCategorySelects() {
    const expenseCategories = categories.filter(c => c.type === 'expense');

    const categorySelects = [
        document.getElementById("category"),
        document.getElementById("editExpenseCategory")
    ];

    categorySelects.forEach(select => {
        if (select) {
            select.innerHTML = expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    });

    const filterCategory = document.getElementById("filterCategory");
    if (filterCategory) {
        filterCategory.innerHTML = '<option value="">All Categories</option>' +
            expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        filterCategory.addEventListener('change', (e) => {
            renderExpenses(e.target.value);
        });
    }
}

function renderExpenses(filterCategoryId = "") {
    const tbody = document.getElementById("expenseTableBody") || document.querySelector(".data-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const searchTerm = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const minAmount = parseFloat(document.getElementById("minAmount")?.value) || 0;
    const maxAmount = parseFloat(document.getElementById("maxAmount")?.value) || Infinity;

    let filteredExpenses = expenses;

    // Category filter
    if (filterCategoryId) {
        filteredExpenses = filteredExpenses.filter(e => e.category_id == filterCategoryId);
    }

    // Search (title + description)
    if (searchTerm) {
        filteredExpenses = filteredExpenses.filter(e =>
            (e.description && e.description.toLowerCase().includes(searchTerm)) ||
            (e.title && e.title.toLowerCase().includes(searchTerm))
        );
    }

    //  Amount filter
    filteredExpenses = filteredExpenses.filter(e =>
        e.amount >= minAmount && e.amount <= maxAmount
    );

    let totalAmount = 0;

    filteredExpenses.forEach(expense => {
        totalAmount += expense.amount;
        const category = categories.find(c => c.id === expense.category_id);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${expense.description || 'Untitled'}</td>
            <td>${category ? category.name : 'Unknown'}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td class="actions">
                <svg onclick="openEditModal(${expense.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4"/></svg>
                <svg onclick="deleteExpense(${expense.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="red" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7"/></svg>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const countEl = document.getElementById("totalExpenseCount");
    const amountEl = document.getElementById("totalExpenseAmount");

    if (countEl) countEl.textContent = `Total Expenses (${filteredExpenses.length})`;
    if (amountEl) amountEl.textContent = `$${totalAmount.toFixed(2)}`;
}

async function createExpense(e) { /* unchanged */ }
function openEditModal(id) { /* unchanged */ }
async function executeEditExpense(e) { /* unchanged */ }
async function deleteExpense(id) { /* unchanged */ }