let trendsChartInstance = null;
let categoryChartInstance = null;
let transactionsPage = 1;
const transactionsPageSize = 10;

document.addEventListener("DOMContentLoaded", async () => {
  requireAuth();
  setupTransactionsPaginationControls();
  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    showLoading();
    const [summaryData, trendsData, categoriesData, transactionsData] = await Promise.all([
      apiCall("/dashboard/summary"),
      apiCall("/dashboard/trends?months=12"),
      apiCall("/dashboard/categories"),
      apiCall(`/dashboard/recent-transactions?skip=0&limit=${transactionsPageSize}`),
    ]);

    renderSummaryCards(summaryData);
    renderTrendsChart(trendsData);
    renderCategoryChart(categoriesData);
    renderRecentTransactions(transactionsData);
    updateTransactionsPagination(transactionsData);

    hideLoading();
  } catch (error) {
    console.error("Error loading dashboard:", error);
    hideLoading();
    showNotification("Failed to load dashboard data: " + error.message, 'error');
  }
}

/* ---------------- PAGINATION ---------------- */

function setupTransactionsPaginationControls() {
  const prevButton = document.getElementById("prevTransactionsPage");
  const nextButton = document.getElementById("nextTransactionsPage");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (transactionsPage > 1) {
        loadTransactionsPage(transactionsPage - 1);
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      loadTransactionsPage(transactionsPage + 1);
    });
  }
}

async function loadTransactionsPage(page) {
  const targetPage = Math.max(1, page);
  const skip = (targetPage - 1) * transactionsPageSize;
  const tbody = document.querySelector("table tbody");

  try {
    setTransactionsPaginationLoading(true);
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: #999;">Loading transactions...</td></tr>';
    }

    const transactionsData = await apiCall(
      `/dashboard/recent-transactions?skip=${skip}&limit=${transactionsPageSize}`
    );
    transactionsPage = transactionsData.current_page || targetPage;
    renderRecentTransactions(transactionsData);
    updateTransactionsPagination(transactionsData);
  } catch (error) {
    console.error("Error loading transactions page:", error);
    showNotification("Failed to load transactions: " + error.message, 'error');
  } finally {
    setTransactionsPaginationLoading(false);
  }
}

function setTransactionsPaginationLoading(isLoading) {
  const prevButton = document.getElementById("prevTransactionsPage");
  const nextButton = document.getElementById("nextTransactionsPage");

  if (prevButton) prevButton.disabled = isLoading;
  if (nextButton) nextButton.disabled = isLoading;
}

function updateTransactionsPagination(transactionsData) {
  const info = document.getElementById("transactionsPageInfo");
  const prevButton = document.getElementById("prevTransactionsPage");
  const nextButton = document.getElementById("nextTransactionsPage");

  const totalPages = transactionsData.total_pages || 0;
  const currentPage = transactionsData.current_page || 0;
  const totalTransactions = transactionsData.total || 0;

  if (info) {
    if (totalTransactions === 0) {
      info.textContent = "No transactions available";
    } else {
      info.textContent = `Page ${currentPage} of ${totalPages} · ${totalTransactions} transactions`;
    }
  }

  if (prevButton) {
    prevButton.disabled = !transactionsData.has_previous || totalTransactions === 0;
  }

  if (nextButton) {
    nextButton.disabled = !transactionsData.has_next || totalTransactions === 0;
  }
}

/* ---------------- SUMMARY ---------------- */

function renderSummaryCards(summary) {
  const cards = document.querySelectorAll(".card-item");

  if (cards.length < 4) {
    console.error("Expected 4 cards, found:", cards.length);
    return;
  }

  updateCard(cards[0], formatCurrency(summary.monthly_balance));
  updateCard(cards[1], formatCurrency(summary.monthly_expense));
  updateCard(cards[2], formatCurrency(summary.monthly_income));
  updateCard(cards[3], formatCurrency(summary.total_savings));
}

function updateCard(cardElement, value) {
  const h2 = cardElement.querySelector("h2");
  h2.textContent = value;
}

/* ---------------- TRENDS CHART ---------------- */

function renderTrendsChart(trendsData) {
  const canvas = document.getElementById("trendsChart");
  if (!canvas) {
    console.error("Trends chart canvas not found");
    return;
  }

  if (trendsChartInstance) {
    trendsChartInstance.destroy();
  }

  const months = trendsData.trends.map(t => t.month);
  const incomeData = trendsData.trends.map(t => t.total_income);
  const expenseData = trendsData.trends.map(t => t.total_expense);

  if (months.length === 0) {
    renderEmptyChart(canvas);
    return;
  }

  const ctx = canvas.getContext("2d");
  trendsChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          borderColor: "#90EE90",
          backgroundColor: "rgba(144, 238, 144, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
        {
          label: "Expense",
          data: expenseData,
          borderColor: "#FF6B6B",
          backgroundColor: "rgba(255, 107, 107, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    },
  });
}

/* ---------------- CATEGORY CHART (FIXED) ---------------- */

function renderCategoryChart(categoriesData) {
  const canvas = document.getElementById("categoryChart");
  if (!canvas) {
    console.error("Category chart canvas not found");
    return;
  }

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const categories = categoriesData.categories.map(c => c.category_name);
  const amounts = categoriesData.categories.map(c => c.total_expense);

  if (categories.length === 0) {
    renderEmptyChart(canvas);
    return;
  }

  const colors = generateCategoryColors(categories.length);

  const ctx = canvas.getContext("2d");
  categoryChartInstance = new Chart(ctx, {
    type: "doughnut", 
    data: {
      labels: categories,
      datasets: [
        {
          data: amounts,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 10,
          cutout: "55%", 
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

/* ---------------- TRANSACTIONS ---------------- */

function renderRecentTransactions(transactionsData) {
  const tbody = document.querySelector("table tbody");
  if (!tbody) {
    console.error("Table body not found");
    return;
  }

  tbody.innerHTML = "";

  if (!transactionsData.transactions || transactionsData.transactions.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: #999;">No transactions yet</td></tr>';
    return;
  }

  transactionsData.transactions.forEach((transaction) => {
    const row = createTransactionRow(transaction);
    tbody.appendChild(row);
  });
}

function createTransactionRow(transaction) {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${transaction.title}</td>
    <td>${transaction.category}</td>
    <td style="color:${transaction.type === "income" ? "#90EE90" : "#FF6B6B"}">
      ${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}
    </td>
    <td>${formatDate(transaction.date)}</td>
  `;

  return row;
}

/* ---------------- HELPERS ---------------- */

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US");
}

function generateCategoryColors(count) {
  const colors = [
    "#FF6B6B","#4ECDC4","#45B7D1","#FFA07A","#98D8C8",
    "#F7DC6F","#BB8FCE","#85C1E2","#F8B88B","#A9DFBF"
  ];
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

/* ---------------- EMPTY STATE (FIXED) ---------------- */

function renderEmptyChart(canvas) {
  const parent = canvas.parentElement;
  parent.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">
      No data available
    </div>
  `;
}