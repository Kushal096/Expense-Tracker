// Create Modal Elements
const addIncomeBtn = document.getElementById("addIncomeBtn");
const incomeModal = document.getElementById("incomeModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelIncomeBtn = document.getElementById("cancelIncomeBtn");
const saveIncomeBtn = document.getElementById("saveIncomeBtn");

// Edit Modal Elements
const editIncomeModal = document.getElementById("editIncomeModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditIncomeBtn = document.getElementById("cancelEditIncomeBtn");
const updateIncomeBtn = document.getElementById("updateIncomeBtn");

let incomes = [];
let categories = [];
let editingIncomeId = null;

// Open Create Modal
addIncomeBtn.addEventListener("click", () => {
    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("category").value = categories.length ? categories[0].id : "";
    document.getElementById("date").value = new Date().toISOString().split("T")[0];
    incomeModal.style.display = "flex";
});

// Close Create Modal
const closeCreateModal = () => {
    incomeModal.style.display = "none";
};
closeModalBtn.addEventListener("click", closeCreateModal);
cancelIncomeBtn.addEventListener("click", closeCreateModal);

// Open Edit Modal
const closeEditModal = () => {
    editIncomeModal.style.display = "none";
    editingIncomeId = null;
};
closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditIncomeBtn.addEventListener("click", closeEditModal);

// Close when clicking outside of the modal content
window.addEventListener("click", (e) => {
    if (e.target === incomeModal) closeCreateModal();
    if (e.target === editIncomeModal) closeEditModal();
});

// Fetch and render data
document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem('access_token')) {
        window.location.href = 'login.html';
        return;
    }

    try {
        [incomes, categories] = await Promise.all([
            apiCall('/incomes/'),
            apiCall('/categories/')
        ]);
        
        populateCategorySelects();
        renderIncomes(document.getElementById("filterCategory")?.value || "");
    } catch (error) {
        console.error("Error loading income data:", error);
    }
});

function populateCategorySelects() {
    // Only show categories that are explicitly marked as "income" type
    const incomeCategories = categories.filter(c => c.type === 'income');

    const categorySelects = [
        document.getElementById("category"),
        document.getElementById("editIncomeCategory")
    ];
    
    categorySelects.forEach(select => {
        if (select) {
            select.innerHTML = incomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    });

    const filterCategory = document.getElementById("filterCategory");
    if (filterCategory) {
        filterCategory.innerHTML = '<option value="">All Categories</option>' + 
            incomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
        // Setup filter change event
        filterCategory.addEventListener('change', (e) => {
            renderIncomes(e.target.value);
        });
    }
}

function renderIncomes(filterCategoryId = "") {
    const tbody = document.getElementById("incomeTableBody") || document.querySelector(".data-table tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    const filteredIncomes = filterCategoryId 
        ? incomes.filter(i => i.category_id == filterCategoryId)
        : incomes;
        
    filteredIncomes.forEach(income => {
        const category = categories.find(c => c.id === income.category_id);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${income.title || income.source || 'Income'}</td>
            <td>${category ? category.name : 'Unknown'}</td>
            <td>$${income.amount.toFixed(2)}</td>
            <td>${new Date(income.date).toLocaleDateString()}</td>
            <td class="actions">
                <svg onclick="openEditModal(${income.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit" style="cursor: pointer; margin-right: 8px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <svg onclick="deleteIncome(${income.id})" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2" style="cursor: pointer; color: red;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function createIncome(e) {
    e.preventDefault();
    const source = document.getElementById("title").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const category_id = parseInt(document.getElementById("category").value);
    const date = document.getElementById("date").value;

    try {
        const newIncome = await apiCall('/incomes/', 'POST', {
            source, amount, date, category_id,
        });
        incomes.push(newIncome);
        renderIncomes(document.getElementById("filterCategory")?.value || "");
        closeCreateModal();
    } catch (error) {
        alert("Failed to add income: " + error.message);
    }
}
if (saveIncomeBtn) saveIncomeBtn.addEventListener("click", createIncome);

function openEditModal(id) {
    const income = incomes.find(i => i.id === id);
    if (!income) return;
    
    editingIncomeId = id;
    
    // Assume HTML uses editIncomeTitle / editIncomeAmount / editIncomeSource / editIncomeDate
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

    const sourceEl = document.getElementById("editIncomeSource") || document.getElementById("editIncomeTitle");
    const source = sourceEl ? sourceEl.value : "";
    const amount = parseFloat(document.getElementById("editIncomeAmount").value);
    const category_id = parseInt(document.getElementById("editIncomeCategory").value);
    const date = document.getElementById("editIncomeDate").value;

    try {
        const updatedIncome = await apiCall(`/incomes/${editingIncomeId}`, 'PATCH', {
            source, amount, date, category_id
        });
        incomes = incomes.map(i => i.id === editingIncomeId ? updatedIncome : i);
        renderIncomes(document.getElementById("filterCategory")?.value || "");
        closeEditModal();
    } catch (error) {
        alert("Failed to update income: " + error.message);
    }
}
if (updateIncomeBtn) updateIncomeBtn.addEventListener("click", executeEditIncome);

async function deleteIncome(id) {
    if (!confirm("Are you sure you want to delete this income?")) return;

    try {
        await apiCall(`/incomes/${id}`, 'DELETE');
        incomes = incomes.filter(i => i.id !== id);
        renderIncomes(document.getElementById("filterCategory")?.value || "");
    } catch (error) {
        alert("Failed to delete income: " + error.message);
    }
}
