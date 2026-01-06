let incomeChart = null;
let selectedYear = null;
let editingAccountId = null;
let editingIncomeId = null;
let editingTransactionId = null;
let transactionFilterInitialized = false;


function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    document.querySelectorAll('.sidebar ul li').forEach(li => {
        li.classList.remove('active');
        if (li.getAttribute('data-page') === id) {
            li.classList.add('active');
        }
    });

    // Dashboard-only controls
    const yearBox = document.getElementById('yearBox');
    if (yearBox) {
        yearBox.style.display = (id === 'dashboard') ? 'block' : 'none';
    }
}


/* ---------- POPUP ---------- */
function openPopup(id) {
    document.getElementById(id +'Popup').style.display = 'flex';
}
function closePopup(id) {
    document.getElementById(id +'Popup').style.display = 'none';
}



/* ---------- Prevent future dates on calander as input for creating items ---------- */
function restrictFutureDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(d => {
        d.max = today;
    });
}


/* -------- Toggle Button ---------*/
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('hidden');
}


/* ================= DASHBOARD ================= */

async function loadYears() {
    const res = await fetch('/income/years');
    const years = await res.json();
    const sel = document.getElementById('yearSelect');
    sel.innerHTML = '';

    years.forEach(y => {
        const o = document.createElement('option');
        o.value = y;
        o.textContent = y;
        sel.appendChild(o);
    });

    if (years.length) {
        selectedYear = years[years.length - 1];
        sel.value = selectedYear;
        loadDashboard();
    }

    sel.onchange = () => {
        selectedYear = sel.value;
        loadDashboard();
    };
}

/* ---------- DASHBOARD ---------- */
async function loadDashboard() {
    await loadIncomeChart();
    await loadStats();
    await loadForecast();
}

async function loadIncomeChart() {
    const res = await fetch(`/income/monthly/${selectedYear}`);
    const values = await res.json();

    if (incomeChart) incomeChart.destroy();

    incomeChart = new Chart(document.getElementById('incomeChart'), {
        type: 'bar',
        data: {
            labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
            datasets: [
                { label: `Income ${selectedYear}`, data: values, backgroundColor: '#8f94fb' },
                { type: 'line', label: 'Trend', data: values, borderColor: '#000', tension: 0.4 }
            ]
        }
    });
}

async function loadStats() {
    const s = await (await fetch(`/stats/summary/${selectedYear}`)).json();
    document.getElementById('incomeStats').innerHTML = `
        Mean: ${s.mean}<br>
        Median: ${s.median}<br>
        Min: ${s.min}<br>
        Max: ${s.max}<br>
        Std: ${s.std}
    `;
}

async function loadForecast() {
    const f = await (await fetch(`/stats/income_forecast/${selectedYear}`)).json();
    document.getElementById('incomeForecast').textContent =
        f.prediction ? `Next Month: ${f.prediction}` : f.message;
}

/* ---------- ACCOUNTS ---------- */
/**
 * Captures user input, validates it, and saves a new account.
 */
function openCreateAccount() {
    editingAccountId = null;

    accId.disabled = false;
    accId.value = '';
    accName.value = '';
    accType.value = 'Savings Account';
    accCurrency.value = 'HUF';

    document.querySelector('#accountPopup h3').innerText = 'Create Account';
    document.querySelector('#accountUpdateBtn').style.display = 'none';

    openPopup('account');
}

/**
 * Fetches the list of accounts from the server and displays them in a table.
 */
