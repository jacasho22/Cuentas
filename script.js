// Clase principal para manejar la aplicación de gastos
class ExpenseTracker {
    constructor() {
        this.transactions = [];
        this.totalIncome = 0;
        this.fixedExpenses = 0;
        this.variableExpenses = 0;
        
        // Porcentajes de división
        this.FIXED_PERCENTAGE = 0.50;    // 50% para gastos fijos
        this.VARIABLE_PERCENTAGE = 0.30; // 30% para gastos variables
        this.SAVINGS_PERCENTAGE = 0.20;  // 20% para ahorros
        
        this.initializeApp();
        this.loadData();
        this.updateDisplay();
    }

    initializeApp() {
        // Referencias a elementos del DOM
        this.elements = {
            incomeAmount: document.getElementById('income-amount'),
            incomeDescription: document.getElementById('income-description'),
            addIncomeBtn: document.getElementById('add-income'),
            
            expenseCategory: document.getElementById('expense-category'),
            expenseAmount: document.getElementById('expense-amount'),
            expenseDescription: document.getElementById('expense-description'),
            addExpenseBtn: document.getElementById('add-expense'),
            
            fixedBudget: document.getElementById('fixed-budget'),
            fixedRemaining: document.getElementById('fixed-remaining'),
            variableBudget: document.getElementById('variable-budget'),
            variableRemaining: document.getElementById('variable-remaining'),
            savingsBudget: document.getElementById('savings-budget'),
            savingsAmount: document.getElementById('savings-amount'),
            
            transactionsList: document.getElementById('transactions-list'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            
            clearMonthBtn: document.getElementById('clear-month'),
            exportDataBtn: document.getElementById('export-data')
        };

        this.setupEventListeners();

        // React a cambios de autenticación
        window.addEventListener('auth:login', () => {
            this.loadData();
            this.updateDisplay();
        });
        window.addEventListener('auth:logout', () => {
            this.transactions = [];
            this.totalIncome = 0;
            this.fixedExpenses = 0;
            this.variableExpenses = 0;
            this.updateDisplay();
        });
    }

    setupEventListeners() {
        // Agregar ingreso
        this.elements.addIncomeBtn.addEventListener('click', () => this.addIncome());
        this.elements.incomeAmount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addIncome();
        });

