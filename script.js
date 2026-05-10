// ==========================================
// 👑 GLOBAL CONFIG & BACKEND SETUP
// ==========================================
const SEED_EMAIL = "sandeep@gmail.com";
const SEED_PASS  = "12345";

// 🔐 API keys are injected by server.js from .env — never hardcoded here
const _cfg          = window.__APP_CONFIG__ || {};
const GEMINI_API_KEY  = _cfg.GEMINI_KEYS?.[0] || '';   // single key (used by older calls)
const GEMINI_API_KEYS = _cfg.GEMINI_KEYS    || [];     // full array for i18n rotation
const GROQ_API_KEY    = _cfg.GROQ_KEY       || '';


// ── Language Change Handler (called by both lang selectors) ──
window.handleLangChange = async function(lang) {
    const s1 = document.getElementById('lang-selector');
    const s2 = document.getElementById('lang-selector-auth');
    if (s1) s1.value = lang;
    if (s2) s2.value = lang;
    await window.i18n.loadLanguage(lang, true);
    // Re-render dynamic lists after language change
    if (typeof window.updateDashboard === 'function') window.updateDashboard();
    if (typeof window.showData === 'function') window.showData();
};

// 🔴 YOUR DATABASE IS 100% CONNECTED 🔴
const USE_BACKEND = true; 
const API_BASE = USE_BACKEND ? 'https://expense-tracker-zzmv.onrender.com' : '';
// IMPORTANT: API_KEY must be injected via server config, never hardcoded in frontend
const API_KEY = window.__APP_CONFIG__?.API_KEY || 'development-fallback-key';

let usersDB = []; let currentUserEmail = null;
let expenses = []; let incomes = []; let khataBook = []; 
let savingsGoal = { name: 'Dream', target: 50000 };
let currentDashFilter = 'all'; let currentHistoryTab = 'expense'; let editExpenseId = null; let isLoginMode = true;
let expenseChartInstance = null;

function triggerVibration() { if (navigator.vibrate) navigator.vibrate(40); }
function safeGetJSON(key, defaultVal) { try { return JSON.parse(localStorage.getItem(key)) || defaultVal; } catch(e) { return defaultVal; } }

// 🌐 SAFE API CALLS WITH 20 SECONDS TIMEOUT
async function apiRequest(endpoint, options = {}) {
    const url = API_BASE ? `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(API_KEY)}` : endpoint;
    const headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...options.headers };
    const controller = new AbortController();
    const timeoutMs = 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(errorText || `API Error ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. Server may be sleeping.');
        }
        throw err;
    }
}

async function fetchWithTimeout(url, options = {}, timeout = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
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
window.openUdhaarModal = function(type) {
    document.getElementById('udhaar-type').value = type;
    document.getElementById('udhaar-modal-title').innerText = type === 'gave' ? window.i18n.t('udhaar_gave_title','Maine Diya') : window.i18n.t('udhaar_took_title','Maine Liya');
    window.openModal('udhaar-modal');
};
window.openTranslator = function() { window.openModal('translator-modal'); };
window.translateText = async function() {
    const input = document.getElementById('translate-input').value.trim();
    const lang = document.getElementById('translate-lang').value;
    const output = document.getElementById('translate-output');
    if (!input) { alert('Please enter text to translate'); return; }
    output.value = 'Translating...';
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Translate the following text to ${lang}: "${input}"` }] }]
            })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            output.value = data.candidates[0].content.parts[0].text;
        } else {
            output.value = 'Translation failed. Try again.';
        }
    } catch (error) {
        output.value = 'Error: ' + error.message;
    }
};
window.submitUdhaar = function() { const type = document.getElementById('udhaar-type').value; const person = document.getElementById('udhaar-person').value.trim(); const amt = Number(document.getElementById('udhaar-amount').value);
    if(person && amt > 0) { khataBook.push({ id: Date.now(), person, amount: amt, type, time: new Date().toLocaleDateString('en-IN') }); document.getElementById('udhaar-person').value = ''; document.getElementById('udhaar-amount').value = ''; window.saveUserData(); window.updateDashboard(); window.showData(); window.closeModal('udhaar-modal'); } else { alert('Please fill name and amount'); } };

