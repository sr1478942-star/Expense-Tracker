// ==========================================
// 👑 GLOBAL CONFIG & BACKEND SETUP
// ==========================================
const SEED_EMAIL = "sandeep@gmail.com"; 
const SEED_PASS = "12345";
const GEMINI_API_KEY = "AIzaSyA-yCaG-hvh-mIMyRQ7yrRwtLxPPqFCaXI";

// 🔴 YOUR DATABASE IS 100% CONNECTED 🔴
const USE_BACKEND = true; 
const API_BASE = USE_BACKEND ? 'https://expense-tracker-zzmv.onrender.com' : '';
const API_KEY = 'sb_publishable_z6eqo1yYTyFI3Y0vWqlZzA_MLGp6tdJ';

let usersDB = []; let currentUserEmail = null;
let expenses = []; let incomes = []; let khataBook = []; 
let savingsGoal = { name: 'Dream', target: 50000 };
let currentDashFilter = 'all'; let currentHistoryTab = 'expense'; let editExpenseId = null; let isLoginMode = true;

function triggerVibration() { if (navigator.vibrate) navigator.vibrate(40); }
function safeGetJSON(key, defaultVal) { try { return JSON.parse(localStorage.getItem(key)) || defaultVal; } catch(e) { return defaultVal; } }

// 🌐 SAFE API CALLS WITH 20 SECONDS TIMEOUT
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...options.headers };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); 
    try {
        const response = await fetch(url, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw new Error("Server Offline");
    }
}

// ==========================================
// 🚀 GLOBAL ROUTER
// ==========================================
window.showAppScreen = function() {
    document.getElementById('auth-screen').classList.replace('active-screen', 'hidden-screen');
    document.getElementById('main-app-screen').classList.replace('hidden-screen', 'active-screen');
    window.loadUserData();
};

window.showAuthScreen = function() {
    document.getElementById('auth-screen').classList.replace('hidden-screen', 'active-screen');
    document.getElementById('main-app-screen').classList.replace('active-screen', 'hidden-screen');
};

window.switchPage = function(id) {
    triggerVibration();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); 
    document.getElementById('page-' + id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    // Fixed nav routing (5 items now)
    const navMap = {'home': 1, 'calendar': 2, 'khata': 3, 'history': 4, 'menu': 5};
    let navBtn = document.querySelector(`.nav-item:nth-child(${navMap[id]})`);
    if(navBtn) navBtn.classList.add('active');
    
    if(id === 'calendar') window.renderCalendar();
    if(id === 'history') window.showData();
};

window.openModal = function(modalId) { triggerVibration(); document.getElementById(modalId).classList.add('active'); };
window.closeModal = function(modalId) { document.getElementById(modalId).classList.remove('active'); };

window.switchHistoryTab = function(mode) {
    triggerVibration(); currentHistoryTab = mode;
    document.getElementById('tab-exp').classList.remove('active'); document.getElementById('tab-inc').classList.remove('active');
    if(mode === 'expense') document.getElementById('tab-exp').classList.add('active'); else document.getElementById('tab-inc').classList.add('active');
    window.showData();
};

window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Login karein" : "Naya Account";
    document.getElementById('auth-btn').innerText = isLoginMode ? "Secure Login" : "Sign Up";
    document.getElementById('switch-to-signup').innerText = isLoginMode ? "Sign Up" : "Login";
};

