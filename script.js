// === 👑 1. MASTER / SEED LOGIN CREDENTIALS ===
// Is email aur password se tum kisi bhi device me sidha login kar paoge!
const SEED_EMAIL = "sandeep@gmail.com"; 
const SEED_PASS = "12345";

// --- APP STATE ---
let usersDB = JSON.parse(localStorage.getItem('expenseAppUsers')) || []; 
let currentUserEmail = localStorage.getItem('currentUserEmail'); 
let expenses = []; 
let userIncome = 0; 
let currentDashFilter = 'all'; 

// --- ELEMENTS ---
const authScreen = document.getElementById('auth-screen');
const mainAppScreen = document.getElementById('main-app-screen');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authBtn = document.getElementById('auth-btn');
const authSwitch = document.getElementById('switch-to-signup');

const form = document.getElementById('expense-form');
const expenseName = document.getElementById('expense-name');
const expenseCategory = document.getElementById('expense-category'); 
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');
const datalistOptions = document.getElementById('location-options'); 

const searchDateInput = document.getElementById('search-date');
const searchLocInput = document.getElementById('search-loc');
const searchItemInput = document.getElementById('search-item');

let editExpenseId = null;
let isLoginMode = true; 

// --- THEME LOGIC ---
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.querySelectorAll('.theme-btn').forEach(b => b.innerText = isDark ? '☀️' : '🌙');
}

// --- BACKUP & RESTORE LOGIC ---
window.backupData = function() {
    let dump = {};
    for (let i = 0; i < localStorage.length; i++) dump[localStorage.key(i)] = localStorage.getItem(localStorage.key(i));
    let blob = new Blob([JSON.stringify(dump)], {type: "application/json"});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = "ExpenseTracker_Backup.json"; link.click();
    alert("✅ Backup Downloaded! Isey sambhal kar rakhein.");
};

window.restoreData = function() {
    let fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'application/json';
    fileInput.onchange = e => {
        let reader = new FileReader();
        reader.onload = function(event) {
            try {
                let data = JSON.parse(event.target.result);
                for (let key in data) localStorage.setItem(key, data[key]);
                alert("🎉 Data Restore ho gaya! Refreshing..."); location.reload();
            } catch(err) { alert("❌ Galat file format!"); }
        };
        reader.readAsText(e.target.files[0]);
    };
    fileInput.click();
};

// --- AUTHENTICATION LOGIC ---
if (currentUserEmail) { showAppScreen(); } else { showAuthScreen(); }

window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? "Please Login to continue" : "Create a New Account";
    authBtn.innerText = isLoginMode ? "Login" : "Sign Up";
    document.getElementById('forgot-pw-container').style.display = isLoginMode ? "block" : "none";
    authSwitch.innerHTML = isLoginMode ? 'Sign Up' : 'Login';
}

window.resetPassword = function() {
    let email = prompt("Password reset ke liye apna registered Email daalein:");
    if (!email) return;
    email = email.trim().toLowerCase();
    
    if(email === SEED_EMAIL) { alert("❌ Ye Master Email hai, iska password code me lock hai."); return; }
    
    let userIndex = usersDB.findIndex(u => u.email === email);
    if (userIndex !== -1) {
        let newPass = prompt("Naya Password banayein:");
        if (newPass) {
            usersDB[userIndex].password = newPass.trim();
            localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
            alert("✅ Password reset ho gaya! Ab naye password se Login karein.");
        }
    } else { alert("❌ Ye Email database me nahi mila. Sign Up karein."); }
};

authForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value.trim();

    if (isLoginMode) {
        // === 👑 SEED LOGIN CHECK ===
        if (email === SEED_EMAIL && password === SEED_PASS) {
            alert("👑 Welcome Master! Universal Seed Login accepted.");
            window.loginUser(email);
            return; 
        }

        let user = usersDB.find(u => u.email === email && u.password === password);
        if (user) {
            window.loginUser(email);
        } else {
            alert("❌ Galat Email ya Password! Ya account nahi hai toh Sign Up karein.");
        }
    } else {
        if (email === SEED_EMAIL) {
            alert("❌ Ye Seed ID hai, isse naya account nahi ban sakta. Seedha Login karein.");
            return;
        }
        if (usersDB.find(u => u.email === email)) {
            alert("❌ Email pehle se registered hai! Kripya Login karein.");
        } else {
            usersDB.push({ email, password });
            localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
            alert("🎉 Account ban gaya!");
            window.loginUser(email);
        }
    }
});