window.switchHistoryTab = function(mode) {
    triggerVibration(); currentHistoryTab = mode;
    document.getElementById('tab-exp').classList.remove('active'); document.getElementById('tab-inc').classList.remove('active');
    if(mode === 'expense') document.getElementById('tab-exp').classList.add('active'); else document.getElementById('tab-inc').classList.add('active');
    window.showData();
};

window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').setAttribute('data-i18n', isLoginMode ? 'auth_title_login' : 'auth_title_signup');
    document.getElementById('auth-title').innerText = isLoginMode ? window.i18n.t('auth_title_login') : window.i18n.t('auth_title_signup');
    document.getElementById('auth-btn').setAttribute('data-i18n', isLoginMode ? 'auth_btn_login' : 'auth_btn_signup');
    document.getElementById('auth-btn').innerText = isLoginMode ? window.i18n.t('auth_btn_login') : window.i18n.t('auth_btn_signup');
    document.getElementById('switch-to-signup').setAttribute('data-i18n', isLoginMode ? 'auth_switch_signup_link' : 'auth_switch_login_link');
    document.getElementById('switch-to-signup').innerText = isLoginMode ? window.i18n.t('auth_switch_signup_link') : window.i18n.t('auth_switch_login_link');
};

// ==========================================
// 🔒 LOGIN & DOM LOAD (DEEP ERROR FIX)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // 🌐 Boot i18n — pass all Gemini keys + Groq key for maximum reliability
    await window.i18n.init(GEMINI_API_KEYS, GROQ_API_KEY);
    // Sync selectors to saved language
    const savedLang = localStorage.getItem('apnaHisaab_lang') || 'en';
    const s1 = document.getElementById('lang-selector');
    const s2 = document.getElementById('lang-selector-auth');
    if (s1) s1.value = savedLang;
    if (s2) s2.value = savedLang;
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
                        let user = usersDB.find(u => u.email === email && u.password === password);
                        if (user) {
                            alert('Server unavailable. Logged in from local saved account.');
                            window.loginUser(email);
                        } else {
                            throw new Error(err.message || "Login failed. Server may be sleeping.");
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
                        if (!usersDB.find(u => u.email === email)) {
                            usersDB.push({ email, password });
                            localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
                        }
                        window.loginUser(email);
                    } catch(err) {
                        if (usersDB.find(u => u.email === email)) {
                            throw new Error("Email pehle se hai!");
                        }
                        usersDB.push({ email, password });
                        localStorage.setItem('expenseAppUsers', JSON.stringify(usersDB));
                        alert("Server unavailable. Account created locally.");
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
        if(document.getElementById('udhaar-person')) new SimpleTypewriter('udhaar-person', ['e.g. Rahul', 'e.g. Dukan wala']);
    }, 500);
});