// ==========================================
// 🔒 LOGIN & DOM LOAD (DEEP ERROR FIX)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    usersDB = safeGetJSON('expenseAppUsers', []); 
    currentUserEmail = localStorage.getItem('currentUserEmail');

    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    
    // Persistent Login Check
    if (currentUserEmail) { window.showAppScreen(); } else { window.showAuthScreen(); }

    document.getElementById('auth-form').addEventListener('submit', async function(e) {
        e.preventDefault(); triggerVibration();
        const email = document.getElementById('auth-email').value.trim().toLowerCase(); 
        const password = document.getElementById('auth-password').value.trim();
        const aBtn = document.getElementById('auth-btn');
        aBtn.innerText = "Checking Server..."; aBtn.disabled = true;

        try {
            // Master Bypass
            if (email === SEED_EMAIL && password === SEED_PASS) { window.loginUser(email); return; }

            if (isLoginMode) {
                if (USE_BACKEND) {
                    try {
                        await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
                        window.loginUser(email);
                    } catch(err) {
                        // 🔴 FATAL FIX: If backend fails (sleep), auto-login from local db immediately.
                        let user = usersDB.find(u => u.email === email && u.password === password);
                        if(user) { 
                            window.loginUser(email); 
                        } else { 
                            throw new Error("Galat Password (Ya Server So Raha Hai)!"); 
                        }
                    }
                } else {
                    let user = usersDB.find(u => u.email === email && u.password === password);
                    if (user) window.loginUser(email); else throw new Error("Galat Password!");
                }
            } else {
                if (USE_BACKEND) {
                    try {
                        await apiRequest('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
                        usersDB.push({ email, password }); localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
                        window.loginUser(email);
                    } catch(err) {
                        if (usersDB.find(u => u.email === email)) throw new Error("Email pehle se hai!");
                        usersDB.push({ email, password }); localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
                        alert("Account Local DB me ban gaya (Server was slow).");
                        window.loginUser(email);
                    }
                } else {
                    if (usersDB.find(u => u.email === email)) throw new Error("Email already exists!");
                    usersDB.push({ email, password }); localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB)); 
                    window.loginUser(email);
                }
            }
        } catch (err) { alert("❌ " + err.message); } 
        finally { aBtn.innerText = isLoginMode ? "Secure Login" : "Sign Up"; aBtn.disabled = false; }
    });

    if(document.getElementById('search-item')) document.getElementById('search-item').addEventListener('input', window.showData);
    document.getElementById('expense-form').addEventListener('submit', window.handleExpenseSubmit);

    // Initializing Basic Typewriters securely
    setTimeout(() => {
        new SimpleTypewriter('auth-email', ['e.g. sandeep@gmail.com', 'apna@hisaab.in']);
        new SimpleTypewriter('expense-name', ['e.g. Bareilly', 'e.g. Dukan', 'e.g. Zomato']);
        new SimpleTypewriter('expense-item', ['e.g. Sabji', 'e.g. Train Ticket', 'e.g. Samosa']);
        new SimpleTypewriter('expense-amount', ['e.g. 150', 'e.g. 500']);
        if(document.getElementById('khata-person')) new SimpleTypewriter('khata-person', ['e.g. Rahul', 'e.g. Dukan wala']);
    }, 500);
});

window.loginUser = function(email) { localStorage.setItem('currentUserEmail', email); currentUserEmail = email; window.showAppScreen(); };
window.logoutUser = function() { localStorage.removeItem('currentUserEmail'); location.reload(); };

window.resetPassword = function() { 
    let email = prompt("Registered Email daalein:"); if (!email) return; email = email.trim().toLowerCase(); 
    if(email === SEED_EMAIL) return alert("❌ Master Email locked."); 
    let userIndex = usersDB.findIndex(u => u.email === email); 
    if (userIndex !== -1) { let newPass = prompt("Naya Password:"); if (newPass) { usersDB[userIndex].password = newPass.trim(); localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB)); alert("✅ Password reset!"); } } 
    else alert("❌ Email nahi mila."); 
};

// ==========================================
// 🚀 TYPEWRITER CLASS
// ==========================================
class SimpleTypewriter {
    constructor(inputId, placeholders) {
        this.input = document.getElementById(inputId); if(!this.input) return;
        this.placeholders = placeholders; this.currentIndex = 0; this.currentChar = 0; this.isDeleting = false;
        this.timeoutId = null; this.isActive = true;

        this.input.addEventListener('focus', () => { this.isActive = false; clearTimeout(this.timeoutId); this.input.setAttribute('placeholder', ''); });
        this.input.addEventListener('blur', () => { if (this.input.value.trim() === '') { this.isActive = true; this.currentChar = 0; this.isDeleting = false; this.type(); } });
        this.type();
    }
    type() {
        if (!this.isActive || !this.input) return;
        const currentWord = this.placeholders[this.currentIndex];
        if (this.isDeleting) this.currentChar--; else this.currentChar++;
        this.input.setAttribute('placeholder', currentWord.substring(0, this.currentChar));
        let speed = this.isDeleting ? 40 : 80;
        if (!this.isDeleting && this.currentChar === currentWord.length) { speed = 1500; this.isDeleting = true; } 
        else if (this.isDeleting && this.currentChar === 0) { this.isDeleting = false; this.currentIndex = (this.currentIndex + 1) % this.placeholders.length; speed = 500; }
        this.timeoutId = setTimeout(() => this.type(), speed);
    }
}