async function loadAccounts() {
    // 1. Fetch data
    const res = await fetch('/accounts');
    const data = await res.json();

    // 2. Clear current table contents
    const tbody = document.querySelector('#accountsTable tbody');
    tbody.innerHTML = '';

    // 3. Loop through data and create table rows
    data.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.id}</td>
            <td>${a.name}</td>
            <td>${a.type}</td>
            <td>${a.currency}</td>
            <td>
                <button onclick='openUpdateAccount(${JSON.stringify(a)})'>Update</button>
                <button onclick="deleteAccount(${a.id})">Delete</button>
            </td>

        `;
        tbody.appendChild(tr);
    });
}


async function createAccount() {
    // 1. Get values from the input fields
    const id = document.getElementById('accId').value;
    const name = document.getElementById('accName').value;
    const type = document.getElementById('accType').value;
    const currency = document.getElementById('accCurrency').value;

    // 2. Data Validation (Regex)
    if (!/^\d{4}$/.test(id)) {
        alert('ID must be exactly 4 digits');
        return;
    }
    if (!/^[A-Za-z ]{1,30}$/.test(name)) {
        alert('Name must be 1-30 letters or spaces');
        return;
    }
    if (currency !== 'HUF') {
        alert('Only HUF (Hungarian Forint) is currently allowed');
        return;
    }

    // 3. Send Data to Server
    await fetch('/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, type, currency })
    });

    // 4. Update UI
    closePopup('account'); // Closes the entry form
    loadAccounts();        // Refreshes the table
    alert('Account created!');
}

/* ---------- Edit Account ---------- */
function editAccount(a) {
    editingAccountId = a.id;

    accId.value = a.id;
    accId.disabled = true;

    accName.value = a.name;
    accType.value = a.type;
    accCurrency.value = a.currency;

    accountCreateBtn.style.display = 'none';
    accountUpdateBtn.style.display = 'inline-block';

    openPopup('account');
}

/* ---------- Update Account ---------- */
function openUpdateAccount(a) {
    editingAccountId = a.id;

    accId.value = a.id;
    accId.disabled = true;
    accName.value = a.name;
    accType.value = a.type;
    accCurrency.value = a.currency;

    document.querySelector('#accountPopup h3').innerText = 'Update Account';
    document.querySelector('#accountCreateBtn').style.display = 'none';
    document.querySelector('#accountUpdateBtn').style.display = 'inline-block';

    openPopup('account');
}

async function updateAccountConfirm() {
    await fetch('/accounts', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            id: editingAccountId,
            name: accName.value,
            type: accType.value,
            currency: accCurrency.value
        })
    });

    closePopup('account');
    loadAccounts();
    loadBalance();
    alert('Account updated successfully');
}


/* ---------- Delete Account ---------- */
async function deleteAccount(id) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    const res = await fetch('/accounts',{
        method:'DELETE',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id})
    });

    const r = await res.json();
    if (!res.ok) {
        alert(r.error);
        return;
    }

    loadAccounts();
    loadBalance();
}

/* ---------- TRANSACTIONS ---------- */
/** (1)
 * Collects transaction details and saves them to the database.
 */  
function openCreateTransaction() {
    editingTransactionId = null;

    document.getElementById('transactionPopupTitle').innerText = 'Create Transaction';
    document.getElementById('transactionCreateBtn').style.display = 'inline-block';
    document.getElementById('transactionUpdateBtn').style.display = 'none';

    //document.getElementById('txAccountId').value = tx.account_id;
    //document.getElementById('txAmount').value = tx.amount;
    //document.getElementById('txDate').value = tx.date.innerText.split('T')[0];
    //document.getElementById('txDesc').value = tx.description;
    
    txAccountId.value = '';
    txAmount.value = '';
    txDesc.value = '';

    openPopup('transaction');
}

async function createTransaction() {
    // 1. Extract and convert values from the form
    const account_id = parseInt(document.getElementById('txAccountId').value);
    const amount = parseFloat(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value;
    const description = document.getElementById('txDesc').value;

    // 2. Validation: Ensure numbers are valid and a date is selected
    if (isNaN(account_id) || isNaN(amount) || !date) {
        alert('Invalid input. Please check the Account ID and Amount.');
        return;
    }

    if (amount <= 0) {
    alert("Amount must be a positive number");
    return;
    }

    // 3. Send POST request to the server
    const res = await fetch('/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id, amount, date, description })
    });

    const r = await res.json()

    if (!res.ok){
        alert(r.error || 'Transaction failed!');
        return;
    }

    // 4. Reset UI
    closePopup('transaction');
    loadTransactions(); // Refresh the list
    loadBalance();
    loadBudgets();
    loadSavings();
    alert('Transaction was successful!');
}


/** (3)
 * Retrieves the transaction history and displays it in the table.
 */
async function loadTransactions() {
    const res = await fetch('/transactions');
    const data = await res.json();

    const filter = document.getElementById('txFilter');
    const tbody = document.querySelector('#transactionsTable tbody');

    const selected = filter.value;   // save selection
    tbody.innerHTML = '';

    // build filter only once
    if (!transactionFilterInitialized) {
        const monthSet = new Set();

        data.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            monthSet.add(key);
        });

        filter.innerHTML = `<option value="">All</option>`;
        [...monthSet].sort().forEach(m => {
            const [y, mo] = m.split('-');
            filter.innerHTML += `<option value="${m}">${mo}/${y}</option>`;
        });

        transactionFilterInitialized = true;
    }

    filter.value = selected;   // restore selection

    data.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

        if (selected && selected !== key) return;

        tbody.innerHTML += `
            <tr>
                <td>${t.id}</td>
                <td>${t.account_id}</td>
                <td>${t.amount}</td>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>
                    <button onclick='openTransactionUpdate(${JSON.stringify(t)})'>Update</button>
                    <button onclick="deleteTransaction('${t.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