window.loginUser = function(email) {
    localStorage.setItem('currentUserEmail', email);
    currentUserEmail = email;
    window.showAppScreen();
    // 👋 Show AI-powered welcome message
    setTimeout(() => { if (typeof window.showWelcomeMessage === 'function') window.showWelcomeMessage(email); }, 800);
};
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
        const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Analyze item: "${itemName}". Reply with 2 things separated by pipe (|): 1. Single Emoji. 2. Category (Food, Travel, Shopping, Bills, Health, Education, Entertainment, Other). Example: 🍔|Food` }] }] }) }, 20000);
        if (!response.ok) throw new Error('AI API Error');
        const data = await response.json(); let parts = data.candidates[0].content.parts[0].text.trim().split('|');
        if(parts.length >= 2) return { emoji: parts[0].trim(), category: parts[1].trim() };
        return window.getOfflineEmoji(itemName);
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
    let categoryValue = document.getElementById('expense-category').value;
    let payMode = document.querySelector('input[name="payment-mode"]:checked').value;
    const submitBtn = document.getElementById('submit-expense-btn');
    submitBtn.innerText = window.i18n.t('form_adding', '⏳ Adding...'); submitBtn.disabled = true;

    let analysis = await window.getSmartEmojiFromAI(itemValue);
    let selectedCategory = categoryValue || analysis.category || 'Other';
    let emojiIcon = analysis.emoji || window.getOfflineEmoji(itemValue).emoji;

    if (editExpenseId) {
        let exp = expenses.find(e => e.id === editExpenseId);
        if (exp) {
            exp.name = nameValue;
            exp.item = itemValue;
            exp.amount = amount;
            exp.mode = payMode;
            exp.category = selectedCategory;
            exp.emojiIcon = emojiIcon;
        }
        editExpenseId = null;
        submitBtn.innerText = window.i18n.t('form_submit_btn', 'Add Kharcha');
    } else {
        expenses.push({
            id: Date.now(),
            name: nameValue,
            item: itemValue,
            amount: amount,
            mode: payMode,
            category: selectedCategory,
            emojiIcon: emojiIcon,
            time: new Date().toLocaleDateString('en-IN') + " | " + new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}),
            searchDate: new Date().toISOString().split('T')[0]
        });
    }

    document.getElementById('expense-name').value = '';
    document.getElementById('expense-item').value = '';
    document.getElementById('expense-category').value = '';
    document.getElementById('expense-amount').value = '';
    submitBtn.innerText = window.i18n.t('form_submit_btn', 'Add Kharcha');
    submitBtn.disabled = false;
    window.saveUserData();
    window.updateDashboard();
    window.showData();
    window.renderCalendar();
};

window.quickAdd = async function(loc, item, amt, payMode) {
    triggerVibration(); const now = new Date(); let analysis = window.getOfflineEmoji(item);
    expenses.push({
        id: Date.now(),
        name: loc,
        item: item,
        amount: amt,
        category: analysis.category,
        emojiIcon: analysis.emoji,
        mode: payMode,
        time: new Date().toLocaleDateString('en-IN') + " | " + new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}),
        searchDate: new Date().toISOString().split('T')[0]
    });
    window.saveUserData(); window.updateDashboard(); window.showData(); window.renderCalendar();
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
    if (dayExp.length === 0) {
        list.innerHTML = `<p style="font-size:12px; color:var(--text-soft);">${window.i18n.t('calendar_no_expense', 'Koi kharcha nahi hai.')}</p>`;
        return;
    }
    dayExp.forEach(e => {
        let modeBadge = e.mode ? (e.mode === 'Cash' ? window.i18n.t('mode_cash','💵 Cash') : window.i18n.t('mode_online','📱 Online')) : '';
        let categoryBadge = e.category ? `<span class="mode-tag">${e.category}</span>` : '';
        let li = document.createElement('li');
        li.innerHTML = `
            <div class="ledger-info">
                <div class="emoji-box">${e.emojiIcon || '🛍️'}</div>
                <div class="details">
                    <h4>${e.item} <small style="font-weight:normal; color:var(--text-soft)">(${e.name})</small></h4>
                    <p>${e.time} • ${categoryBadge} <span class="mode-tag">${modeBadge}</span></p>
                </div>
            </div>
            <div class="ledger-amt"><h4 class="amt-exp">- ₹${e.amount}</h4></div>
        `;
        list.appendChild(li);
    });
};

// ==========================================
// 🤖 AI & HARDWARE
// ==========================================
window.handleBillScan = async function(event) {
    const file = event.target.files[0]; if(!file) return; triggerVibration();
    const btn = document.getElementById('submit-expense-btn'); btn.innerText = "⏳ Scanning..."; btn.disabled = true;
    if (!GEMINI_API_KEY) {
        alert('Bill scanning requires AI key. Please enter details manually.');
        btn.innerText = "Add Kharcha"; btn.disabled = false;
        return;
    }
    const reader = new FileReader();
    reader.onload = async function () {
        try {
            const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [ { text: "Extract item name and amount from receipt. Return valid JSON only: {\"item\": \"Name\", \"amount\": 150}" }, { inline_data: { mime_type: file.type, data: reader.result.split(',')[1] } } ] }] }) }, 20000);
            if (!res.ok) throw new Error('Scan API failed');
            const data = await res.json(); let result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim());
            if(result.amount) document.getElementById('expense-amount').value = result.amount;
            if(result.item) document.getElementById('expense-item').value = result.item;
        } catch(err) {
            console.warn('Bill scan fallback:', err);
            alert("❌ Scan failed. Please enter manually.");
        } finally {
            btn.innerText = "Add Kharcha"; btn.disabled = false;
        }
    };
    reader.onerror = function() { btn.innerText = "Add Kharcha"; btn.disabled = false; alert('File read failed.'); };
    reader.readAsDataURL(file);
}

window.askAIAdvisor = async function() {
    triggerVibration(); window.openModal('ai-modal'); document.getElementById('ai-response-text').innerText = window.i18n.t('ai_modal_loading', 'Data analyze ho raha hai...');
    let exp = expenses.reduce((s, e) => s + e.amount, 0); let inc = incomes.reduce((s, e) => s + e.amount, 0);
    if (!GEMINI_API_KEY) {
        document.getElementById('ai-response-text').innerText = window.i18n.t('ai_no_key');
        return;
    }
    try {
        const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Income: ₹${inc}, Expense: ₹${exp}. Give 2 lines of smart financial advice in Hinglish.` }] }] }) }, 20000);
        if (!res.ok) throw new Error('AI Advice timeout');
        const data = await res.json(); document.getElementById('ai-response-text').innerText = data.candidates[0].content.parts[0].text;
    } catch(err) { document.getElementById('ai-response-text').innerText = window.i18n.t('ai_server_down'); }
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
            expenses = data.expenses || [];
            incomes = data.incomes || [];
            khataBook = data.khataBook || safeGetJSON('khataDB_' + currentUserEmail, []);
            localStorage.setItem('expensesDB_' + currentUserEmail, JSON.stringify(expenses));
            localStorage.setItem('incomeHistoryDB_' + currentUserEmail, JSON.stringify(incomes));
            localStorage.setItem('khataDB_' + currentUserEmail, JSON.stringify(khataBook));
            window.updateDashboard(); window.showData();
        } catch(err) {
            expenses = safeGetJSON('expensesDB_' + currentUserEmail, []);
            incomes = safeGetJSON('incomeHistoryDB_' + currentUserEmail, []);
            khataBook = safeGetJSON('khataDB_' + currentUserEmail, []);
            window.updateDashboard(); window.showData();
        }
    } else {
        expenses = safeGetJSON('expensesDB_' + currentUserEmail, []);
        incomes = safeGetJSON('incomeHistoryDB_' + currentUserEmail, []);
        khataBook = safeGetJSON('khataDB_' + currentUserEmail, []);
        window.updateDashboard(); window.showData();
    }
}