// ==========================================
// 🧠 SMART EMOJI LOGIC
// ==========================================
window.getOfflineEmoji = function(text) {
    let name = (text || "").toLowerCase(); let cat = "Other"; let icon = '🛍️';
    if (/(apple|seb|fruit|fal|mango|aam|banana|kela)/i.test(name)) { cat = "Food"; icon = '🍎'; }
    else if (/(potato|aloo|onion|tomato|sabji|veg|matar|gobi|doodh)/i.test(name)) { cat = "Food"; icon = '🥦'; }
    else if (/(burger|pizza|samosa|momo|chowmein|maggi|snack)/i.test(name)) { cat = "Food"; icon = '🍔'; }
    else if (/(rice|chawal|roti|dal|khana|lunch|dinner|meal)/i.test(name)) { cat = "Food"; icon = '🍛'; }
    else if (/(tea|chai|coffee|milk|water|pani|juice)/i.test(name)) { cat = "Food"; icon = '☕'; }
    else if (/(petrol|diesel|fuel|gas)/i.test(name)) { cat = "Travel"; icon = '⛽'; }
    else if (/(bus|ticket|auto|travel|safar|car|taxi|train|kiraya)/i.test(name)) { cat = "Travel"; icon = '🚌'; }
    else if (/(book|copy|kitab|pen|college|school|fees|padhai)/i.test(name)) { cat = "Education"; icon = '📚'; }
    else if (/(mobile|phone|recharge|data|internet|wifi)/i.test(name)) { cat = "Bills"; icon = '📱'; }
    else if (/(medicine|dawa|hospital|doctor|clinic)/i.test(name)) { cat = "Health"; icon = '💊'; }
    else if (/(shirt|pant|shoe|cloth|kapda|dress)/i.test(name)) { cat = "Shopping"; icon = '👕'; }
    else if (/(rent|room|ghar|electricity|bijli|bill)/i.test(name)) { cat = "Bills"; icon = '🏠'; }
    else if (/(movie|cinema|film|game|park)/i.test(name)) { cat = "Entertainment"; icon = '🎬'; }
    if(icon === '🛍️' && name.length > 0) { icon = name.charAt(0).toUpperCase(); }
    return { category: cat, emoji: icon };
}

