// Create Modal Elements
const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseModal = document.getElementById("expenseModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");

// Edit Modal Elements
const editExpenseModal = document.getElementById("editExpenseModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditExpenseBtn = document.getElementById("cancelEditExpenseBtn");
const updateExpenseBtn = document.getElementById("updateExpenseBtn");

// Delete Modal Elements
const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");

let expenses = [];
let categories = [];
let editingExpenseId = null;
let deletingExpenseId = null;

// FILTER INPUTS
const searchExpenseInput = document.getElementById("searchExpenseInput");
const filterCategory = document.getElementById("filterCategory");
const minExpenseAmount = document.getElementById("minExpenseAmount");
const maxExpenseAmount = document.getElementById("maxExpenseAmount");
const startExpenseDate = document.getElementById("startExpenseDate");
const endExpenseDate = document.getElementById("endExpenseDate");

// Open Create Modal
addExpenseBtn.addEventListener("click", () => {
    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("category").value = categories.length ? categories[0].id : "";
    document.getElementById("date").value = new Date().toISOString().split("T")[0];

    expenseModal.style.display = "flex";
});

// Close Create Modal
const closeCreateModal = () => {
    expenseModal.style.display = "none";
};

closeModalBtn.addEventListener("click", closeCreateModal);
cancelExpenseBtn.addEventListener("click", closeCreateModal);

// Close Edit Modal
const closeEditModal = () => {
    editExpenseModal.style.display = "none";
    editingExpenseId = null;
};

closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditExpenseBtn.addEventListener("click", closeEditModal);

// Close Delete Modal
const closeDeleteModal = () => {
    confirmDeleteModal.style.display = "none";
    deletingExpenseId = null;
};

cancelDeleteBtn.addEventListener("click", closeDeleteModal);
closeDeleteModalBtn.addEventListener("click", closeDeleteModal);

// Close modals on outside click
window.addEventListener("click", (e) => {
    if (e.target === expenseModal) closeCreateModal();
    if (e.target === editExpenseModal) closeEditModal();
    if (e.target === confirmDeleteModal) closeDeleteModal();
});

// Load Data
document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem("access_token")) {
        window.location.href = "login.html";
        return;
    }

    try {
        [expenses, categories] = await Promise.all([
            apiCall("/expenses/"),
            apiCall("/categories/")
        ]);

        populateCategorySelects();
        setupFilters();
        renderExpenses();

    } catch (error) {
        console.error("Error loading data:", error);
    }
});

// Populate Categories
function populateCategorySelects() {

    const expenseCategories = categories.filter(
        c => c.type === "expense"
    );

    const categorySelects = [
        document.getElementById("category"),
        document.getElementById("editExpenseCategory")
    ];

    categorySelects.forEach(select => {
        if (select) {
            select.innerHTML = expenseCategories
                .map(c =>
                    `<option value="${c.id}">${c.name}</option>`
                )
                .join("");
        }
    });

    if (filterCategory) {
        filterCategory.innerHTML =
            '<option value="">All Categories</option>' +
            expenseCategories
                .map(c =>
                    `<option value="${c.id}">${c.name}</option>`
                )
                .join("");
    }
}

// FILTER EVENTS
function setupFilters() {

    [
        searchExpenseInput,
        filterCategory,
        minExpenseAmount,
        maxExpenseAmount,
        startExpenseDate,
        endExpenseDate
    ].forEach(input => {

        if (input) {
            input.addEventListener("input", renderExpenses);
            input.addEventListener("change", renderExpenses);
        }
    });
}