window.saveUserData = function() {
    if (USE_BACKEND) { apiRequest('/api/expenses', { method: 'POST', body: JSON.stringify({ email: currentUserEmail, expenses, incomes, khata: khataBook }) }).catch(e => console.log('Sync err')); }
    localStorage.setItem('expensesDB_' + currentUserEmail, JSON.stringify(expenses)); localStorage.setItem('incomeHistoryDB_' + currentUserEmail, JSON.stringify(incomes)); localStorage.setItem('khataDB_' + currentUserEmail, JSON.stringify(khataBook));
}

window.submitIncome = function() {
    let source = document.getElementById('income-source').value.trim(); let amt = Number(document.getElementById('income-amount').value);
    if(source && amt > 0) { incomes.push({ id: Date.now(), source: source, amount: amt, time: new Date().toLocaleDateString('en-IN'), searchDate: new Date().toISOString().split('T')[0] }); window.saveUserData(); window.updateDashboard(); window.showData(); window.closeModal('income-modal'); }
}

window.addKhata = function(type) {
    triggerVibration(); let person = document.getElementById('udhaar-person') ? document.getElementById('udhaar-person').value.trim() : '';
    let amt = document.getElementById('udhaar-amount') ? Number(document.getElementById('udhaar-amount').value) : 0;
    if(person && amt > 0) { khataBook.push({ id: Date.now(), person, amount: amt, type: type, time: new Date().toLocaleDateString('en-IN') }); if(document.getElementById('udhaar-person')) document.getElementById('udhaar-person').value = ''; if(document.getElementById('udhaar-amount')) document.getElementById('udhaar-amount').value = ''; window.saveUserData(); window.updateDashboard(); window.showData(); } 
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
            let modeBadge = e.mode ? (e.mode === 'Cash' ? window.i18n.t('mode_cash','💵 Cash') : window.i18n.t('mode_online','📱 Online')) : '';
            let categoryBadge = e.category ? `<span class="mode-tag">${e.category}</span>` : '';
            let li = document.createElement('li');
            li.innerHTML = `<div class="ledger-info"><div class="emoji-box">${e.emojiIcon || '🛍️'}</div><div class="details" onclick="openHistoryDetail(${e.id}, 'expense')" style="cursor:pointer;"><h4>${e.item} <small style="font-weight:normal; color:var(--text-soft)">(${e.name})</small></h4><p>${e.time} • ${categoryBadge} <span class="mode-tag">${modeBadge}</span></p></div></div><div class="ledger-amt"><h4 class="amt-exp">- ₹${e.amount}</h4><div class="ledger-actions"><button class="act-btn" onclick="editRecord(${e.id})">✏️</button><button class="act-btn" onclick="deleteRecord(${e.id}, 'expense')">🗑️</button></div></div>`;
            if(expenseList) expenseList.appendChild(li);
        });
    } else {
        [...incomes].reverse().forEach(inc => {
            let li = document.createElement('li'); li.className = 'inc-item';
            li.innerHTML = `<div class="ledger-info"><div class="emoji-box">🏦</div><div class="details" onclick="openHistoryDetail(${inc.id}, 'income')" style="cursor:pointer;"><h4>${inc.source}</h4><p>${inc.time}</p></div></div><div class="ledger-amt"><h4 class="amt-inc">+ ₹${inc.amount}</h4><button class="act-btn" onclick="deleteRecord(${inc.id}, 'income')">🗑️</button></div>`;
            if(expenseList) expenseList.appendChild(li);
        });
    }

    if(khataList) {
        [...khataBook].reverse().forEach(k => {
            let isGave = k.type === 'gave'; let li = document.createElement('li'); li.className = isGave ? 'khata-gave' : '';
            li.innerHTML = `<div class="ledger-info"><div class="emoji-box" style="background:transparent; font-size:24px;">${isGave ? '⬆️' : '⬇️'}</div><div class="details" onclick="openKhataDetail(${k.id})" style="cursor:pointer;"><h4>${k.person}</h4><p>${k.time}</p></div></div><div class="ledger-amt"><h4 class="${isGave ? 'amt-inc' : 'amt-give'}">${isGave ? '+' : '-'} ₹${k.amount}</h4><div class="ledger-actions"><button class="act-btn" onclick="deleteRecord(${k.id}, 'khata')">✅</button></div></div>`;
            if(khataList) khataList.appendChild(li);
        });
    }
}

