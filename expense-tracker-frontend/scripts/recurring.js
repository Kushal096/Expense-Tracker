const addRecurringBtn = document.getElementById("addRecurringBtn");
const recurringModal = document.getElementById("recurringModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelRecurringBtn = document.getElementById("cancelRecurringBtn");
const saveRecurringBtn = document.getElementById("saveRecurringBtn");

const editRecurringModal = document.getElementById("editRecurringModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditRecurringBtn = document.getElementById("cancelEditRecurringBtn");
const updateRecurringBtn = document.getElementById("updateRecurringBtn");

const searchRecurringInput = document.getElementById("searchRecurringInput");
const filterTypeInput = document.getElementById("filterType");
const filterFrequencyInput = document.getElementById("filterFrequency");
const transactionTypeInput = document.getElementById("transactionType");

const recurringTableBody = document.getElementById("recurringTableBody") || document.querySelector(".data-table tbody");

const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let recurrings = [];
let categories = [];
let editingRecurringId = null;
let pendingDeleteRecurringId = null;
let isDataLoading = true;
let loadErrorMessage = "";

addRecurringBtn?.addEventListener("click", () => {
    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("transactionType").value = "expense";
    document.getElementById("frequency").value = "monthly";
    document.getElementById("start_date").value = getLocalISODate(new Date());
    document.getElementById("end_date").value = "";

    populateCategorySelectByType("category_id", transactionTypeInput?.value || "expense");
    recurringModal.style.display = "flex";
});

const closeCreateModal = () => {
    recurringModal.style.display = "none";
};

closeModalBtn?.addEventListener("click", closeCreateModal);
cancelRecurringBtn?.addEventListener("click", closeCreateModal);

const closeEditModal = () => {
    editRecurringModal.style.display = "none";
    editingRecurringId = null;
};

closeEditModalBtn?.addEventListener("click", closeEditModal);
cancelEditRecurringBtn?.addEventListener("click", closeEditModal);

window.addEventListener("click", (e) => {
    if (e.target === recurringModal) closeCreateModal();
    if (e.target === editRecurringModal) closeEditModal();
    if (e.target === confirmDeleteModal) closeDeleteModal();
});

function closeDeleteModal() {
    if (confirmDeleteBtn && confirmDeleteBtn.disabled) return;
    if (confirmDeleteModal) confirmDeleteModal.style.display = "none";
    pendingDeleteRecurringId = null;
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
    if (!value) return "";
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
    searchRecurringInput?.addEventListener("input", renderRecurrings);
    filterTypeInput?.addEventListener("change", renderRecurrings);
    filterFrequencyInput?.addEventListener("change", renderRecurrings);
}

function getFilteredRecurrings() {
    const searchTerm = normalizeText(searchRecurringInput?.value);
    const type = filterTypeInput?.value || "";
    const frequency = filterFrequencyInput?.value || "";

    return recurrings.filter((recurring) => {
        const titleText = normalizeText(recurring.title);

        if (searchTerm && !titleText.includes(searchTerm)) {
            return false;
        }

        if (type && recurring.type !== type) {
            return false;
        }

        if (frequency && recurring.frequency !== frequency) {
            return false;
        }

        return true;
    });
}

function renderRecurrings() {
    const tbody = recurringTableBody;
    if (!tbody) return;

    if (isDataLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-state-row">
                    <span class="table-state-spinner" aria-hidden="true"></span>
                    Loading recurring transactions...
                </td>
            </tr>
        `;
        return;
    }

    if (loadErrorMessage) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-state-row table-state-error">${loadErrorMessage}</td>
            </tr>
        `;
        return;
    }

    const filtered = getFilteredRecurrings();
    const totalCountEl = document.getElementById("totalRecurringCount");
    const totalAmountEl = document.getElementById("totalRecurringAmount");

    let totalAmount = 0;
    const activeCount = filtered.filter((r) => r.is_active).length;

    tbody.innerHTML = "";

    if (!filtered.length) {
        const emptyMessage = recurrings.length
            ? "No recurring transactions match your current filters."
            : "No data yet. Add your first recurring transaction to get started.";

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-state-row">${emptyMessage}</td>
            </tr>
        `;

        if (totalCountEl) totalCountEl.textContent = "Active Recurring Transactions (0)";
        if (totalAmountEl) totalAmountEl.textContent = "$0.00 / mo";
        return;
    }

    filtered.forEach((r) => {
        if (r.is_active) {
            let monthlyEquivalent = r.amount;
            if (r.frequency === "daily") monthlyEquivalent = r.amount * 30;
            if (r.frequency === "weekly") monthlyEquivalent = r.amount * 4.33;
            if (r.frequency === "yearly") monthlyEquivalent = r.amount / 12;

            if (r.type === "expense") {
                totalAmount -= monthlyEquivalent;
            } else {
                totalAmount += monthlyEquivalent;
            }
        }

        const tr = document.createElement("tr");
        const isActText = r.is_active
            ? '<span style="color:green;font-weight:bold;">Active</span>'
            : '<span style="color:gray;">Inactive</span>';
        const amountDisplay = (r.type === "expense" ? "-" : "+") + `$${Number(r.amount).toFixed(2)}`;
        const amountColor = r.type === "expense" ? "color: #dc3545;" : "color: #28a745;";
        const nextGen = r.next_generation_date ? getLocalISODate(r.next_generation_date) : "N/A";

        tr.innerHTML = `
            <td>${r.title}</td>
            <td style="text-transform: capitalize;">${r.type}</td>
            <td style="${amountColor} font-weight: bold;">${amountDisplay}</td>
            <td style="text-transform: capitalize;">${r.frequency}</td>
            <td>${isActText}</td>
            <td>${nextGen}</td>
            <td class="actions">
                <button type="button" class="icon-action-btn" data-action="edit" data-id="${r.id}" aria-label="Edit recurring">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button type="button" class="icon-action-btn icon-action-btn-delete" data-action="delete" data-id="${r.id}" aria-label="Delete recurring">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (totalCountEl) totalCountEl.textContent = `Active Recurring Transactions (${activeCount})`;
    if (totalAmountEl) {
        totalAmountEl.textContent = `$${Math.abs(totalAmount).toFixed(2)} / mo eq.`;
        totalAmountEl.style.color = totalAmount < 0 ? "#dc3545" : (totalAmount > 0 ? "#28a745" : "#333");
    }
}

function onRecurringTableClick(event) {
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
        openDeleteRecurringModal(id);
    }
}

function populateCategorySelect(selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">None</option>';
    categories.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.name;
        if (selectedId && c.id === selectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function populateCategorySelectByType(selectId, type, selectedId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const allowedType = (type === "income" || type === "expense") ? type : "expense";
    const filteredCategories = categories.filter((c) => c.type === allowedType);

    select.innerHTML = '<option value="">None</option>';

    filteredCategories.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.name;
        if (selectedId && c.id === selectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

async function createRecurring(e) {
    e.preventDefault();

    if (!saveRecurringBtn || saveRecurringBtn.disabled) {
        return;
    }

    const title = document.getElementById("title").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.getElementById("transactionType").value;
    const frequency = document.getElementById("frequency").value;
    const start_date = document.getElementById("start_date").value;
    let end_date = document.getElementById("end_date").value;
    const category_id = document.getElementById("category_id").value || null;

    if (!title || Number.isNaN(amount) || amount <= 0 || !start_date) {
        showNotification("Please fill in required fields correctly.", "error");
        return;
    }

    if (!end_date) end_date = null;

    const payload = { title, amount, type, frequency, start_date, end_date };
    if (category_id) {
        payload.category_id = parseInt(category_id, 10);
    }

    try {
        await loadingManager.executeWithLoading(saveRecurringBtn, async () => {
            const newRec = await apiCall('/recurring-transactions/', 'POST', payload);
            recurrings.push(newRec);
            renderRecurrings();
            closeCreateModal();
            showNotification('Recurring transaction created successfully!', 'success');
        });
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to save recurring transaction.");
        showNotification(`Failed to save recurring transaction. ${message}`, 'error');
        console.error("Failed to save recurring:", error);
    }
}

function openEditModal(id) {
    const recurring = recurrings.find((x) => x.id === id);
    if (!recurring) return;

    editingRecurringId = id;

    document.getElementById("editTitle").value = recurring.title;
    document.getElementById("editAmount").value = recurring.amount;
    document.getElementById("editFrequency").value = recurring.frequency;
    document.getElementById("editEndDate").value = recurring.end_date ? getLocalISODate(recurring.end_date) : "";
    document.getElementById("editIsActive").value = recurring.is_active ? "true" : "false";

    editRecurringModal.style.display = "flex";
}

async function executeEditRecurring(e) {
    e.preventDefault();

    if (!editingRecurringId) return;

    if (!updateRecurringBtn || updateRecurringBtn.disabled) {
        return;
    }

    const title = document.getElementById("editTitle").value.trim();
    const amount = parseFloat(document.getElementById("editAmount").value);
    const frequency = document.getElementById("editFrequency").value;
    let end_date = document.getElementById("editEndDate").value;
    const is_active = document.getElementById("editIsActive").value === "true";

    if (!title || Number.isNaN(amount) || amount <= 0) {
        showNotification("Please fill in required fields correctly.", "error");
        return;
    }

    if (!end_date) end_date = null;

    try {
        await loadingManager.executeWithLoading(updateRecurringBtn, async () => {
            const updated = await apiCall(`/recurring-transactions/${editingRecurringId}`, 'PATCH', {
                title, amount, frequency, end_date, is_active
            });

            recurrings = recurrings.map((r) => r.id === editingRecurringId ? updated : r);
            renderRecurrings();
            closeEditModal();
            showNotification('Recurring transaction updated successfully!', 'success');
        });
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to update recurring transaction.");
        showNotification(`Failed to update recurring transaction. ${message}`, 'error');
        console.error("Update failed:", error);
    }
}

function openDeleteRecurringModal(id) {
    const recurring = recurrings.find((r) => r.id === id);
    if (!recurring) return;

    pendingDeleteRecurringId = id;

    if (confirmDeleteModal) {
        confirmDeleteModal.style.display = "flex";
    }
}

async function handleConfirmDeleteRecurring() {
    if (!pendingDeleteRecurringId) return;
    if (!confirmDeleteBtn || confirmDeleteBtn.disabled) return;

    const deletingId = pendingDeleteRecurringId;

    try {
        await loadingManager.executeWithLoading(confirmDeleteBtn, async () => {
            await apiCall(`/recurring-transactions/${deletingId}`, 'DELETE');
        });

        recurrings = recurrings.filter((r) => r.id !== deletingId);
        closeDeleteModal();
        renderRecurrings();
        showNotification('Recurring transaction deleted successfully!', 'success');
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to delete recurring transaction.");
        showNotification(`Failed to delete recurring transaction. ${message}`, 'error');
        console.error("Delete failed:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) {
        return;
    }

    attachFilterListeners();
    recurringTableBody?.addEventListener("click", onRecurringTableClick);
    confirmDeleteBtn?.addEventListener("click", handleConfirmDeleteRecurring);
    saveRecurringBtn?.addEventListener("click", createRecurring);
    updateRecurringBtn?.addEventListener("click", executeEditRecurring);
    transactionTypeInput?.addEventListener("change", () => {
        populateCategorySelectByType("category_id", transactionTypeInput.value);
    });

    isDataLoading = true;
    loadErrorMessage = "";
    renderRecurrings();

    try {
        [recurrings, categories] = await Promise.all([
            apiCall('/recurring-transactions/').then((res) => res?.items || []),
            apiCall('/categories/')
        ]);

        populateCategorySelectByType("category_id", transactionTypeInput?.value || "expense");
        loadErrorMessage = "";
    } catch (error) {
        const message = getReadableErrorMessage(error, "Unable to load recurring transactions right now.");
        loadErrorMessage = `Could not load recurring data. ${message}`;
        showNotification(loadErrorMessage, 'error', 4000);
        console.error("Failed to load recurring data:", error);
    } finally {
        isDataLoading = false;
        renderRecurrings();
    }
});