window.getSmartEmojiFromAI = async function(itemName) {
    if (!GEMINI_API_KEY) return window.getOfflineEmoji(itemName);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Analyze item: "${itemName}". Reply with 2 things separated by pipe (|): 1. Single Emoji. 2. Category (Food, Travel, Shopping, Bills, Health, Education, Entertainment, Other). Example: 🍔|Food` }] }] }) });
        const data = await response.json(); let parts = data.candidates[0].content.parts[0].text.trim().split('|');
        if(parts.length >= 2) return { emoji: parts[0].trim(), category: parts[1].trim() }; return window.getOfflineEmoji(itemName);
    } catch (error) { return window.getOfflineEmoji(itemName); }
}

// ==========================================
// ⚡ ADD EXPENSE LOGIC
// ==========================================
window.handleExpenseSubmit = async function(e) {
    e.preventDefault(); triggerVibration();
    let nameValue = document.getElementById('expense-name').value.trim(); 
    let itemValue = document.getElementById('expense-item').value.trim(); 
    let amount = Number(document.getElementById('expense-amount').value);
    let payMode = document.querySelector('input[name="payment-mode"]:checked').value;
    const submitBtn = document.getElementById('submit-expense-btn');
    submitBtn.innerText = "⏳ Adding..."; submitBtn.disabled = true;

    let analysis = await window.getSmartEmojiFromAI(itemValue);
    
    if (editExpenseId) {
        let exp = expenses.find(e => e.id === editExpenseId);
        exp.name = nameValue; exp.item = itemValue; exp.amount = amount; exp.mode = payMode; exp.category = analysis.category; exp.emojiIcon = analysis.emoji;
        editExpenseId = null; submitBtn.innerText = "Add Kharcha";
    } else {
        expenses.push({ id: Date.now(), name: nameValue, item: itemValue, amount: amount, mode: payMode, category: analysis.category, emojiIcon: analysis.emoji, time: new Date().toLocaleDateString('en-IN') + " | " + new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}), searchDate: new Date().toISOString().split('T')[0]});
    }
    document.getElementById('expense-name').value=''; document.getElementById('expense-item').value=''; document.getElementById('expense-amount').value = '';
    submitBtn.innerText = "Add Kharcha"; submitBtn.disabled = false;
    window.saveUserData(); window.updateDashboard(); window.showData();
};

window.quickAdd = async function(loc, item, amt, payMode) {
    triggerVibration(); const now = new Date(); let analysis = window.getOfflineEmoji(item);
    expenses.push({ id: Date.now(), name: loc, item: item, amount: amt, category: analysis.category, emojiIcon: analysis.emoji, mode: payMode, time: new Date().toLocaleDateString('en-IN') + " | " + new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}), searchDate: new Date().toISOString().split('T')[0] });
    window.saveUserData(); window.updateDashboard(); window.showData();
}

// ==========================================
// 📅 CALENDAR LOGIC
// ==========================================
window.renderCalendar = function() {
    const container = document.getElementById('calendar-container'); container.innerHTML = '';
    const now = new Date(); const month = now.getMonth(); const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let grid = document.createElement('div'); grid.className = 'calendar-grid';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(d => { grid.innerHTML += `<div class="cal-day-name">${d}</div>`; });

    for(let i = 1; i <= daysInMonth; i++) {
        let dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let hasExp = expenses.some(e => e.searchDate === dateStr);
        let isToday = (i === now.getDate());
        grid.innerHTML += `<div class="cal-date ${isToday ? 'cal-today' : ''} ${hasExp ? 'has-expense' : ''}" onclick="showDayDetails('${dateStr}')">${i}</div>`;
    }
    container.appendChild(grid);
}

window.showDayDetails = function(dateStr) {
    const list = document.getElementById('day-expense-list');
    document.getElementById('selected-date-label').innerText = "Hisaab: " + dateStr;
    list.innerHTML = '';
    let dayExp = expenses.filter(e => e.searchDate === dateStr);
    if(dayExp.length === 0) { list.innerHTML = '<p style="font-size:12px; color:var(--text-soft);">Koi kharcha nahi hai.</p>'; return; }
    dayExp.forEach(e => {
        let li = document.createElement('li');
        li.innerHTML = `<div class="ledger-info"><div class="emoji-box">${e.emojiIcon||'🛍️'}</div><div class="details"><h4>${e.item}</h4><p>${e.name}</p></div></div><div class="ledger-amt"><h4 class="amt-exp">- ₹${e.amount}</h4></div>`;
        list.appendChild(li);
    });
};

// ==========================================
// 🤖 AI & HARDWARE
// ==========================================
window.handleBillScan = async function(event) {
    const file = event.target.files[0]; if(!file) return; triggerVibration();
    const btn = document.getElementById('submit-expense-btn'); btn.innerText = "⏳ Scanning..."; btn.disabled = true;
    try {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = async function () {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [ { text: "Extract item name and amount from receipt. Return valid JSON only: {\"item\": \"Name\", \"amount\": 150}" }, { inline_data: { mime_type: file.type, data: reader.result.split(',')[1] } } ] }] }) });
            const data = await res.json(); let result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim());
            if(result.amount) document.getElementById('expense-amount').value = result.amount; if(result.item) document.getElementById('expense-item').value = result.item;
            btn.innerText = "Add Kharcha"; btn.disabled = false;
        };
    } catch(err) { alert("❌ Scan failed."); btn.innerText = "Add Kharcha"; btn.disabled = false; }
}

window.askAIAdvisor = async function() {
    triggerVibration(); window.openModal('ai-modal'); document.getElementById('ai-response-text').innerText = "Analyzing data... ⏳";
    let exp = expenses.reduce((s, e) => s + e.amount, 0); let inc = incomes.reduce((s, e) => s + e.amount, 0);
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Income: ₹${inc}, Expense: ₹${exp}. Give 2 lines of smart financial advice in Hinglish.` }] }] }) });
        const data = await res.json(); document.getElementById('ai-response-text').innerText = data.candidates[0].content.parts[0].text;
    } catch(err) { document.getElementById('ai-response-text').innerText = "AI Server down hai. Padhai par focus karo!"; }
}