window.openKhataDetail = function(id) {
    const record = khataBook.find(k => k.id === id);
    if (!record) return;
    const title = record.type === 'gave' ? window.i18n.t('udhaar_gave_title') : window.i18n.t('udhaar_took_title');
    document.getElementById('khata-detail-title').innerText = title;
    document.getElementById('khata-detail-person').innerText = record.person;
    document.getElementById('khata-detail-type').innerText = record.type === 'gave' ? window.i18n.t('udhaar_gave_title') : window.i18n.t('udhaar_took_title');
    document.getElementById('khata-detail-amount').innerText = `₹${record.amount}`;
    document.getElementById('khata-detail-time').innerText = record.time;
    window.openModal('khata-detail-modal');
};

window.openHistoryDetail = function(id, type) {
    let record;
    if (type === 'expense') {
        record = expenses.find(e => e.id === id);
    } else {
        record = incomes.find(i => i.id === id);
    }
    if (!record) return;
    document.getElementById('history-detail-title').innerText = type === 'expense' ? window.i18n.t('history_detail_title_expense') : window.i18n.t('history_detail_title_income');
    document.getElementById('history-detail-what').innerText = type === 'expense' ? record.item : record.source;
    document.getElementById('history-detail-person').innerText = type === 'expense' ? record.name || 'Unknown' : '-';
    document.getElementById('history-detail-type').innerText = type === 'expense' ? record.category || '-' : 'Income';
    document.getElementById('history-detail-amount').innerText = `${type === 'expense' ? '- ₹' : '+ ₹'}${record.amount}`;
    document.getElementById('history-detail-time').innerText = record.time;
    document.getElementById('history-detail-mode').innerText = type === 'expense' ? (record.mode || '-') : '-';
    window.openModal('history-detail-modal');
};

