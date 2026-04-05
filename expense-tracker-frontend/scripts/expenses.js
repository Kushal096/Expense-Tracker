

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

let expenses = [];
let categories = [];
let editingExpenseId = null;

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

// Close when clicking outside of the modal content
window.addEventListener("click", (e) => {
    if (e.target === expenseModal) closeCreateModal();
    if (e.target === editExpenseModal) closeEditModal();
});

// Fetch and render data
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
        renderExpenses(document.getElementById("filterCategory")?.value || "");
    } catch (error) {
        console.error("Error loading data:", error);
    }
});

function populateCategorySelects() {
    // Only show categories that are explicitly marked as "expense" type
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
            
        // Setup filter change event
        filterCategory.addEventListener('change', (e) => {
            renderExpenses(e.target.value);
        });
    }
}

function renderExpenses(filterCategoryId = "") {
    const tbody = document.getElementById("expenseTableBody") || document.querySelector(".data-table tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    const filteredExpenses = filterCategoryId 
        ? expenses.filter(e => e.category_id == filterCategoryId)
        : expenses;
        
    filteredExpenses.forEach(expense => {
        const category = categories.find(c => c.id === expense.category_id);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${expense.description || 'Untitled'}</td>
            <td>${category ? category.name : 'Unknown'}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td class="actions">
                <svg onclick="openEditModal(${expense.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit" style="cursor: pointer; margin-right: 8px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <svg onclick="deleteExpense(${expense.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2" style="cursor: pointer; color: red;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function createExpense(e) {
    e.preventDefault();
    const description = document.getElementById("title").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const category_id = parseInt(document.getElementById("category").value);
    const date = document.getElementById("date").value;
    console.log(description)
    try {
        const newExpense = await apiCall('/expenses/', 'POST', {
            amount, category_id, date, description
        });
        expenses.push(newExpense);
        renderExpenses(document.getElementById("filterCategory")?.value || "");
        closeCreateModal();
    } catch (error) {
        alert("Failed to create expense: " + error.message);
    }
}
if (saveExpenseBtn) saveExpenseBtn.addEventListener("click", createExpense);

function openEditModal(id) {
    const expense = expenses.find(e => e.id === id);
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

    const description = document.getElementById("editExpenseTitle").value;
    const amount = parseFloat(document.getElementById("editExpenseAmount").value);
    const category_id = parseInt(document.getElementById("editExpenseCategory").value);
    const date = document.getElementById("editExpenseDate").value;

    try {
        const updatedExpense = await apiCall(`/expenses/${editingExpenseId}`, 'PATCH', {
            description, amount, category_id, date
        });
        expenses = expenses.map(e => e.id === editingExpenseId ? updatedExpense : e);
        renderExpenses(document.getElementById("filterCategory")?.value || "");
        closeEditModal();
    } catch (error) {
        alert("Failed to update expense: " + error.message);
    }
}
if (updateExpenseBtn) updateExpenseBtn.addEventListener("click", executeEditExpense);

async function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
        await apiCall(`/expenses/${id}`, 'DELETE');
        expenses = expenses.filter(e => e.id !== id);
        renderExpenses(document.getElementById("filterCategory")?.value || "");
    } catch (error) {
        alert("Failed to delete expense: " + error.message);
    }
}