/* Update the transaction (2) */

async function openTransactionUpdate(tx) {
    editingTransactionId = tx.id;

    // Prefill fields
    document.getElementById('txAccountId').value = tx.account_id;
    document.getElementById('txAmount').value = tx.amount;
    //document.getElementById('txDate').value = tx.date.innerText.split('T')[0];
    document.getElementById('txDesc').value = tx.description;
    
    
    // Switch buttons
    
    document.getElementById('transactionCreateBtn').style.display = 'none';
    document.getElementById('transactionUpdateBtn').style.display = 'inline-block';
    document.getElementById('transactionPopupTitle').innerText = 'Update Transaction';

    openPopup('transaction');
}

async function updateTransactionConfirm() {
    const res = await fetch('/transactions', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            id: editingTransactionId,
            account_id: Number(txAccountId.value),
            amount: Number(txAmount.value),
            date: txDate.value,
            description: txDesc.value
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'Update failed');
        return;
    }
    if (!txDate.value) {
        alert("Please select a valid date");
        return;
    }

    closePopup('transaction');
    editingTransactionId = null;

    loadTransactions();
    loadBalance();

    alert('Transaction updated successfully');
}

/**
 * Removes a specific transaction by ID.
 */
async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    const res = await fetch('/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
   
    if(!res.ok){
        alert('Delete failed!');
        return;
    }

    loadBalance();   // AUTO update
    loadSavings();
    loadIncome();
    loadTransactions(); // Refresh the list after deletion
    alert('Transaction deleted Successfully!');
}


/* ---------- BUDGETS ---------- */
/**
 * Captures the budget goal for a specific month and sends it to the server.
 */
function openCreateBudget() {
    editingBudgetId = null;

    document.getElementById('budgetPopupTitle').innerText = 'Create Budget';
    document.getElementById('budgetCreateBtn').style.display = 'inline-block';
    document.getElementById('budgetUpdateBtn').style.display = 'none';

    budgetMonth.value = '';
    budgetAmount.value = '';
    budgetNotes.value = '';

    openPopup('budget');
}


async function createBudget() {
    const month_year = budgetMonth.value;
    const amount = Number(budgetAmount.value);
    const notes = budgetNotes.value;

    if (!month_year || amount <= 0 || notes.length > 40) {
        alert("Invalid input");
        return;
    }

    const res = await fetch('/budgets', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ month_year, amount, notes })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || "Failed to create budget");
        return;
    }

    closePopup('budget');
    loadBudgets();
    loadSavings();

    alert("Budget created successfully");
}


/* --------- Edit Budget ------------- */
let editingBudgetId = null;

function editBudget(b) {
    editingBudgetId = b.id;

    // Prefill fields
    document.getElementById('budgetMonth').value = b.month_year;
    document.getElementById('budgetAmount').value = b.amount;
    document.getElementById('budgetNotes').value = b.notes;

    // Switch buttons
    document.getElementById('budgetCreateBtn').style.display = 'none';
    document.getElementById('budgetUpdateBtn').style.display = 'inline-block';
    document.getElementById('budgetPopupTitle').innerText = 'Update Budget';

    openPopup('budget');
}