        // Agregar gasto
        this.elements.addExpenseBtn.addEventListener('click', () => this.addExpense());
        this.elements.expenseAmount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        // Filtros de transacciones
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterTransactions(e.target.dataset.filter));
        });

        // Acciones
        this.elements.clearMonthBtn.addEventListener('click', () => this.clearMonth());
        this.elements.exportDataBtn.addEventListener('click', () => this.exportData());
    }

    addIncome() {
        if (!this.ensureAuth()) return;
        const amount = parseFloat(this.elements.incomeAmount.value);
        const description = this.elements.incomeDescription.value.trim();

        if (!amount || amount <= 0) {
            this.showNotification('Por favor, ingresa una cantidad válida', 'error');
            return;
        }

        if (!description) {
            this.showNotification('Por favor, ingresa una descripción', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            type: 'income',
            amount: amount,
            description: description,
            date: new Date().toISOString(),
            category: 'income'
        };

        this.transactions.push(transaction);
        this.totalIncome += amount;

        // Limpiar campos
        this.elements.incomeAmount.value = '';
        this.elements.incomeDescription.value = '';

        this.updateDisplay();
        this.saveData();
        this.showNotification('Ingreso agregado correctamente', 'success');
        window.analytics?.track('income_added', { amount, description });
    }

    addExpense() {
        if (!this.ensureAuth()) return;
        const category = this.elements.expenseCategory.value;
        const amount = parseFloat(this.elements.expenseAmount.value);
        const description = this.elements.expenseDescription.value.trim();

        if (!amount || amount <= 0) {
            this.showNotification('Por favor, ingresa una cantidad válida', 'error');
            return;
        }

        if (!description) {
            this.showNotification('Por favor, ingresa una descripción', 'error');
            return;
        }

        // Verificar si hay presupuesto disponible
        const availableBudget = this.getAvailableBudget(category);
        if (amount > availableBudget) {
            this.showNotification(`No tienes suficiente presupuesto. Disponible: €${availableBudget.toFixed(2)}`, 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            type: 'expense',
            amount: amount,
            description: description,
            date: new Date().toISOString(),
            category: category
        };

        this.transactions.push(transaction);

        if (category === 'fixed') {
            this.fixedExpenses += amount;
        } else {
            this.variableExpenses += amount;
        }

        // Limpiar campos
        this.elements.expenseAmount.value = '';
        this.elements.expenseDescription.value = '';

        this.updateDisplay();
        this.saveData();
        this.showNotification('Gasto agregado correctamente', 'success');
        window.analytics?.track('expense_added', { category, amount, description });
    }

    getAvailableBudget(category) {
        if (category === 'fixed') {
            return (this.totalIncome * this.FIXED_PERCENTAGE) - this.fixedExpenses;
        } else {
            return (this.totalIncome * this.VARIABLE_PERCENTAGE) - this.variableExpenses;
        }
    }

    updateDisplay() {
        // Calcular presupuestos
        const fixedBudget = this.totalIncome * this.FIXED_PERCENTAGE;
        const variableBudget = this.totalIncome * this.VARIABLE_PERCENTAGE;
        const savingsBudget = this.totalIncome * this.SAVINGS_PERCENTAGE;

        // Calcular restantes
        const fixedRemaining = fixedBudget - this.fixedExpenses;
        const variableRemaining = variableBudget - this.variableExpenses;

        // Actualizar elementos del DOM
        this.elements.fixedBudget.textContent = `€${fixedBudget.toFixed(2)}`;
        this.elements.fixedRemaining.textContent = `€${fixedRemaining.toFixed(2)}`;
        
        this.elements.variableBudget.textContent = `€${variableBudget.toFixed(2)}`;
        this.elements.variableRemaining.textContent = `€${variableRemaining.toFixed(2)}`;
        
        this.elements.savingsBudget.textContent = `€${savingsBudget.toFixed(2)}`;
        this.elements.savingsAmount.textContent = `€${savingsBudget.toFixed(2)}`;

        // Actualizar colores según el estado del presupuesto
        this.updateBudgetColors(fixedRemaining, variableRemaining);

        // Actualizar lista de transacciones
        this.updateTransactionsList();
    }

    updateBudgetColors(fixedRemaining, variableRemaining) {
        const fixedCard = document.querySelector('.budget-card.fixed');
        const variableCard = document.querySelector('.budget-card.variable');

        // Cambiar color si se excede el presupuesto
        if (fixedRemaining < 0) {
            fixedCard.style.background = 'linear-gradient(135deg, #f56565, #e53e3e)';
        } else {
            fixedCard.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }

        if (variableRemaining < 0) {
            variableCard.style.background = 'linear-gradient(135deg, #f56565, #e53e3e)';
        } else {
            variableCard.style.background = 'linear-gradient(135deg, #f093fb, #f5576c)';
        }
    }

    updateTransactionsList(filter = 'all') {
        const filteredTransactions = this.filterTransactionsByType(filter);
        
        if (filteredTransactions.length === 0) {
            this.elements.transactionsList.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-inbox"></i>
                    <p>No hay transacciones para mostrar</p>
                </div>
            `;
            return;
        }

        // Ordenar por fecha (más recientes primero)
        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.elements.transactionsList.innerHTML = filteredTransactions.map(transaction => {
            const date = new Date(transaction.date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const typeText = this.getTransactionTypeText(transaction);
            const amountClass = transaction.type === 'income' ? 'income' : 'expense';
            const amountPrefix = transaction.type === 'income' ? '+' : '-';

            return `
                <div class="transaction-item" data-id="${transaction.id}">
                    <div class="transaction-info">
                        <div class="transaction-type">${typeText}</div>
                        <div class="transaction-description">${transaction.description}</div>
                    </div>
                    <div class="transaction-amount ${amountClass}">
                        ${amountPrefix}€${transaction.amount.toFixed(2)}
                    </div>
                    <div class="transaction-date">${date}</div>
                    <button class="delete-btn" onclick="app.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    getTransactionTypeText(transaction) {
        switch (transaction.category) {
            case 'income': return 'Ingreso';
            case 'fixed': return 'Gasto Fijo';
            case 'variable': return 'Gasto Variable';
            default: return 'Transacción';
        }
    }

    filterTransactionsByType(filter) {
        if (filter === 'all') {
            return this.transactions;
        }
        return this.transactions.filter(t => t.category === filter);
    }

    filterTransactions(filter) {
        // Actualizar botones activos
        this.elements.filterBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // Actualizar lista
        this.updateTransactionsList(filter);
        window.analytics?.track('filter_changed', { filter });
    }

    deleteTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;

        // Confirmar eliminación
        if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
            return;
        }

        // Actualizar totales
        if (transaction.type === 'income') {
            this.totalIncome -= transaction.amount;
        } else if (transaction.category === 'fixed') {
            this.fixedExpenses -= transaction.amount;
        } else if (transaction.category === 'variable') {
            this.variableExpenses -= transaction.amount;
        }

        // Eliminar de la lista
        this.transactions = this.transactions.filter(t => t.id !== id);

        this.updateDisplay();
        this.saveData();
        this.showNotification('Transacción eliminada', 'success');
        window.analytics?.track('transaction_deleted', { id, type: transaction.type, category: transaction.category, amount: transaction.amount });
    }

    clearMonth() {
        if (!confirm('¿Estás seguro de que quieres iniciar un nuevo mes? Esto eliminará todas las transacciones.')) {
            return;
        }

        this.transactions = [];
        this.totalIncome = 0;
        this.fixedExpenses = 0;
        this.variableExpenses = 0;

        this.updateDisplay();
        this.saveData();
        this.showNotification('Nuevo mes iniciado', 'success');
        window.analytics?.track('new_month', {});
    }

    exportData() {
        if (!this.ensureAuth()) return;
        const data = {
            transactions: this.transactions,
            summary: {
                totalIncome: this.totalIncome,
                fixedExpenses: this.fixedExpenses,
                variableExpenses: this.variableExpenses,
                fixedBudget: this.totalIncome * this.FIXED_PERCENTAGE,
                variableBudget: this.totalIncome * this.VARIABLE_PERCENTAGE,
                savingsBudget: this.totalIncome * this.SAVINGS_PERCENTAGE,
                exportDate: new Date().toISOString()
            }
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `gastos-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.showNotification('Datos exportados correctamente', 'success');
        window.analytics?.track('data_exported', { count: this.transactions.length });
    }

    saveData() {
        const data = {
            transactions: this.transactions,
            totalIncome: this.totalIncome,
            fixedExpenses: this.fixedExpenses,
            variableExpenses: this.variableExpenses
        };
        const user = window.auth?.getCurrentUser();
        if (!user) return; // No guardar si no hay usuario
        const key = `expenseTrackerData:${user}`;
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadData() {
        const user = window.auth?.getCurrentUser();
        if (!user) {
            this.transactions = [];
            this.totalIncome = 0;
            this.fixedExpenses = 0;
            this.variableExpenses = 0;
            return;
        }
        const key = `expenseTrackerData:${user}`;
        const savedData = localStorage.getItem(key);
        if (savedData) {
            const data = JSON.parse(savedData);
            this.transactions = data.transactions || [];
            this.totalIncome = data.totalIncome || 0;
            this.fixedExpenses = data.fixedExpenses || 0;
            this.variableExpenses = data.variableExpenses || 0;
        } else {
            this.transactions = [];
            this.totalIncome = 0;
            this.fixedExpenses = 0;
            this.variableExpenses = 0;
        }
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Agregar estilos si no existen
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                .notification-success { background: linear-gradient(135deg, #48bb78, #38a169); }
                .notification-error { background: linear-gradient(135deg, #f56565, #e53e3e); }
                .notification-info { background: linear-gradient(135deg, #4299e1, #3182ce); }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Eliminar después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Inicializar la aplicación cuando se carga la página
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ExpenseTracker();
    window.analytics?.pageView();
});


ExpenseTracker.prototype.ensureAuth = function() {
    const user = window.auth?.getCurrentUser();
    if (!user) {
        this.showNotification('Debes iniciar sesión para gestionar tus gastos', 'error');
        window.auth?.open('login');
        return false;
    }
    return true;
};