window.loginUser = function(email) {
    localStorage.setItem('currentUserEmail', email);
    currentUserEmail = email;
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    showAppScreen();
}

window.logoutUser = function() {
    localStorage.removeItem('currentUserEmail');
    currentUserEmail = null;
    showAuthScreen();
}

function showAuthScreen() {
    authScreen.classList.replace('hidden-screen', 'active-screen');
    mainAppScreen.classList.replace('active-screen', 'hidden-screen');
}

function showAppScreen() {
    authScreen.classList.replace('active-screen', 'hidden-screen');
    mainAppScreen.classList.replace('hidden-screen', 'active-screen');
    document.getElementById('display-user-email').innerText = currentUserEmail;
    loadUserData();
}

// --- APP CORE LOGIC ---
function loadUserData() {
    expenses = JSON.parse(localStorage.getItem('expensesDB_' + currentUserEmail)) || [];
    userIncome = Number(localStorage.getItem('incomeDB_' + currentUserEmail)) || 0;
    updateDashboard();
    showData();
}

function saveUserData() {
    localStorage.setItem('expensesDB_' + currentUserEmail, JSON.stringify(expenses));
    localStorage.setItem('incomeDB_' + currentUserEmail, userIncome);
}

window.updateIncome = function() {
    let input = prompt("🏦 Total Paisa (Income) daalein:", userIncome);
    if (input !== null && !isNaN(input) && input.trim() !== "") {
        userIncome = Number(input);
        saveUserData(); updateDashboard();
    }
}

function updateDashboard() {
    let filtered = expenses;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStr = today.substring(0, 7);
    
    if (currentDashFilter === 'today') filtered = expenses.filter(e => e.searchDate === today);
    else if (currentDashFilter === 'month') filtered = expenses.filter(e => e.searchDate.startsWith(monthStr));
    else if (currentDashFilter === 'year') filtered = expenses.filter(e => e.searchDate.startsWith(now.getFullYear().toString()));
    else if (['market','food','travel','education','other'].includes(currentDashFilter)) filtered = expenses.filter(e => e.category === currentDashFilter);

    let filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);
    let overallTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    let balance = userIncome - overallTotal;

    document.getElementById('display-income').innerText = '₹' + userIncome;
    document.getElementById('display-expense').innerText = '₹' + filteredTotal;
    const balanceSpan = document.getElementById('display-balance');
    balanceSpan.innerText = '₹' + balance;
    balanceSpan.style.color = balance < 0 ? '#e74c3c' : 'var(--text-main)';
}

window.switchPage = function(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    if(id === 'home') document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
    if(id === 'history') { document.querySelector('.nav-btn:nth-child(2)').classList.add('active'); showData(); }
    if(id === 'menu') document.querySelector('.nav-btn:nth-child(3)').classList.add('active');
}