// ------ Update Budget -----
async function updateBudgetConfirm() {
    const amount = Number(budgetAmount.value);

    // POSITIVE CHECK
    if (amount <= 0) {
        alert("Amount must be a positive number");
        return;
    }

    const res = await fetch('/budgets', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            id: editingBudgetId,
            month_year: budgetMonth.value,
            amount: amount,
            notes: budgetNotes.value
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || "Update failed");
        return;
    }

    editingBudgetId = null;
    closePopup('budget');

    loadBudgets();
    loadSavings();

    alert("Budget updated successfully");
}


/* ------------- Delete Budget -------------*/
async function deleteBudget(id) {
    if (!confirm("Are you sure you want to delete the budget?")) return;

    const res = await fetch('/budgets', {
        method: 'DELETE',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id })
    });

    if (!res.ok) {
        alert("Delete failed");
        return;
    }

    loadBudgets();
    loadSavings();
    //alert('message');
}


async function loadBudgets(){
    // set budget month popup input upto current month for creating new budgets
    document.getElementById('budgetMonth').max = new Date().toISOString().slice(0, 7);

    const data=await (await fetch('/budgets')).json();
    const tbody=document.querySelector('#budgetsTable tbody'); tbody.innerHTML='';
    data.forEach(b=>{
        tbody.innerHTML+=`
        <tr>
            <td>${b.month_year}</td>
            <td>${b.amount}</td>
            <td>${b.notes}</td>
            <td>
                <button onclick='editBudget(${JSON.stringify(b)})'>Update</button>
                <button onclick="deleteBudget(${b.id})">Delete</button>
            </td>
        </tr>`;
    });
}

/* ---------- INCOME ---------- */
function openCreateIncome() {
    editingIncomeId = null;

    incomePopupTitle.innerText = "Create Income";
    incomeCreateBtn.style.display = 'inline-block';
    incomeUpdateBtn.style.display = 'none';

    incomeAccountId.value = '';
    incomeAmount.value = '';
    incomeDate.value = '';
    incomeSource.value = '';

    openPopup('income');
}


async function createIncome() {
    if (editingIncomeId !== null) return;

    const account_id = Number(incomeAccountId.value);
    const amount = Number(incomeAmount.value);

    if (amount <= 0) {
        alert("Amount must be positive");
        return;
    }

    const res = await fetch('/income', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
            account_id,
            amount,
            date: incomeDate.value,
            source: incomeSource.value
        })
    });

    const r = await res.json();
    if (!res.ok) {
        alert(r.error);
        return;
    }

    closePopup('income');
    loadIncome();
    loadBalance();
    loadDashboard();
    alert('Income created successfully!');
}

async function loadIncome() {
    const data = await (await fetch('/income')).json();
    const tbody = document.querySelector('#incomeTable tbody');
    tbody.innerHTML = '';

    data.forEach(i => {
        tbody.innerHTML += `
        <tr>
            <td>${i.id}</td>
            <td>${i.account_id}</td>
            <td>${i.amount}</td>
            <td>${i.date}</td>
            <td>${i.source}</td>
            <td>
                <button onclick='editIncome(${JSON.stringify(i)})'>Update</button>
                <button onclick="deleteIncome('${i.id}')">Delete</button>
            </td>
        </tr>`;
    });
}

/* --------- Edit Income ------------- */
function editIncome(i) {
    editingIncomeId = i.id;

    incomePopupTitle.innerText = "Update Income";
    incomeCreateBtn.style.display = 'none';
    incomeUpdateBtn.style.display = 'inline-block';

    incomeAccountId.value = i.account_id;
    incomeAmount.value = i.amount;
    incomeDate.value = i.date;
    incomeSource.value = i.source;

    openPopup('income');
}

// -------- Update Income -------
async function updateIncomeConfirm() {
    const amount = Number(incomeAmount.value);
    const accountId = Number(incomeAccountId.value);

    // FRONTEND VALIDATIONS
    if (amount <= 0) {
        alert("Amount must be a positive number");
        return;
    }

    if (!accountId) {
        alert("Account ID is required");
        return;
    }

    const res = await fetch('/income', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            id: editingIncomeId,
            account_id: accountId,
            amount: amount,
            date: incomeDate.value,
            source: incomeSource.value
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || "Update failed");
        return;
    }

    closePopup('income');
    editingIncomeId = null;

    loadIncome();
    loadBalance();
    loadDashboard();

    alert('Income updated successfully');
}


