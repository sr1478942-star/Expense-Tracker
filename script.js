// === 👑 1. MASTER / SEED LOGIN ===
const SEED_EMAIL = "sandeep@gmail.com"; const SEED_PASS = "12345";

// === 🔧 BACKEND CONFIG ===
const USE_BACKEND = true;
const API_BASE = USE_BACKEND ? 'https://expense-tracker-zzmv.onrender.com' : '';
const API_KEY = 'sb_publishable_z6eqo1yYTyFI3Y0vWqlZzA_MLGp6tdJ';

// === 🌐 BACKEND API FUNCTIONS ===
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'API error');
    }
    return response.json();
}

async function loginUserAPI(email, password) {
    return apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function signupUserAPI(email, password) {
    return apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function getExpensesAPI(email) {
    const data = await apiRequest(`/api/expenses?email=${encodeURIComponent(email)}`);
    return { expenses: data.expenses || [], incomes: data.incomes || [] };
}

async function postExpensesAPI(email, expense = null, expenses = null, incomes = null) {
    const body = { email };
    if (expense) body.expense = expense;
    if (expenses) body.expenses = expenses;
    if (incomes) body.incomes = incomes;
    return apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

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
const incomeModal = document.getElementById('income-modal');

let editExpenseId = null; let isLoginMode = true; 

// ==========================================
// 🚀 NAYA JADU: REAL TYPEWRITER ANIMATION CLASS
// ==========================================
class TypewriterPlaceholder {
    constructor(elementId, wordsArray, typeSpeed = 100, deleteSpeed = 50, delay = 1500) {
        this.element = document.getElementById(elementId);
        this.words = wordsArray;
        this.typeSpeed = typeSpeed;
        this.deleteSpeed = deleteSpeed;
        this.delay = delay;
        this.txt = '';
        this.wordIndex = 0;
        this.isDeleting = false;
        if(this.element) this.type();
    }
    type() {
        const fullWord = this.words[this.wordIndex];
        if (this.isDeleting) {
            this.txt = fullWord.substring(0, this.txt.length - 1);
        } else {
            this.txt = fullWord.substring(0, this.txt.length + 1);
        }
        
        this.element.setAttribute('placeholder', this.txt);
        let typeSpeed = this.isDeleting ? this.deleteSpeed : this.typeSpeed;

        if (!this.isDeleting && this.txt === fullWord) {
            typeSpeed = this.delay;
            this.isDeleting = true;
        } else if (this.isDeleting && this.txt === '') {
            this.isDeleting = false;
            this.wordIndex = (this.wordIndex + 1) % this.words.length; 
            typeSpeed = 500;
        }
        setTimeout(() => this.type(), typeSpeed);
    }
}

new TypewriterPlaceholder('auth-email', ['e.g. sandeep@gmail.com', 'e.g. rahul@yahoo.in']);
new TypewriterPlaceholder('auth-password', ['********', 'Type password here...']);
new TypewriterPlaceholder('expense-name', ['e.g. Lar Bajar', 'e.g. Amazon', 'e.g. Canteen']);
new TypewriterPlaceholder('expense-category', ['e.g. Sabji', 'e.g. Petrol', 'e.g. Mobile Recharge']);
new TypewriterPlaceholder('expense-amount', ['e.g. 150', 'e.g. 2000', 'e.g. 50']);
new TypewriterPlaceholder('search-loc', ['🔍 Search "Lar"', '🔍 Search "Zomato"']);
new TypewriterPlaceholder('income-source', ['e.g. Salary', 'e.g. Dost se mile', 'e.g. Papa ne diye']);
new TypewriterPlaceholder('income-amount', ['e.g. 5000', 'e.g. 500']);

// ==========================================
// 🚀 NAYA JADU: AUTO-SCROLLING CHIPS (Ping-Pong)
// ==========================================
const chipsContainer = document.getElementById('auto-scroll-chips');
let autoScrollTimer;
let scrollDirection = 1;

function startAutoScroll() {
    clearInterval(autoScrollTimer);
    autoScrollTimer = setInterval(() => {
        chipsContainer.scrollLeft += scrollDirection;
        if (Math.ceil(chipsContainer.scrollLeft) >= chipsContainer.scrollWidth - chipsContainer.clientWidth) {
            scrollDirection = -1;
        } else if (chipsContainer.scrollLeft <= 0) {
            scrollDirection = 1;
        }
    }, 30);
}

function stopAutoScroll() { clearInterval(autoScrollTimer); }

// Initialize Auto Scroll
if(chipsContainer) {
    startAutoScroll();
    chipsContainer.addEventListener('mouseenter', stopAutoScroll);
    chipsContainer.addEventListener('mouseleave', startAutoScroll);
    chipsContainer.addEventListener('touchstart', stopAutoScroll);
    chipsContainer.addEventListener('touchend', startAutoScroll);
}

// --- SMART AI EMOJI FINDER ---
function getSmartEmoji(text) {
    let t = text.toLowerCase();
    if(t.includes('sabji') || t.includes('aloo') || t.includes('veg')) return '🥦';
    if(t.includes('food') || t.includes('khana') || t.includes('pizza') || t.includes('burger') || t.includes('canteen')) return '🍔';
    if(t.includes('travel') || t.includes('petrol') || t.includes('bus') || t.includes('auto') || t.includes('bike')) return '🚌';
    if(t.includes('book') || t.includes('college') || t.includes('fee') || t.includes('pen') || t.includes('study')) return '📚';
    if(t.includes('recharge') || t.includes('wifi') || t.includes('bill') || t.includes('phone') || t.includes('mobile')) return '📱';
    if(t.includes('dawa') || t.includes('med') || t.includes('doctor') || t.includes('hospital')) return '💊';
    if(t.includes('kapde') || t.includes('cloth') || t.includes('shopping') || t.includes('shirt')) return '👕';
    if(t.includes('movie') || t.includes('cinema') || t.includes('fun') || t.includes('party')) return '🎬';
    return '🛍️'; 
}

// --- THEME & BACKUP ---
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.querySelectorAll('.theme-btn').forEach(b => b.innerText = isDark ? '☀️' : '🌙');
}

window.backupData = function() {
    let dump = {};
    for (let i = 0; i < localStorage.length; i++) dump[localStorage.key(i)] = localStorage.getItem(localStorage.key(i));
    let blob = new Blob([JSON.stringify(dump)], {type: "application/json"});
    let link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "ExpenseTracker_Backup.json"; link.click();
    alert("✅ Backup Downloaded!");
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
            } catch(err) { alert("❌ Galat file!"); }
        };
        reader.readAsText(e.target.files[0]);
    };
    fileInput.click();
};