window.startVoiceRecognition = function() {
    triggerVibration(); const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SpeechRecognition) return alert("Chrome use karein.");
    const recognition = new SpeechRecognition(); recognition.lang = 'hi-IN'; try { recognition.start(); } catch(e) { return; }
    document.getElementById('mic-btn').classList.add('listening'); document.getElementById('expense-item').placeholder = "🎤 Boliye...";
    recognition.onresult = function(event) {
        let transcript = event.results[0][0].transcript; let numMatch = transcript.match(/\d+/);
        if(numMatch) { document.getElementById('expense-amount').value = numMatch[0]; document.getElementById('expense-item').value = transcript.replace(numMatch[0], '').replace(/(rupaye|rs|ka|ki|ke|me|mein)/gi, '').trim(); } else { document.getElementById('expense-item').value = transcript; }
        document.getElementById('mic-btn').classList.remove('listening');
    };
    recognition.onerror = function() { document.getElementById('mic-btn').classList.remove('listening'); };
}

// ==========================================
// 💾 DATA SYNC, LOAD & SAVE
// ==========================================
window.loadUserData = async function() {
    if (USE_BACKEND) {
        try {
            const data = await apiRequest(`/api/expenses?email=${encodeURIComponent(currentUserEmail)}`);
            expenses = data.expenses || []; incomes = data.incomes || []; khataBook = safeGetJSON('khataDB_' + currentUserEmail, []); window.updateDashboard(); window.showData();
        } catch(err) { expenses = safeGetJSON('expensesDB_' + currentUserEmail, []); incomes = safeGetJSON('incomeHistoryDB_' + currentUserEmail, []); khataBook = safeGetJSON('khataDB_' + currentUserEmail, []); window.updateDashboard(); window.showData(); }
    } else { expenses = safeGetJSON('expensesDB_' + currentUserEmail, []); incomes = safeGetJSON('incomeHistoryDB_' + currentUserEmail, []); khataBook = safeGetJSON('khataDB_' + currentUserEmail, []); window.updateDashboard(); window.showData(); }
}

window.saveUserData = function() {
    if (USE_BACKEND) { apiRequest('/api/expenses', { method: 'POST', body: JSON.stringify({ email: currentUserEmail, expenses, incomes }) }).catch(e => console.log('Sync err')); }
    localStorage.setItem('expensesDB_' + currentUserEmail, JSON.stringify(expenses)); localStorage.setItem('incomeHistoryDB_' + currentUserEmail, JSON.stringify(incomes)); localStorage.setItem('khataDB_' + currentUserEmail, JSON.stringify(khataBook));
}

window.submitIncome = function() {
    let source = document.getElementById('income-source').value.trim(); let amt = Number(document.getElementById('income-amount').value);
    if(source && amt > 0) { incomes.push({ id: Date.now(), source: source, amount: amt, time: new Date().toLocaleDateString('en-IN'), searchDate: new Date().toISOString().split('T')[0] }); window.saveUserData(); window.updateDashboard(); window.showData(); window.closeModal('income-modal'); }
}

window.addKhata = function(type) {
    triggerVibration(); let person = document.getElementById('khata-person').value.trim(); let amt = Number(document.getElementById('khata-amount').value);
    if(person && amt > 0) { khataBook.push({ id: Date.now(), person: person, amount: amt, type: type, time: new Date().toLocaleDateString('en-IN') }); document.getElementById('khata-person').value = ''; document.getElementById('khata-amount').value = ''; window.saveUserData(); window.updateDashboard(); window.showData(); } 
}

window.setDashFilter = function(f, btn) { currentDashFilter = f; document.querySelectorAll('.filter-pill').forEach(c => c.classList.remove('active')); btn.classList.add('active'); window.updateDashboard(); }