// ------- Delete Income
async function deleteIncome(id) {
    if (!confirm('Are you sure you want to delete the item?')) return;

    const res = await fetch('/income', {
        method: 'DELETE',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({id})
    });

    if(!res.ok){
        alert('Delete failed!');
        return;
    }

    loadIncome();
    loadDashboard();
    loadBalance();
    //alert('message');
}

// ------- Filter Income  -----------

async function filterIncomeByMonth() {
    const year = incomeYearSelect.value;
    const month = incomeMonthSelect.value;

    const data = await (await fetch(`/income/filter/${year}/${month}`)).json();
    renderIncomeTable(data);
}

/* ---------- CURRENCY ---------- */

async function loadCurrency() {
    const r = await fetch('https://open.er-api.com/v6/latest/HUF');
    const d = await r.json();

    const tbody = document.querySelector('#currencyTable tbody');
    tbody.innerHTML = '';

    ['USD','EUR','HUF','BDT'].forEach(c=>{
        tbody.innerHTML+=`<tr><td>${c}</td><td>${d.rates[c].toFixed(2)}</td></tr>`;
    });

    ['curSelect1','curSelect2'].forEach(id=>{
        const s=document.getElementById(id);
        s.innerHTML='';
        ['USD','EUR','HUF','BDT'].forEach(c=>s.innerHTML+=`<option>${c}</option>`);
    });
}

async function convertCurrency() {
    const amount = curAmount1.value;
    const from = curSelect1.value;
    const to = curSelect2.value;

    const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    const d = await r.json();

    curAmount2.value = (amount * d.rates[to]).toFixed(2);
}


// --- Balance Section ---
/**
 * Fetches the current balance for each account and displays it.
 * This usually pulls from a 'View' or calculated column in your database.
 */
async function loadBalance() {
    const data = await (await fetch('/balance')).json();
    const tbody = document.querySelector('#balanceTable tbody');
    tbody.innerHTML = '';

    data.forEach(b => {
        tbody.innerHTML += `
        <tr>
            <td>${b.account_id}</td>
            <td>${b.account_name}</td>
            <td>${b.total_income}</td>
            <td>${b.total_expense}</td>
            <td><b>${b.balance}</b></td>
        </tr>`;
    });
}


// --- Savings Section ---
/**
 * Fetches a monthly summary of savings (Income minus Expenses).
 */
async function loadSavings() {
    const filter = document.getElementById('savingsFilter');
    const selected = filter.value;

    const res = await fetch('/savings');
    const data = await res.json();

    const tbody = document.querySelector('#savingsTable tbody');
    tbody.innerHTML = '';
    filter.innerHTML = '<option value="">All Months</option>';

    data.forEach(s => {
        filter.innerHTML += `<option value="${s.month_year}">${s.month_year}</option>`;
        if (!selected || selected === s.month_year) {
            tbody.innerHTML += `
            <tr>
                <td>${s.month_year}</td>
                <td>${s.savings}</td>
                <td>${s.currency}</td>
            </tr>`;
        }
    });

    filter.value = selected;
}

/* ================= LIVE REFRESH ================= */

function refreshAll() {

    loadDashboard();
    loadBalance();
    loadSavings();
    loadTransactions();
    loadBudgets();
    loadIncome();
    loadAccounts();
}
async function refreshDashboard() {
    await loadIncomeChart();
    await loadIncomeStats();
    await loadIncomeForecast();
}

/* ================= INIT ================= */

window.onload = () => {
    loadYears();
    restrictFutureDates()// Set calander dates upto today
    loadCurrency();      // Set global currency settings
    loadDashboard();     // Load overview cards
    loadAccounts();      // Fill account list
    loadTransactions();  // Fill transaction list
    loadBudgets();       // Fill budget goals
    loadIncome();        // Fill income history
    loadBalance();       // Show current totals
    loadSavings();       // Show monthly progress

};