// --- AUTH LOGIC ---
if (currentUserEmail) { showAppScreen(); } else { showAuthScreen(); }
window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? "Please Login to continue" : "Create a New Account";
    authBtn.innerText = isLoginMode ? "Login" : "Sign Up";
    document.getElementById('forgot-pw-container').style.display = isLoginMode ? "block" : "none";
    authSwitch.innerHTML = isLoginMode ? 'Sign Up' : 'Login';
}
window.resetPassword = function() {
    let email = prompt("Registered Email daalein:");
    if (!email) return; email = email.trim().toLowerCase();
    if(email === SEED_EMAIL) { alert("❌ Ye Master Email hai."); return; }
    let userIndex = usersDB.findIndex(u => u.email === email);
    if (userIndex !== -1) {
        let newPass = prompt("Naya Password banayein:");
        if (newPass) {
            usersDB[userIndex].password = newPass.trim();
            localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
            alert("✅ Password reset!");
        }
    } else { alert("❌ Email nahi mila."); }
};
authForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value.trim();
    if (isLoginMode) {
        if (USE_BACKEND) {
            loginUserAPI(email, password).then(() => {
                window.loginUser(email);
            }).catch(err => {
                alert("❌ " + err.message);
            });
        } else {
            if (email === SEED_EMAIL && password === SEED_PASS) { window.loginUser(email); return; }
            let user = usersDB.find(u => u.email === email && u.password === password);
            if (user) window.loginUser(email); else alert("❌ Galat Email ya Password!");
        }
    } else {
        if (USE_BACKEND) {
            signupUserAPI(email, password).then(() => {
                alert("🎉 Account ban gaya!");
                window.loginUser(email);
            }).catch(err => {
                alert("❌ " + err.message);
            });
        } else {
            if (email === SEED_EMAIL) return alert("❌ Master ID se signup nahi hota.");
            if (usersDB.find(u => u.email === email)) alert("❌ Email already registered!");
            else {
                usersDB.push({ email, password }); localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
                alert("🎉 Account ban gaya!"); window.loginUser(email);
            }
        }
    }
});
window.loginUser = function(email) { localStorage.setItem('currentUserEmail', email); currentUserEmail = email; document.getElementById('auth-email').value = ''; document.getElementById('auth-password').value = ''; showAppScreen(); }
window.logoutUser = function() { localStorage.removeItem('currentUserEmail'); currentUserEmail = null; showAuthScreen(); }
function showAuthScreen() { authScreen.classList.replace('hidden-screen', 'active-screen'); mainAppScreen.classList.replace('active-screen', 'hidden-screen'); }
function showAppScreen() { authScreen.classList.replace('active-screen', 'hidden-screen'); mainAppScreen.classList.replace('hidden-screen', 'active-screen'); document.getElementById('display-user-email').innerText = currentUserEmail; loadUserData(); }