window.deleteRecord = function(id, type='expense') { if (confirm(window.i18n.t('delete_confirm','Delete karein?'))) { triggerVibration(); if(type === 'expense') { expenses = expenses.filter(e => e.id !== id); } else if(type === 'income') incomes = incomes.filter(i => i.id !== id); else khataBook = khataBook.filter(k => k.id !== id); window.saveUserData(); window.updateDashboard(); window.showData(); } }
window.editRecord = function(id) { let exp = expenses.find(e => e.id === id); if (exp) { document.getElementById('expense-name').value = exp.name || ''; document.getElementById('expense-item').value = exp.item || ''; document.getElementById('expense-amount').value = exp.amount; if (document.getElementById('expense-category')) document.getElementById('expense-category').value = exp.category || ''; if(exp.mode === 'Cash' && document.getElementById('mode-cash')) document.getElementById('mode-cash').checked = true; editExpenseId = id; document.getElementById('submit-expense-btn').innerText = window.i18n.t('form_update_btn','Update Expense'); window.switchPage('home'); window.scrollTo(0,0); } }
window.clearAllData = function() { if (confirm(window.i18n.t('clear_confirm','Pura Data Delete karein?'))) { expenses = []; incomes = []; khataBook = []; window.saveUserData(); window.loadUserData(); } }

window.exportToExcel = function() { triggerVibration(); let csvContent = "data:text/csv;charset=utf-8,Type,Date,Location,Item,Mode,Amount\n"; incomes.forEach(i => csvContent += `Income,${i.time},N/A,${i.source},N/A,${i.amount}\n`); expenses.forEach(e => csvContent += `Expense,${e.time},${e.name},${e.item},${e.mode},${e.amount}\n`); khataBook.forEach(k => csvContent += `Udhaar,${k.time},N/A,${k.person},N/A,${k.amount}\n`); const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Hisaab_Report.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
window.backupData = function() { let dump = {}; for (let i = 0; i < localStorage.length; i++) dump[localStorage.key(i)] = localStorage.getItem(localStorage.key(i)); let blob = new Blob([JSON.stringify(dump)], {type: "application/json"}); let link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "Backup.json"; link.click(); };
window.restoreData = function() { let fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'application/json'; fileInput.onchange = e => { let reader = new FileReader(); reader.onload = function(event) { try { let data = JSON.parse(event.target.result); for (let key in data) localStorage.setItem(key, data[key]); alert("Data Restore ho gaya!"); location.reload(); } catch(err) { alert("Galat file format!"); } }; reader.readAsText(e.target.files[0]); }; fileInput.click(); };
window.toggleDarkMode = function() { const isDark = document.body.classList.toggle('dark-mode'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); window.updateDashboard(); }
window.setSavingsGoal = function() { let name = prompt("Target ka naam? (e.g. Laptop):", savingsGoal.name); if(name) { let amt = prompt("Kitne paise chahiye? (e.g. 50000):", savingsGoal.target); if(amt && !isNaN(amt) && Number(amt) > 0) { savingsGoal = { name: name, target: Number(amt) }; localStorage.setItem('savingsGoal_' + currentUserEmail, JSON.stringify(savingsGoal)); window.updateDashboard(); alert("✅ Goal set!"); } } }
function googleTranslateElementInit() { new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element'); }