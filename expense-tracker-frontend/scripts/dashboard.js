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

  if (prevButton) {
    prevButton.disabled = isLoading;
  }

  if (nextButton) {
    nextButton.disabled = isLoading;
  }
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
          pointRadius: 5,
          pointBackgroundColor: "#90EE90",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
        {
          label: "Expense",
          data: expenseData,
          borderColor: "#FF6B6B",
          backgroundColor: "rgba(255, 107, 107, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#FF6B6B",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            font: { family: "'JetBrains Mono', monospace", size: 12 },
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          padding: 12,
          cornerRadius: 0,
          callbacks: {
            label: function (context) {
              return context.dataset.label + ": " + formatCurrency(context.parsed.y);
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: function (value) {
              return "$" + value.toLocaleString();
            },
          },
          grid: {
            display: true,
            drawBorder: true,
          },
        },
        x: {
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 11 },
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

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
    type: "pie",
    data: {
      labels: categories,
      datasets: [
        {
          data: amounts,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "right",
          labels: {
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            padding: 16,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          padding: 12,
          cornerRadius: 0,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return (
                context.label + ": " + formatCurrency(context.parsed) + " (" + percentage + "%)"
              );
            },
          },
        },
      },
    },
  });
}

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

  const titleCell = document.createElement("td");
  titleCell.className = "title-cell";
  titleCell.textContent = transaction.title;

  const categoryCell = document.createElement("td");
  categoryCell.className = "category-cell";
  categoryCell.textContent = transaction.category;

  const amountCell = document.createElement("td");
  amountCell.className = "amount-cell";
  const amountValue = transaction.type === "income" ? "+" : "-";
  amountCell.textContent = amountValue + formatCurrency(transaction.amount);
  amountCell.style.color = transaction.type === "income" ? "#90EE90" : "#FF6B6B";

  const dateCell = document.createElement("td");
  dateCell.className = "date-cell";
  dateCell.textContent = formatDate(transaction.date);

  row.appendChild(titleCell);
  row.appendChild(categoryCell);
  row.appendChild(amountCell);
  row.appendChild(dateCell);

  return row;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function generateCategoryColors(count) {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B88B",
    "#A9DFBF",
  ];

  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

function renderEmptyChart(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#999";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("No data available", canvas.width / 2, canvas.height / 2);
}