// --- CORE APP LOGIC ---
function loadUserData() {
    if (USE_BACKEND) {
        getExpensesAPI(currentUserEmail).then(data => {
            expenses = data.expenses;
            incomes = data.incomes;
            updateDashboard(); showData();
        }).catch(err => {
            console.error('Failed to load data:', err);
            alert('Failed to load data from server.');
        });
    } else {
        expenses = JSON.parse(localStorage.getItem('expensesDB_' + currentUserEmail)) || [];
        incomes = JSON.parse(localStorage.getItem('incomeHistoryDB_' + currentUserEmail)) || []; 
        updateDashboard(); showData();
    }
}
function saveUserData() {
    if (USE_BACKEND) {
        postExpensesAPI(currentUserEmail, null, incomes).catch(err => {
            console.error('Failed to save incomes:', err);
            alert('Failed to save incomes to server.');
        });
    } else {
        localStorage.setItem('expensesDB_' + currentUserEmail, JSON.stringify(expenses));
        localStorage.setItem('incomeHistoryDB_' + currentUserEmail, JSON.stringify(incomes));
    }
}

window.openIncomeModal = function() { incomeModal.classList.add('active'); }
window.closeIncomeModal = function() { incomeModal.classList.remove('active'); document.getElementById('income-source').value=''; document.getElementById('income-amount').value='';}
window.submitIncome = function() {
    let source = document.getElementById('income-source').value.trim();
    let amt = Number(document.getElementById('income-amount').value);
    if(source && amt > 0) {
        const now = new Date();
        incomes.push({
            id: Date.now(), source: source, amount: amt,
            time: now.toLocaleDateString('en-IN') + " | " + now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}),
            searchDate: now.toISOString().split('T')[0]
        });
        saveUserData(); updateDashboard(); closeIncomeModal();
        alert("✅ Paisa Successfully Add Ho Gaya!");
    } else { alert("Please sahi details daalein."); }
}

function updateDashboard() {
    let filteredExp = expenses;
    const now = new Date(); const today = now.toISOString().split('T')[0]; const monthStr = today.substring(0, 7);
    
    if (currentDashFilter === 'today') filteredExp = expenses.filter(e => e.searchDate === today);
    else if (currentDashFilter === 'month') filteredExp = expenses.filter(e => e.searchDate.startsWith(monthStr));
    else if (currentDashFilter === 'year') filteredExp = expenses.filter(e => e.searchDate.startsWith(now.getFullYear().toString()));
    else if (currentDashFilter !== 'all') filteredExp = expenses.filter(e => e.category.toLowerCase().includes(currentDashFilter));

    let filteredKharcha = filteredExp.reduce((sum, e) => sum + e.amount, 0);
    let totalAsliKharcha = expenses.reduce((sum, e) => sum + e.amount, 0);
    let totalAsliIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    let balance = totalAsliIncome - totalAsliKharcha;

    document.getElementById('display-income').innerText = '₹' + totalAsliIncome;
    document.getElementById('display-expense').innerText = '₹' + filteredKharcha;
    const balanceSpan = document.getElementById('display-balance');
    balanceSpan.innerText = '₹' + balance;
    balanceSpan.style.color = balance < 0 ? '#e74c3c' : 'var(--text-main)';
}