// --- FULL DATA SHOW & FILTER LOGIC WAPAS AA GAYA ---
function showData() {
    expenseList.innerHTML = ''; datalistOptions.innerHTML = '';
    
    let filterDate = searchDateInput.value;
    let filterLoc = searchLocInput.value.toLowerCase().trim();
    let filterItem = searchItemInput.value.toLowerCase().trim();

    let grouped = {};
    expenses.forEach(exp => {
        // Advanced Filters
        if (filterDate && exp.searchDate !== filterDate) return;
        if (filterLoc && !exp.name.toLowerCase().includes(filterLoc)) return;
        
        let catText = 'other';
        if (exp.category === 'market') catText = 'market sabji';
        if (exp.category === 'food') catText = 'food canteen lunch burger';
        if (exp.category === 'travel') catText = 'travel petrol bus';
        if (exp.category === 'education') catText = 'education college books';
        if (filterItem && !catText.includes(filterItem)) return;

        let key = exp.name.toLowerCase().trim().replace(/\s+/g, ' ');
        if (!grouped[key]) grouped[key] = { name: exp.name, total: 0, list: [] };
        grouped[key].total += exp.amount;
        grouped[key].list.push(exp);
        
        if (![...datalistOptions.options].some(o => o.value === exp.name)) {
            let opt = document.createElement('option'); opt.value = exp.name;
            datalistOptions.appendChild(opt);
        }
    });

    for (let key in grouped) {
        let item = grouped[key];
        let historyHTML = '';
        
        item.list.forEach(e => {
            let subIcon = '💰'; let catName = 'Other/Anya';
            if (e.category === 'market') { subIcon = '🛒'; catName = 'Market/Sabji'; }
            if (e.category === 'food') { subIcon = '🍔'; catName = 'Food/Canteen'; }
            if (e.category === 'travel') { subIcon = '🚌'; catName = 'Travel/Petrol'; }
            if (e.category === 'education') { subIcon = '📚'; catName = 'College/Books'; }

            historyHTML += `
                <div class="sub-item">
                    <div class="sub-item-left">
                        <span style="font-size: 18px;">${subIcon}</span>
                        <div class="sub-text-group">
                            <span class="sub-cat-name">${catName}</span>
                            <span class="sub-time">${e.time}</span>
                        </div>
                    </div>
                    <div class="sub-item-right">
                        <strong>₹${e.amount}</strong>
                        <div class="action-buttons">
                            <span class="edit-btn" onclick="editRecord(${e.id})" title="Edit">✏️</span>
                            <span class="delete-btn" onclick="deleteRecord(${e.id})" title="Delete">🗑️</span>
                        </div>
                    </div>
                </div>
            `;
        });

        let li = document.createElement('li');
        li.innerHTML = `
            <div class="item-main" onclick="fillForm('${item.name}')">
                <div class="item-left">
                    <span class="item-icon">📍</span>
                    <strong>${item.name} <span class="item-count">(${item.list.length})</span></strong>
                </div>
                <span class="item-total">₹${item.total}</span>
            </div>
            <div class="item-history-box">${historyHTML}</div>
        `;
        expenseList.appendChild(li);
    }
}

window.fillForm = function(name) {
    expenseName.value = name; 
    document.getElementById('expense-category').focus();
    switchPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteRecord = function(id) {
    if (confirm("Sach mein delete karna chahte hain?")) {
        expenses = expenses.filter(e => e.id !== id);
        saveUserData(); updateDashboard(); showData();
    }
}

window.editRecord = function(id) {
    let exp = expenses.find(e => e.id === id);
    if (exp) {
        expenseName.value = exp.name; document.getElementById('expense-category').value = exp.category; document.getElementById('expense-amount').value = exp.amount;
        editExpenseId = id; 
        document.querySelector('#expense-form .btn').innerText = "Update Expense"; 
        document.querySelector('#expense-form .btn').style.backgroundColor = "#f39c12";
        switchPage('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.clearAllData = function() {
    if (confirm("DANGER: Kya saara data clear kar dein?")) {
        expenses = []; userIncome = 0; saveUserData(); loadUserData();
        alert("Saara data clear ho gaya.");
    }
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    let name = expenseName.value.trim().replace(/\s+/g, ' ');
    let category = document.getElementById('expense-category').value;
    let amount = Number(document.getElementById('expense-amount').value);
    const submitButton = document.querySelector('#expense-form .btn');

    if (editExpenseId) {
        let exp = expenses.find(e => e.id === editExpenseId);
        exp.name = name; exp.category = category; exp.amount = amount;
        editExpenseId = null; 
        submitButton.innerText = "Add Expense";
        submitButton.style.backgroundColor = "#2ecc71";
    } else {
        const now = new Date();
        const fullDisplayTime = now.toLocaleDateString('en-IN') + " | " + now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
        expenses.push({
            id: Date.now(), name, category, amount,
            time: fullDisplayTime,
            searchDate: now.toISOString().split('T')[0]
        });
    }
    saveUserData(); expenseName.value = ''; document.getElementById('expense-amount').value = '';
    updateDashboard(); alert("Kharcha Update Ho Gaya!");
});

window.setDashFilter = function(f, btn) {
    currentDashFilter = f;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    updateDashboard();
}

searchDateInput.addEventListener('input', showData);
searchLocInput.addEventListener('input', showData);
searchItemInput.addEventListener('input', showData);

function googleTranslateElementInit() {
    new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element');
}