// RENDER EXPENSES
function renderExpenses() {

    const tbody = document.getElementById("expenseTableBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    let filteredExpenses = [...expenses];

    // SEARCH
    const search = searchExpenseInput.value.toLowerCase();

    if (search) {
        filteredExpenses = filteredExpenses.filter(expense => {

            const category = categories.find(
                c => c.id === expense.category_id
            );

            return (
                expense.description?.toLowerCase().includes(search) ||
                category?.name?.toLowerCase().includes(search) ||
                expense.amount.toString().includes(search)
            );
        });
    }

    // CATEGORY FILTER
    if (filterCategory.value) {
        filteredExpenses = filteredExpenses.filter(
            e => e.category_id == filterCategory.value
        );
    }

    // MIN AMOUNT
    if (minExpenseAmount.value) {
        filteredExpenses = filteredExpenses.filter(
            e => e.amount >= parseFloat(minExpenseAmount.value)
        );
    }

    // MAX AMOUNT
    if (maxExpenseAmount.value) {
        filteredExpenses = filteredExpenses.filter(
            e => e.amount <= parseFloat(maxExpenseAmount.value)
        );
    }

    // START DATE
    if (startExpenseDate.value) {
        filteredExpenses = filteredExpenses.filter(
            e => new Date(e.date) >= new Date(startExpenseDate.value)
        );
    }

    // END DATE
    if (endExpenseDate.value) {
        filteredExpenses = filteredExpenses.filter(
            e => new Date(e.date) <= new Date(endExpenseDate.value)
        );
    }

    let totalAmount = 0;

    // EMPTY STATE
    if (filteredExpenses.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:40px;">
                    <h3>No Expenses Found</h3>
                    <p>Try changing filters or add new expenses.</p>
                </td>
            </tr>
        `;
    }

    filteredExpenses.forEach(expense => {

        totalAmount += expense.amount;

        const category = categories.find(
            c => c.id === expense.category_id
        );

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${expense.description || "Untitled"}</td>
            <td>${category ? category.name : "Unknown"}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>${new Date(expense.date).toLocaleDateString()}</td>

            <td class="actions">

                <svg onclick="openEditModal(${expense.id})"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="cursor:pointer; margin-right:10px;">

                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>

                </svg>

                <svg onclick="openDeleteModal(${expense.id})"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="red"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="cursor:pointer;">

                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>

                </svg>

            </td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById("totalExpenseCount").textContent =
        `Total Expenses (${filteredExpenses.length})`;

    document.getElementById("totalExpenseAmount").textContent =
        `$${totalAmount.toFixed(2)}`;
}

// CREATE
async function createExpense(e) {

    e.preventDefault();

    const description =
        document.getElementById("title").value;

    const amount =
        parseFloat(document.getElementById("amount").value);

    const category_id =
        parseInt(document.getElementById("category").value);

    const date =
        document.getElementById("date").value;

    try {

        const newExpense = await apiCall(
            "/expenses/",
            "POST",
            {
                amount,
                category_id,
                date,
                description
            }
        );

        expenses.push(newExpense);

        renderExpenses();

        closeCreateModal();

    } catch (error) {

        alert("Failed to create expense: " + error.message);
    }
}

saveExpenseBtn.addEventListener("click", createExpense);

// EDIT MODAL
function openEditModal(id) {

    const expense = expenses.find(e => e.id === id);

    if (!expense) return;

    editingExpenseId = id;

    document.getElementById("editExpenseTitle").value =
        expense.description;

    document.getElementById("editExpenseAmount").value =
        expense.amount;

    document.getElementById("editExpenseCategory").value =
        expense.category_id;

    document.getElementById("editExpenseDate").value =
        expense.date.split("T")[0];

    editExpenseModal.style.display = "flex";
}

// UPDATE
async function executeEditExpense(e) {

    e.preventDefault();

    if (!editingExpenseId) return;

    const description =
        document.getElementById("editExpenseTitle").value;

    const amount =
        parseFloat(document.getElementById("editExpenseAmount").value);

    const category_id =
        parseInt(document.getElementById("editExpenseCategory").value);

    const date =
        document.getElementById("editExpenseDate").value;

    try {

        const updatedExpense = await apiCall(
            `/expenses/${editingExpenseId}`,
            "PATCH",
            {
                description,
                amount,
                category_id,
                date
            }
        );

        expenses = expenses.map(e =>
            e.id === editingExpenseId
                ? updatedExpense
                : e
        );

        renderExpenses();

        closeEditModal();

    } catch (error) {

        alert("Failed to update expense: " + error.message);
    }
}

updateExpenseBtn.addEventListener(
    "click",
    executeEditExpense
);

// OPEN DELETE MODAL
function openDeleteModal(id) {

    deletingExpenseId = id;

    confirmDeleteModal.style.display = "flex";
}

// DELETE
async function executeDeleteExpense() {

    if (!deletingExpenseId) return;

    try {

        await apiCall(
            `/expenses/${deletingExpenseId}`,
            "DELETE"
        );

        expenses = expenses.filter(
            e => e.id !== deletingExpenseId
        );

        renderExpenses();

        closeDeleteModal();

    } catch (error) {

        alert("Failed to delete expense: " + error.message);
    }
}

confirmDeleteBtn.addEventListener(
    "click",
    executeDeleteExpense
);