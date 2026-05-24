let trendsChartInstance = null;
let categoryChartInstance = null;
let savingsTrendsChartInstance = null;
let cashflowChartInstance = null;
let transactionsPage = 1;
const transactionsPageSize = 10;

// Analytics customization state
let analyticsState = {
  savingsTrendsMonths: 12,
  cashflowMonths: 3,
  dashboardPeriod: 'monthly'
};

document.addEventListener("DOMContentLoaded", async () => {
  requireAuth();

  setupTransactionsPaginationControls();

  setupInsightsRefreshButton();

  setupAnalyticsControls();

  await loadDashboardData();

  await loadAnalyticsData();
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

async function loadAnalyticsData() {
  try {
    showLoading();
    const [financialScoreResult, aiInsightsResult, savingsTrendsResult, cashflowResult, dashboardOverviewResult] = await Promise.allSettled([
      apiCall("/analytics/financial-sore"),
      apiCall("/ai/financial-insights", "POST", { period: analyticsState.dashboardPeriod }),
      apiCall(`/analytics/savings-trends?months=${analyticsState.savingsTrendsMonths}`),
      apiCall(`/analytics/cashflow?months=${analyticsState.cashflowMonths}`),
      apiCall(`/analytics/dashboard?period=${analyticsState.dashboardPeriod}`),
    ]);

    const financialScoreData = getSettledValue(financialScoreResult);
    const aiInsightsData = getSettledValue(aiInsightsResult);
    const savingsTrendsData = getSettledValue(savingsTrendsResult);
    const cashflowData = getSettledValue(cashflowResult);
    const dashboardOverviewData = getSettledValue(dashboardOverviewResult);

    renderFinancialScore(financialScoreData || {}, aiInsightsData);

    if (savingsTrendsData) {
      renderSavingsTrendsChart(savingsTrendsData);
    }

    if (cashflowData) {
      renderCashflowChart(cashflowData);
    }

    if (dashboardOverviewData) {
      renderDashboardMetrics(dashboardOverviewData);
      renderTopCategories(dashboardOverviewData);
    }

    if (!financialScoreData && !aiInsightsData && !savingsTrendsData && !cashflowData && !dashboardOverviewData) {
      throw new Error("No analytics data could be loaded.");
    }

    hideLoading();
  } catch (error) {
    console.error("Error loading analytics:", error);
    hideLoading();
    showNotification("Failed to load analytics data: " + error.message, 'error');
  }
}

function getSettledValue(result) {
  return result.status === "fulfilled" ? result.value : null;
}

// LOAD & DISPLAY FINANCIAL SCORE AND INSIGHTS
function renderFinancialScore(scoreData, aiData = null) {
  const scorePayload = scoreData || {};

  // Set main score
  const scoreDisplay = document.getElementById('financialScoreValue');
  if (scoreDisplay) {
    scoreDisplay.textContent = scorePayload.score || 0;
  }

  // Set component scores
  updateComponentScore('savingsRate', scorePayload.savings_rate_score || 0);
  updateComponentScore('expenseStability', scorePayload.expense_stability_score || 0);
  updateComponentScore('budgetAdherence', scorePayload.budget_adherence_score || 0);
  updateComponentScore('incomeStability', scorePayload.income_stability_score || 0);

  // Display insights
  const insightsList = document.getElementById('insightsList');
  if (insightsList) {
    insightsList.innerHTML = '';
    const insights = aiData?.insights?.length ? aiData.insights : scorePayload.insights;

    if (insights && insights.length > 0) {
      insights.forEach((insight) => {
        const li = document.createElement('li');
        li.textContent = insight;
        insightsList.appendChild(li);
      });
    } else {
      insightsList.innerHTML = '<li>Keep monitoring your finances!</li>';
    }
  }

  // Display recommendations
  const recommendationsList = document.getElementById('recommendationsList');
  if (recommendationsList) {
    recommendationsList.innerHTML = '';
    const recommendations = aiData?.recommendations?.length ? aiData.recommendations : scorePayload.recommendations;

    if (recommendations && recommendations.length > 0) {
      recommendations.forEach((rec) => {
        const li = document.createElement('li');
        li.textContent = rec;
        recommendationsList.appendChild(li);
      });
    } else {
      recommendationsList.innerHTML = '<li>Continue your current financial habits!</li>';
    }
  }

  renderAiSummary(aiData);
}

function renderAiSummary(aiData) {
  const summaryText = document.getElementById('aiSummaryText');

  if (!summaryText) {
    return;
  }

  if (aiData?.summary) {
    summaryText.textContent = aiData.summary;
    return;
  }

  summaryText.textContent = 'Latest financial summary is unavailable right now. Review the score and recommendations below.';
}

function updateComponentScore(component, score) {
  const bar = document.getElementById(`${component}Bar`);
  const value = document.getElementById(`${component}Value`);
  
  if (bar) {
    bar.style.width = score + '%';
  }
  
  if (value) {
    value.textContent = score + '%';
  }
}

function renderSavingsTrendsChart(trendsData) {
  const canvas = document.getElementById('savingsTrendsChart');
  if (!canvas) {
    console.error('Savings trends chart canvas not found');
    return;
  }

  if (savingsTrendsChartInstance) {
    savingsTrendsChartInstance.destroy();
  }

  if (!trendsData.length) {
    renderEmptyChart(canvas);
    return;
  }

  const months = trendsData.map(t => t.month_name);
  const savingsData = trendsData.map(t => t.savings);
  const savingsRateData = trendsData.map(t => t.savings_rate);

  const ctx = canvas.getContext('2d');
  savingsTrendsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Monthly Savings',
          data: savingsData,
          backgroundColor: '#90EE90',
          borderColor: '#45B700',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Savings Rate (%)',
          data: savingsRateData,
          type: 'line',
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 3,
          yAxisID: 'y1',
          pointRadius: 5,
          pointBackgroundColor: '#FF6B6B',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { family: "'JetBrains Mono', monospace", size: 12 },
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          padding: 12,
          cornerRadius: 0,
          callbacks: {
            label: function (context) {
              if (context.dataset.yAxisID === 'y1') {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
              }
              return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
            },
          },
        },
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: function (value) {
              return '$' + value.toLocaleString();
            },
          },
          grid: {
            display: true,
            drawBorder: true,
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          max: 100,
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: function (value) {
              return value + '%';
            },
          },
          grid: {
            drawOnChartArea: false,
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

function renderCashflowChart(cashflowData) {
  const canvas = document.getElementById('cashflowChart');
  if (!canvas) {
    console.error('Cashflow chart canvas not found');
    return;
  }

  if (cashflowChartInstance) {
    cashflowChartInstance.destroy();
  }

  if (!cashflowData.length) {
    renderEmptyChart(canvas);
    return;
  }

  const months = cashflowData.map(c => c.month_name);
  const incomeData = cashflowData.map(c => c.total_income);
  const expenseData = cashflowData.map(c => c.total_expenses);
  const netCashflowData = cashflowData.map(c => c.net_cashflow);

  const ctx = canvas.getContext('2d');
  cashflowChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: '#90EE90',
          borderColor: '#45B700',
          borderWidth: 1,
        },
        {
          label: 'Expenses',
          data: expenseData,
          backgroundColor: '#FF6B6B',
          borderColor: '#CC0000',
          borderWidth: 1,
        },
        {
          label: 'Net Cashflow',
          data: netCashflowData,
          type: 'line',
          borderColor: '#4ECDC4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#4ECDC4',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { family: "'JetBrains Mono', monospace", size: 12 },
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          padding: 12,
          cornerRadius: 0,
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
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
              return '$' + value.toLocaleString();
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

function renderDashboardMetrics(overviewData) {
  const totalTransactionsMetric = document.getElementById('totalTransactionsMetric');
  const avgDailySpendingMetric = document.getElementById('avgDailySpendingMetric');
  const avgTransactionMetric = document.getElementById('avgTransactionMetric');
  const savingsRateMetric = document.getElementById('savingsRateMetric');
  
  const budgetsMetMetric = document.getElementById('budgetsMetMetric');
  const budgetsExceededMetric = document.getElementById('budgetsExceededMetric');
  const budgetUtilizationMetric = document.getElementById('budgetUtilizationMetric');

  if (totalTransactionsMetric) {
    totalTransactionsMetric.textContent = overviewData.total_transactions;
  }

  if (avgDailySpendingMetric) {
    avgDailySpendingMetric.textContent = formatCurrency(overviewData.average_daily_spending);
  }

  if (avgTransactionMetric) {
    avgTransactionMetric.textContent = formatCurrency(overviewData.average_transaction_amount);
  }

  if (savingsRateMetric) {
    savingsRateMetric.textContent = overviewData.savings_rate.toFixed(1) + '%';
  }

  if (budgetsMetMetric) {
    budgetsMetMetric.textContent = overviewData.budgets_met || 0;
  }

  if (budgetsExceededMetric) {
    budgetsExceededMetric.textContent = overviewData.budgets_exceeded || 0;
    if (overviewData.budgets_exceeded > 0) {
      budgetsExceededMetric.style.color = '#FF6B6B';
    } else {
      budgetsExceededMetric.style.color = 'inherit';
    }
  }

  if (budgetUtilizationMetric) {
    const utilization = overviewData.budget_utilization_percentage || 0;
    budgetUtilizationMetric.textContent = utilization.toFixed(1) + '%';
    if (utilization > 100) {
      budgetUtilizationMetric.style.color = '#FF6B6B';
    } else {
      budgetUtilizationMetric.style.color = 'inherit';
    }
  }
}

function renderTopCategories(overviewData) {
  const grid = document.getElementById('topCategoriesGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const topCategories = overviewData.top_expense_categories || [];
  
  if (topCategories.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: #999;">No expense data available</p>';
    return;
  }

  topCategories.forEach((category, index) => {
    const categoryCard = document.createElement('div');
    categoryCard.className = 'category-card';
    categoryCard.style.borderLeft = `4px solid ${generateCategoryColors(10)[index]}`;
    
    const categoryName = document.createElement('div');
    categoryName.className = 'category-name';
    categoryName.textContent = category.category_name;
    
    const categoryAmount = document.createElement('div');
    categoryAmount.className = 'category-amount';
    categoryAmount.textContent = formatCurrency(category.total_spent);
    
    const categoryPercent = document.createElement('div');
    categoryPercent.className = 'category-percent';
    categoryPercent.textContent = category.percentage_of_total.toFixed(1) + '%';
    
    categoryCard.appendChild(categoryName);
    categoryCard.appendChild(categoryAmount);
    categoryCard.appendChild(categoryPercent);
    
    grid.appendChild(categoryCard);
  });
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

// REFRESH INSIGHTS BUTTON
function setupInsightsRefreshButton() {
  const refreshBtn = document.getElementById("refreshInsightsBtn");

  if (!refreshBtn) return;

  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Refreshing...";

    await loadAnalyticsData();

    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh Insights";
  });
}

// SETUP ANALYTICS CONTROLS
function setupAnalyticsControls() {
  const savingsTrendsSelect = document.getElementById("savingsTrendsMonths");
  const cashflowSelect = document.getElementById("cashflowMonths");
  const periodSelect = document.getElementById("dashboardPeriod");
  const applyBtn = document.getElementById("applyAnalyticsBtn");

  // Update state when selects change
  if (savingsTrendsSelect) {
    savingsTrendsSelect.addEventListener("change", (e) => {
      analyticsState.savingsTrendsMonths = parseInt(e.target.value);
    });
  }

  if (cashflowSelect) {
    cashflowSelect.addEventListener("change", (e) => {
      analyticsState.cashflowMonths = parseInt(e.target.value);
    });
  }

  if (periodSelect) {
    periodSelect.addEventListener("change", (e) => {
      analyticsState.dashboardPeriod = e.target.value;
    });
  }

  // Apply changes button
  if (applyBtn) {
    applyBtn.addEventListener("click", async () => {
      applyBtn.disabled = true;
      applyBtn.textContent = "Updating...";

      // Update chart titles
      const savingsTrendsTitle = document.getElementById('savingsTrendsTitle');
      const cashflowTitle = document.getElementById('cashflowTitle');
      
      if (savingsTrendsTitle) {
        savingsTrendsTitle.textContent = `SAVINGS TRENDS (${analyticsState.savingsTrendsMonths} MONTHS)`;
      }
      
      if (cashflowTitle) {
        cashflowTitle.textContent = `CASHFLOW ANALYSIS (${analyticsState.cashflowMonths} MONTHS)`;
      }

      await loadAnalyticsData();

      applyBtn.disabled = false;
      applyBtn.textContent = "Apply Changes";
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
