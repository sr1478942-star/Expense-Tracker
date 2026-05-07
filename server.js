// === 👑 1. MASTER / SEED LOGIN CREDENTIALS ===
const SEED_EMAIL = "sandeep@gmail.com"; 
const SEED_PASS = "12345";

// === 🤖 2. GEMINI AI API KEY ===
const GEMINI_API_KEY = "YOUR_API_KEY_HERE"; // Apni key yahan daalo! (Ex: "AIzaSyB...")

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
const expenseItem = document.getElementById('expense-item'); 
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');
const datalistOptions = document.getElementById('location-options'); 

const searchDateInput = document.getElementById('search-date');
const searchLocInput = document.getElementById('search-loc');
const searchItemInput = document.getElementById('search-item');

let editExpenseId = null;
let isLoginMode = true; 

// ==========================================
// 🚀 ASLI AI EMOJI FINDER (Gemini API Integration)
// ==========================================
async function getSmartEmojiFromAI(itemName) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
        return getOfflineEmoji(itemName); 
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Give me exactly one single emoji that best represents the expense item: "${itemName}". Reply with ONLY the emoji, no words, no explanations.` }] }]
            })
        });
        
        const data = await response.json();
        let emoji = data.candidates[0].content.parts[0].text.trim();
        if(emoji.length > 2) return getOfflineEmoji(itemName); 
        return emoji;

    } catch (error) {
        console.error("AI API Error:", error);
        return getOfflineEmoji(itemName); 
    }
}

// Purani Offline Dictionary (Backup ke liye)
function getOfflineEmoji(itemName) {
    if (!itemName) return '💰';
    let name = itemName.toLowerCase();
    if (/(apple|seb|सेब)/i.test(name)) return '🍎';
    if (/(banana|kela|kele|केला)/i.test(name)) return '🍌';
    if (/(mango|aam|आम)/i.test(name)) return '🥭';
    if (/(sabji|sabzi|veg|vegetable|matar|gobi|bhindi|palak|lauki|kaddu|सब्जी)/i.test(name)) return '🥦';
    if (/(burger|pizza|samosa|kachori|momo|chowmein|maggi|noodle|pasta|समोसा|मोमो)/i.test(name)) return '🍔';
    if (/(rice|chawal|roti|dal|daal|khana|lunch|dinner|breakfast|meal|चावल|रोटी|खाना)/i.test(name)) return '🍛';
    if (/(tea|chai|coffee|चाय|कॉफी)/i.test(name)) return '☕';
    if (/(milk|dudh|doodh|paneer|curd|dahi|दूध|दही)/i.test(name)) return '🥛';
    if (/(petrol|diesel|fuel|gas|पेट्रोल)/i.test(name)) return '⛽';
    if (/(bus|ticket|auto|travel|safar|yatra|kiraya|bhada|fare|किराया|बस)/i.test(name)) return '🚌';
    if (/(bike|motorcycle|scooty|repair|service|बाइक)/i.test(name)) return '🏍️';
    if (/(book|copy|kitab|register|page|paper|किताब|कॉपी)/i.test(name)) return '📚';
    if (/(pen|pencil|marker|stationery|पेन)/i.test(name)) return '🖊️';
    if (/(mobile|phone|smartphone|recharge|data|internet|wifi|मोबाइल|रिचार्ज)/i.test(name)) return '📱';
    if (/(medicine|dawa|dawai|pill|tablet|दवा)/i.test(name)) return '💊';
    if (/(shirt|tshirt|t-shirt|top|शर्ट)/i.test(name)) return '👕';
    if (/(shoe|joota|joote|sneaker|जूता)/i.test(name)) return '👞';
    if (/(cloth|kapda|kapde|dress|jacket|sweater|shopping|कपड़ा)/i.test(name)) return '🛍️';
    if (/(electricity|bijli|light|bill|बिल|बिजली)/i.test(name)) return '💡';
    return '💰'; 
}

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
        if (email === SEED_EMAIL && password === SEED_PASS) {
            alert("👑 Welcome Master! Universal Seed Login accepted.");
            window.loginUser(email);
            return; 
        }
        let user = usersDB.find(u => u.email === email && u.password === password);
        if (user) { window.loginUser(email); } 
        else { alert("❌ Galat Email ya Password! Naya account banayein ya Master ID use karein."); }
    } else {
        if (email === SEED_EMAIL) { alert("❌ Ye Seed ID hai, isse naya account nahi ban sakta."); return; }
        if (usersDB.find(u => u.email === email)) { alert("❌ Email pehle se registered hai!"); } 
        else {
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
    document.getElementById('auth-email').value = ''; document.getElementById('auth-password').value = '';
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

// --- FULL DATA SHOW LOGIC ---
function showData() {
    expenseList.innerHTML = ''; datalistOptions.innerHTML = '';
    
    let filterDate = searchDateInput.value;
    let filterLoc = searchLocInput.value.toLowerCase().trim();
    let filterItem = searchItemInput.value.toLowerCase().trim();

    let grouped = {};
    expenses.forEach(exp => {
        let displayItemName = exp.item || exp.category || "Unknown";
        
        if (filterDate && exp.searchDate !== filterDate) return;
        if (filterLoc && !exp.name.toLowerCase().includes(filterLoc)) return;
        if (filterItem && !displayItemName.toLowerCase().includes(filterItem)) return;

        let key = exp.name.toLowerCase().trim().replace(/\s+/g, ' ');
        if (!grouped[key]) grouped[key] = { name: exp.name, total: 0, list: [] };
        grouped[key].total += exp.amount;
        grouped[key].list.push({ ...exp, displayItemName });
        
        if (![...datalistOptions.options].some(o => o.value === exp.name)) {
            let opt = document.createElement('option'); opt.value = exp.name;
            datalistOptions.appendChild(opt);
        }
    });

    for (let key in grouped) {
        let locationGroup = grouped[key];
        let historyHTML = '';
        
        locationGroup.list.forEach(e => {
            let subIcon = e.emojiIcon || getOfflineEmoji(e.displayItemName);

            historyHTML += `
                <div class="sub-item">
                    <div class="sub-item-left">
                        <span style="font-size: 18px;">${subIcon}</span>
                        <div class="sub-text-group">
                            <span class="sub-cat-name">${e.displayItemName}</span>
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
            <div class="item-main" onclick="fillForm('${locationGroup.name}')">
                <div class="item-left">
                    <span class="item-icon">📍</span>
                    <strong>${locationGroup.name} <span class="item-count">(${locationGroup.list.length})</span></strong>
                </div>
                <span class="item-total">₹${locationGroup.total}</span>
            </div>
            <div class="item-history-box">${historyHTML}</div>
        `;
        expenseList.appendChild(li);
    }
}

window.fillForm = function(name) {
    expenseName.value = name; 
    document.getElementById('expense-item').focus();
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
        expenseName.value = exp.name; 
        document.getElementById('expense-item').value = exp.item || exp.category || ''; 
        document.getElementById('expense-amount').value = exp.amount;
        
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

// 🚀 NAYA JADU: FORM SUBMIT WITH AI WAITING
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    let name = expenseName.value.trim().replace(/\s+/g, ' ');
    let itemValue = document.getElementById('expense-item').value.trim();
    let amount = Number(document.getElementById('expense-amount').value);
    
    const submitButton = document.querySelector('#expense-form .btn');

    // AI fetching loader
    submitButton.innerText = "AI is thinking... ⏳";
    submitButton.style.backgroundColor = "#888";
    submitButton.disabled = true;

    // Call AI function
    let smartEmoji = await getSmartEmojiFromAI(itemValue);

    if (editExpenseId) {
        let exp = expenses.find(e => e.id === editExpenseId);
        exp.name = name; 
        exp.item = itemValue; 
        exp.amount = amount;
        exp.emojiIcon = smartEmoji; 
        editExpenseId = null; 
    } else {
        const now = new Date();
        const fullDisplayTime = now.toLocaleDateString('en-IN') + " | " + now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
        expenses.push({
            id: Date.now(), 
            name: name, 
            item: itemValue, 
            amount: amount,
            emojiIcon: smartEmoji,
            time: fullDisplayTime,
            searchDate: now.toISOString().split('T')[0]
        });
    }
    
    saveUserData(); 
    expenseName.value = ''; 
    document.getElementById('expense-item').value = ''; 
    document.getElementById('expense-amount').value = '';
    
    // Reset button
    submitButton.innerText = "Add Expense";
    submitButton.style.backgroundColor = "#2ecc71";
    submitButton.disabled = false;

    updateDashboard(); 
    showData(); 
    alert("Kharcha Update Ho Gaya!");
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