window.setDashFilter = function(f, btn) {
    currentDashFilter = f;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); btn.classList.add('active');
    updateDashboard();
}

window.switchPage = function(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById('page-' + id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(id === 'home') document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
    if(id === 'history') { document.querySelector('.nav-btn:nth-child(2)').classList.add('active'); showData(); }
    if(id === 'menu') document.querySelector('.nav-btn:nth-child(3)').classList.add('active');
}

window.switchHistoryTab = function(mode) {
    currentHistoryTab = mode;
    document.getElementById('tab-exp').classList.remove('active');
    document.getElementById('tab-inc').classList.remove('active');
    if(mode === 'expense') document.getElementById('tab-exp').classList.add('active');
    else document.getElementById('tab-inc').classList.add('active');
    showData();
}

function showData() {
    expenseList.innerHTML = ''; datalistOptions.innerHTML = '';
    let filterDate = searchDateInput.value;
    let filterLoc = document.getElementById('search-loc').value.toLowerCase().trim();

    if(currentHistoryTab === 'expense') {
        let grouped = {};
        expenses.forEach(exp => {
            if (filterDate && exp.searchDate !== filterDate) return;
            if (filterLoc && !exp.name.toLowerCase().includes(filterLoc) && !exp.category.toLowerCase().includes(filterLoc)) return;
            let key = exp.name.toLowerCase().trim().replace(/\s+/g, ' ');
            if (!grouped[key]) grouped[key] = { name: exp.name, total: 0, list: [] };
            grouped[key].total += exp.amount; grouped[key].list.push(exp);
            if (![...datalistOptions.options].some(o => o.value === exp.name)) {
                let opt = document.createElement('option'); opt.value = exp.name; datalistOptions.appendChild(opt);
            }
        });

        for (let key in grouped) {
            let item = grouped[key]; let historyHTML = '';
            item.list.forEach(e => {
                let autoEmoji = getSmartEmoji(e.category);
                historyHTML += `
                    <div class="sub-item">
                        <div class="sub-item-left"><span style="font-size:18px;">${autoEmoji}</span>
                            <div class="sub-text-group"><span class="sub-cat-name">${e.category}</span><span class="sub-time">${e.time}</span></div>
                        </div>
                        <div class="sub-item-right"><strong>₹${e.amount}</strong>
                            <div class="action-buttons"><span class="edit-btn" onclick="editRecord(${e.id})">✏️</span><span class="delete-btn" onclick="deleteRecord(${e.id}, 'expense')">🗑️</span></div>
                        </div>
                    </div>`;
            });
            let li = document.createElement('li');
            li.innerHTML = `<div class="item-main" onclick="fillForm('${item.name}')"><div class="item-left"><span class="item-icon">📍</span><strong>${item.name} <span class="item-count">(${item.list.length})</span></strong></div><span class="item-total">₹${item.total}</span></div><div class="item-history-box">${historyHTML}</div>`;
            expenseList.appendChild(li);
        }
    } else {
        let filteredIncomes = incomes.filter(inc => {
            if (filterDate && inc.searchDate !== filterDate) return false;
            if (filterLoc && !inc.source.toLowerCase().includes(filterLoc)) return false;
            return true;
        });

        filteredIncomes.forEach(inc => {
            let li = document.createElement('li');
            li.className = 'income-item';
            li.innerHTML = `
                <div class="item-main">
                    <div class="item-left"><span class="item-icon">🏦</span>
                        <div style="display:flex; flex-direction:column;"><strong>${inc.source}</strong><span class="sub-time">${inc.time}</span></div>
                    </div>
                    <div style="text-align:right;">
                        <span class="item-total income-total">+ ₹${inc.amount}</span>
                        <br><span class="delete-btn" style="margin-top:5px; display:inline-block;" onclick="deleteRecord(${inc.id}, 'income')">🗑️ Delete</span>
                    </div>
                </div>`;
            expenseList.appendChild(li);
        });
    }
}

window.fillForm = function(name) { expenseName.value = name; expenseCategory.focus(); switchPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }

window.deleteRecord = function(id, type) {
    if (confirm("Sach mein delete karna chahte hain?")) {
        if(type === 'expense') {
            expenses = expenses.filter(e => e.id !== id);
            if (USE_BACKEND) {
                postExpensesAPI(currentUserEmail, null, expenses).then(() => {
                    updateDashboard(); showData();
                }).catch(err => {
                    console.error('Failed to delete expense:', err);
                    alert('Failed to delete expense on server.');
                });
            } else {
                saveUserData(); updateDashboard(); showData();
            }
        } else {
            incomes = incomes.filter(i => i.id !== id);
            saveUserData(); updateDashboard(); showData();
        }
    }
}

window.editRecord = function(id) {
    let exp = expenses.find(e => e.id === id);
    if (exp) {
        expenseName.value = exp.name; expenseCategory.value = exp.category; expenseAmount.value = exp.amount;
        editExpenseId = id; document.querySelector('#expense-form .btn').innerText = "Update Expense"; document.querySelector('#expense-form .btn').style.backgroundColor = "#f39c12";
        switchPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.clearAllData = function() {
    if (confirm("DANGER: Kya saara data clear kar dein?")) { 
        expenses = []; incomes = []; 
        if (USE_BACKEND) {
            postExpensesAPI(currentUserEmail, null, [], []).then(() => {
                loadUserData(); alert("Saara data clear ho gaya.");
            }).catch(err => {
                console.error('Failed to clear data:', err);
                alert('Failed to clear data on server.');
            });
        } else {
            saveUserData(); loadUserData(); alert("Saara data clear ho gaya.");
        }
    }
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    let name = expenseName.value.trim().replace(/\s+/g, ' '); let category = expenseCategory.value.trim(); let amount = Number(expenseAmount.value);
    if (editExpenseId) {
        let exp = expenses.find(e => e.id === editExpenseId);
        exp.name = name; exp.category = category; exp.amount = amount; editExpenseId = null; 
        document.querySelector('#expense-form .btn').innerText = "Add Expense"; document.querySelector('#expense-form .btn').style.backgroundColor = "#2ecc71";
        if (USE_BACKEND) {
            postExpensesAPI(currentUserEmail, null, expenses).then(() => {
                updateDashboard(); alert("Kharcha Update Ho Gaya!");
            }).catch(err => {
                console.error('Failed to update expense:', err);
                alert('Failed to update expense on server.');
            });
        } else {
            saveUserData(); updateDashboard(); alert("Kharcha Update Ho Gaya!");
        }
    } else {
        const now = new Date();
        const newExp = { id: Date.now(), name, category, amount, time: now.toLocaleDateString('en-IN') + " | " + now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}), searchDate: now.toISOString().split('T')[0]};
        expenses.push(newExp);
        if (USE_BACKEND) {
            postExpensesAPI(currentUserEmail, newExp).then(() => {
                updateDashboard(); alert("Kharcha Add Ho Gaya!");
            }).catch(err => {
                console.error('Failed to add expense:', err);
                alert('Failed to add expense on server.');
                expenses.pop(); // revert
            });
        } else {
            saveUserData(); updateDashboard(); alert("Kharcha Add Ho Gaya!");
        }
    }
    expenseName.value = ''; expenseCategory.value=''; expenseAmount.value = '';
});

searchDateInput.addEventListener('input', showData); searchLocInput.addEventListener('input', showData);
function googleTranslateElementInit() { new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element'); }