window.updateDashboard = function() {
    let filteredExp = expenses;
    const now = new Date(); const today = now.toISOString().split('T')[0];
    if (currentDashFilter === 'today') filteredExp = expenses.filter(e => e.searchDate === today);
    else if (currentDashFilter === 'month') filteredExp = expenses.filter(e => e.searchDate.startsWith(today.substring(0, 7)));
    else if (currentDashFilter === 'year') filteredExp = expenses.filter(e => e.searchDate.startsWith(now.getFullYear().toString()));

    let filteredKharcha = filteredExp.reduce((sum, e) => sum + e.amount, 0);
    let totalAsliIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    let balance = totalAsliIncome - filteredKharcha;

    document.getElementById('display-income').innerText = '₹' + totalAsliIncome;
    document.getElementById('display-expense').innerText = '₹' + filteredKharcha;
    document.getElementById('display-balance').innerText = '₹' + balance;

    const budgetFill = document.getElementById('budget-progress');
    if(totalAsliIncome > 0) {
        let percent = (filteredKharcha / totalAsliIncome) * 100;
        if(budgetFill) budgetFill.style.width = (percent > 100 ? 100 : percent) + '%';
        if (balance < 0 && budgetFill) budgetFill.style.background = '#e74c3c'; 
    } else if(budgetFill) { budgetFill.style.width = '0%'; }

    if(document.getElementById('khata-give')) document.getElementById('khata-give').innerText = '₹' + khataBook.filter(k => k.type === 'took').reduce((s,k) => s+k.amount, 0);
    if(document.getElementById('khata-get')) document.getElementById('khata-get').innerText = '₹' + khataBook.filter(k => k.type === 'gave').reduce((s,k) => s+k.amount, 0);

    const chartBox = document.getElementById('chart-box');
    if (typeof Chart !== 'undefined' && document.getElementById('expenseChart')) {
        if(filteredExp.length === 0) { if(chartBox) chartBox.style.display = 'none'; } 
        else {
            if(chartBox) chartBox.style.display = 'block';
            let cats = { Food: 0, Travel: 0, Shopping: 0, Bills: 0, Other: 0 };
            filteredExp.forEach(e => { if(cats[e.category] !== undefined) cats[e.category] += e.amount; else cats.Other += e.amount; });
            const dataValues = [cats.Food, cats.Travel, cats.Shopping, cats.Bills, cats.Other];
            if (expenseChartInstance) expenseChartInstance.destroy(); 
            expenseChartInstance = new Chart(document.getElementById('expenseChart'), { type: 'doughnut', data: { labels: ['Food', 'Travel', 'Shop', 'Bills', 'Other'], datasets: [{ data: dataValues.every(v=>v===0)? [1]:dataValues, backgroundColor: dataValues.every(v=>v===0) ? ['#e0e0e0'] : ['#f39c12', '#3498db', '#9b59b6', '#e74c3c', '#2ecc71'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' } });
        }
    }
}

window.showData = function() {
    const expenseList = document.getElementById('expense-list'); const khataList = document.getElementById('khata-list');
    if(expenseList) expenseList.innerHTML = ''; if(khataList) khataList.innerHTML = '';
    let filterItem = document.getElementById('search-item') ? document.getElementById('search-item').value.toLowerCase().trim() : '';

    if(currentHistoryTab === 'expense') {
        [...expenses].reverse().filter(e => !filterItem || (e.item+" "+e.name).toLowerCase().includes(filterItem)).forEach(e => {
            let modeBadge = e.mode ? (e.mode === 'Cash' ? '💵 Cash' : '📱 Online') : '';
            let li = document.createElement('li');
            li.innerHTML = `<div class="ledger-info"><div class="emoji-box">${e.emojiIcon || '🛍️'}</div><div class="details"><h4>${e.item} <small style="font-weight:normal; color:var(--text-soft)">(${e.name})</small></h4><p>${e.time} • <span class="mode-tag">${modeBadge}</span></p></div></div><div class="ledger-amt"><h4 class="amt-exp">- ₹${e.amount}</h4><div class="ledger-actions"><button class="act-btn" onclick="editRecord(${e.id})">✏️</button><button class="act-btn" onclick="deleteRecord(${e.id}, 'expense')">🗑️</button></div></div>`;
            if(expenseList) expenseList.appendChild(li);
        });
    } else {
        [...incomes].reverse().forEach(inc => {
            let li = document.createElement('li'); li.className = 'inc-item';
            li.innerHTML = `<div class="ledger-info"><div class="emoji-box">🏦</div><div class="details"><h4>${inc.source}</h4><p>${inc.time}</p></div></div><div class="ledger-amt"><h4 class="amt-inc">+ ₹${inc.amount}</h4><button class="act-btn" onclick="deleteRecord(${inc.id}, 'income')">🗑️</button></div>`;
            if(expenseList) expenseList.appendChild(li);
        });
    }

    if(khataList) {
        [...khataBook].reverse().forEach(k => {
            let isGave = k.type === 'gave'; let li = document.createElement('li'); li.className = isGave ? 'khata-gave' : '';
            li.innerHTML = `<div class="ledger-info"><div class="emoji-box" style="background:transparent; font-size:24px;">${isGave ? '⬆️' : '⬇️'}</div><div class="details"><h4>${k.person}</h4><p>${k.time}</p></div></div><div class="ledger-amt"><h4 class="${isGave ? 'amt-inc' : 'amt-give'}">${isGave ? '+' : '-'} ₹${k.amount}</h4><div class="ledger-actions"><button class="act-btn" onclick="deleteRecord(${k.id}, 'khata')">✅</button></div></div>`;
            if(khataList) khataList.appendChild(li);
        });
    }
}

window.deleteRecord = function(id, type='expense') { if (confirm("Delete karein?")) { triggerVibration(); if(type === 'expense') { expenses = expenses.filter(e => e.id !== id); } else if(type === 'income') incomes = incomes.filter(i => i.id !== id); else khataBook = khataBook.filter(k => k.id !== id); window.saveUserData(); window.updateDashboard(); window.showData(); } }
window.editRecord = function(id) { let exp = expenses.find(e => e.id === id); if (exp) { document.getElementById('expense-name').value = exp.name || ''; document.getElementById('expense-item').value = exp.item || ''; document.getElementById('expense-amount').value = exp.amount; if(exp.mode === 'Cash' && document.getElementById('mode-cash')) document.getElementById('mode-cash').checked = true; editExpenseId = id; document.getElementById('submit-expense-btn').innerText = "Update Expense"; window.switchPage('home'); window.scrollTo(0,0); } }
window.clearAllData = function() { if (confirm("Pura Data Delete karein?")) { expenses = []; incomes = []; khataBook = []; window.saveUserData(); window.loadUserData(); } }

window.exportToExcel = function() { triggerVibration(); let csvContent = "data:text/csv;charset=utf-8,Type,Date,Location,Item,Mode,Amount\n"; incomes.forEach(i => csvContent += `Income,${i.time},N/A,${i.source},N/A,${i.amount}\n`); expenses.forEach(e => csvContent += `Expense,${e.time},${e.name},${e.item},${e.mode},${e.amount}\n`); khataBook.forEach(k => csvContent += `Udhaar,${k.time},N/A,${k.person},N/A,${k.amount}\n`); const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Hisaab_Report.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
window.backupData = function() { let dump = {}; for (let i = 0; i < localStorage.length; i++) dump[localStorage.key(i)] = localStorage.getItem(localStorage.key(i)); let blob = new Blob([JSON.stringify(dump)], {type: "application/json"}); let link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "Backup.json"; link.click(); };
window.restoreData = function() { let fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'application/json'; fileInput.onchange = e => { let reader = new FileReader(); reader.onload = function(event) { try { let data = JSON.parse(event.target.result); for (let key in data) localStorage.setItem(key, data[key]); alert("Data Restore ho gaya!"); location.reload(); } catch(err) { alert("Galat file format!"); } }; reader.readAsText(e.target.files[0]); }; fileInput.click(); };
window.toggleDarkMode = function() { const isDark = document.body.classList.toggle('dark-mode'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); window.updateDashboard(); }
window.setSavingsGoal = function() { let name = prompt("Target ka naam? (e.g. Laptop):", savingsGoal.name); if(name) { let amt = prompt("Kitne paise chahiye? (e.g. 50000):", savingsGoal.target); if(amt && !isNaN(amt) && Number(amt) > 0) { savingsGoal = { name: name, target: Number(amt) }; localStorage.setItem('savingsGoal_' + currentUserEmail, JSON.stringify(savingsGoal)); window.updateDashboard(); alert("✅ Goal set!"); } } }
function googleTranslateElementInit() { new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element'); }