// Import apiCall from api.js

const viewAllLink = document.getElementById("viewAllLink");

if (viewAllLink) {
    viewAllLink.addEventListener("click", event => {
        event.preventDefault();
        window.location.href = "expenses.html";
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!localStorage.getItem('access_token')) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Fetch dashboard data
        const [expenses, incomes] = await Promise.all([
            apiCall('/expenses/'),
            apiCall('/incomes/')
        ]);

        // Calculate totals
        const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
        const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
        const balance = totalIncome - totalExpenses;

        // Render on page
        const balanceCards = document.querySelectorAll('.card h2');
        if (balanceCards.length >= 3) {
            balanceCards[0].textContent = `$${balance.toFixed(2)}`;
            balanceCards[1].textContent = `$${totalIncome.toFixed(2)}`;
            balanceCards[2].textContent = `$${totalExpenses.toFixed(2)}`;
        }
        
        // Render recent transactions
        const tbody = document.querySelector('.transactions table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            // Combine and sort
            const allTransactions = [
                ...expenses.map(e => ({...e, type: 'Expense'})),
                ...incomes.map(i => ({...i, type: 'Income'}))
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
            
            for (const item of allTransactions) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.category_id || 'Other'}</td>
                    <td>${new Date(item.date).toLocaleDateString()}</td>
                    <td><span class="status ${item.type === 'Income' ? 'completed' : 'pending'}">${item.type}</span></td>
                    <td>$${item.amount.toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            }
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
});