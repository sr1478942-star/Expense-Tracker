/**
 * ================================================================
 *  i18n.js — Apna Hisaab Translation Engine  v3.0
 *
 *  Priority chain:
 *    1. Static JSON file  (/lang/{code}.json)  → instant, no API
 *    2. localStorage cache (versioned)          → instant, no API
 *    3. Gemini AI  (rotates across 3 keys)      → cloud AI
 *    4. Groq AI    (llama-3.3-70b-versatile)    → fast fallback
 *    5. Hinglish   (en.json)                    → always works
 * ================================================================
 */
(function () {
    'use strict';

    // ── CONFIG ──────────────────────────────────────────────────
    const BASE_LANG        = 'en';
    const STORAGE_LANG_KEY = 'apnaHisaab_lang';
    const CACHE_VER        = 'v3';                    // bump to wipe old bad caches
    const CACHE_PREFIX     = `apnaHisaab_i18n_${CACHE_VER}_`;
    const GEMINI_MODEL     = 'gemini-1.5-flash';
    const GROQ_MODEL       = 'llama-3.3-70b-versatile';
    const GROQ_ENDPOINT    = 'https://api.groq.com/openai/v1/chat/completions';

    const SUPPORTED_LANGS = {
        en:      { name: 'Hinglish',  dir: 'ltr', flag: '🇮🇳', static: true  },
        hi:      { name: 'हिंदी',    dir: 'ltr', flag: '🇮🇳', static: true  },
        en_pure: { name: 'English',   dir: 'ltr', flag: '🌐',  static: false },
        pa:      { name: 'ਪੰਜਾਬੀ',   dir: 'ltr', flag: '🇮🇳', static: false },
        bn:      { name: 'বাংলা',    dir: 'ltr', flag: '🇧🇩', static: false },
        ta:      { name: 'தமிழ்',   dir: 'ltr', flag: '🇮🇳', static: false },
        gu:      { name: 'ગુજરાતી',  dir: 'ltr', flag: '🇮🇳', static: false },
        mr:      { name: 'मराठी',    dir: 'ltr', flag: '🇮🇳', static: false },
        ur:      { name: 'اردو',     dir: 'rtl', flag: '🇵🇰', static: false },
    };

    // ── STATE ───────────────────────────────────────────────────
    let _translations = {};
    let _currentLang  = BASE_LANG;
    let _baseStrings  = {};
    let _geminiKeys   = [];   // array of Gemini API keys to rotate
    let _groqKey      = null;

    // ── PUBLIC API ──────────────────────────────────────────────
    window.i18n = {

        /**
         * @param {string[]} geminiKeys - array of Gemini API keys
         * @param {string}   groqKey    - Groq API key
         */
        async init(geminiKeys, groqKey) {
            _geminiKeys = Array.isArray(geminiKeys)
                ? geminiKeys.filter(Boolean)
                : (geminiKeys ? [geminiKeys] : []);
            _groqKey = groqKey || null;

            // Clear stale caches from old i18n versions
            _clearOldCaches();

            await _loadBase();

            const saved = localStorage.getItem(STORAGE_LANG_KEY) || BASE_LANG;
            await window.i18n.loadLanguage(saved, false);
        },

        async loadLanguage(lang, showToast = true) {
            if (!SUPPORTED_LANGS[lang]) lang = BASE_LANG;

            // ── Base (Hinglish) — instant ───────────────────
            if (lang === BASE_LANG) {
                _translations = { ..._baseStrings };
                _currentLang  = BASE_LANG;
                _applyTranslations();
                _savePref(lang);
                if (showToast) _toast(_translations['translate_done'] || '✅ Language changed!', 2500);
                return;
            }

            // ── Static file — instant ───────────────────────
            try {
                const staticData = await _fetchStaticFile(lang);
                if (staticData && Object.keys(staticData).length > 5) {
                    _translations = { ..._baseStrings, ...staticData };
                    _currentLang  = lang;
                    _writeCache(lang, _translations);
                    _applyTranslations();
                    _savePref(lang);
                    if (showToast) _toast(_translations['translate_done'] || '✅ Language changed!', 2500);
                    return;
                }
            } catch (_) { /* no static file, continue */ }

            // ── localStorage cache — instant ────────────────
            const cached = _readCache(lang);
            if (cached && Object.keys(cached).length > 10) {
                _translations = cached;
                _currentLang  = lang;
                _applyTranslations();
                _savePref(lang);
                if (showToast) _toast(_translations['translate_done'] || '✅ Language changed!', 2500);
                return;
            }

            // ── Need AI translation — show overlay ──────────
            const langName = SUPPORTED_LANGS[lang]?.name || lang;
            _showOverlay(langName);

            const inputObj = _buildTranslationInput();

            // Try Gemini (rotate through all keys)
            let aiResult = null;
            for (let i = 0; i < _geminiKeys.length; i++) {
                try {
                    console.log(`[i18n] Trying Gemini key ${i + 1}/${_geminiKeys.length}...`);
                    aiResult = await _geminiTranslate(lang, _geminiKeys[i], inputObj);
                    if (aiResult) break;
                } catch (err) {
                    console.warn(`[i18n] Gemini key ${i + 1} failed:`, err.message);
                }
            }

            // If Gemini failed, try Groq
            if (!aiResult && _groqKey) {
                try {
                    console.log('[i18n] Gemini exhausted. Trying Groq...');
                    aiResult = await _groqTranslate(lang, inputObj);
                } catch (err) {
                    console.warn('[i18n] Groq also failed:', err.message);
                }
            }

            _hideOverlay();

            if (aiResult && Object.keys(aiResult).length > 10) {
                _translations = { ..._baseStrings, ...aiResult };
                _currentLang  = lang;
                _writeCache(lang, _translations);
                _applyTranslations();
                _savePref(lang);
                if (showToast) _toast(_translations['translate_done'] || '✅ Language changed!', 2500);
            } else {
                // All APIs failed — stay on Hinglish, reset selector
                console.error('[i18n] All translation providers failed. Falling back to Hinglish.');
                _toast('⚠️ Translation unavailable. Please try again.', 4000);
                _translations = { ..._baseStrings };
                _currentLang  = BASE_LANG;
                _applyTranslations();
                ['lang-selector', 'lang-selector-auth'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = BASE_LANG;
                });
            }
        },

        t(key, fallback) {
            return _translations[key] ?? _baseStrings[key] ?? fallback ?? key;
        },

        retranslate() { _applyTranslations(); },

        get lang()      { return _currentLang; },
        get supported() { return SUPPORTED_LANGS; },
    };

    // ── BUILD INPUT OBJECT ──────────────────────────────────────
    function _buildTranslationInput() {
        const obj = {};
        Object.entries(_baseStrings).forEach(([k, v]) => {
            if (!k.startsWith('_') && typeof v === 'string' && v.trim()) {
                obj[k] = v;
            }
        });
        return obj;
    }

    // ── BUILD PROMPT ────────────────────────────────────────────
    function _buildPrompt(lang, inputObj) {
        const langInfo = SUPPORTED_LANGS[lang] || {};
        const langName = lang === 'en_pure'
            ? 'standard English (no Hindi or Hinglish words)'
            : (langInfo.name || lang);
        const langCode = lang === 'en_pure' ? 'en' : lang;

        return `You are a professional UI/app translator.
Translate ONLY the VALUES of the JSON object below into ${langName} (language code: ${langCode}).
STRICT RULES:
- Keep ALL JSON keys exactly unchanged.
- Preserve emojis, ₹ symbol, numbers, and punctuation.
- Use natural, friendly tone suitable for a mobile expense tracker app.
- Return ONLY valid JSON — no markdown, no code fences, no explanation.

${JSON.stringify(inputObj)}`;
    }

    // ── GEMINI TRANSLATION ──────────────────────────────────────
    async function _geminiTranslate(lang, apiKey, inputObj) {
        if (!apiKey) throw new Error('No Gemini key');
        const prompt = _buildPrompt(lang, inputObj);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                })
            }
        );

        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

        const data = await res.json();
        let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        return JSON.parse(raw);
    }

    // ── GROQ TRANSLATION ────────────────────────────────────────
    async function _groqTranslate(lang, inputObj) {
        if (!_groqKey) throw new Error('No Groq key');
        const prompt = _buildPrompt(lang, inputObj);

        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${_groqKey}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional translator for mobile apps. Return ONLY valid JSON with translated values. No explanation, no markdown.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 8192
            })
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => res.status);
            throw new Error(`Groq HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        let raw = data?.choices?.[0]?.message?.content || '';
        raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        return JSON.parse(raw);
    }

    // ── LOAD BASE (en.json) ─────────────────────────────────────
    async function _loadBase() {
        try {
            const res = await fetch('/lang/en.json');
            if (!res.ok) throw new Error(`en.json HTTP ${res.status}`);
            _baseStrings  = await res.json();
            _translations = { ..._baseStrings };
        } catch (e) {
            console.error('[i18n] Failed to load en.json:', e.message);
        }
    }

    // ── FETCH STATIC JSON FILE ──────────────────────────────────
    async function _fetchStaticFile(lang) {
        const res = await fetch(`/lang/${lang}.json`);
        if (!res.ok) return null;
        const data = await res.json();
        return (data && typeof data === 'object') ? data : null;
    }

    // ── CACHE ───────────────────────────────────────────────────
    function _savePref(lang)   { localStorage.setItem(STORAGE_LANG_KEY, lang); }

    function _readCache(lang) {
        try {
            const raw = localStorage.getItem(CACHE_PREFIX + lang);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    function _writeCache(lang, data) {
        try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(data)); }
        catch (e) { console.warn('[i18n] Cache write failed (storage full?)'); }
    }

    /** Remove all old-version caches (v1, v2) */
    function _clearOldCaches() {
        const OLD_PREFIXES = ['apnaHisaab_i18n_cache_', 'apnaHisaab_i18n_v1_', 'apnaHisaab_i18n_v2_'];
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        keys.forEach(key => {
            if (OLD_PREFIXES.some(p => key && key.startsWith(p))) {
                localStorage.removeItem(key);
                console.log('[i18n] Cleared stale cache:', key);
            }
        });
    }

    // ── APPLY TRANSLATIONS TO DOM ───────────────────────────────
    function _applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = _translations[key] ?? _baseStrings[key];
            if (val !== undefined && val !== null) el.textContent = val;
        });

        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const val = _translations[key] ?? _baseStrings[key];
            if (val !== undefined) el.innerHTML = val;
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const val = _translations[key] ?? _baseStrings[key];
            if (val !== undefined) el.setAttribute('placeholder', val);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const val = _translations[key] ?? _baseStrings[key];
            if (val !== undefined) el.setAttribute('title', val);
        });

        document.querySelectorAll('option[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = _translations[key] ?? _baseStrings[key];
            if (val !== undefined) el.textContent = val;
        });

        // html[lang] + [dir]
        document.documentElement.lang = (_currentLang === 'en_pure') ? 'en' : _currentLang;
        document.documentElement.dir  = SUPPORTED_LANGS[_currentLang]?.dir || 'ltr';

        // Sync both selectors
        ['lang-selector', 'lang-selector-auth'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value !== _currentLang) el.value = _currentLang;
        });
    }

    // ── LOADING OVERLAY ─────────────────────────────────────────
    let _overlayEl = null;

    function _showOverlay(langName) {
        if (!_overlayEl) {
            _overlayEl = document.createElement('div');
            _overlayEl.id = 'i18n-loading-overlay';
            _overlayEl.innerHTML = `
                <div class="i18n-overlay-box">
                    <div class="i18n-spinner"></div>
                    <p id="i18n-overlay-msg">🌐 Translating...</p>
                    <small id="i18n-overlay-sub">Powered by AI</small>
                </div>`;
            document.body.appendChild(_overlayEl);
        }
        const msg = document.getElementById('i18n-overlay-msg');
        if (msg) msg.textContent = `🌐 Translating to ${langName}...`;
        _overlayEl.classList.add('i18n-overlay-visible');
    }

    function _hideOverlay() {
        if (_overlayEl) _overlayEl.classList.remove('i18n-overlay-visible');
    }

    // ── TOAST ───────────────────────────────────────────────────
    let _toastEl    = null;
    let _toastTimer = null;

    function _toast(msg, ms = 3000) {
        if (!_toastEl) {
            _toastEl = document.createElement('div');
            _toastEl.id = 'i18n-toast';
            document.body.appendChild(_toastEl);
        }
        _toastEl.textContent = msg;
        _toastEl.classList.add('i18n-toast-visible');
        if (_toastTimer) clearTimeout(_toastTimer);
        if (ms > 0) _toastTimer = setTimeout(() => {
            _toastEl.classList.remove('i18n-toast-visible');
        }, ms);
    }

    // ── WELCOME MESSAGE ─────────────────────────────────────────
    window.showWelcomeMessage = async function (email) {
        let msg = window.i18n.t('welcome_fallback', 'Welcome! Have a great day 🙏');
        const key = _geminiKeys[0] || null;
        if (key) {
            try {
                const langName = SUPPORTED_LANGS[_currentLang]?.name || 'Hinglish';
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text:
                                `Write a warm 1-line welcome message for "${email}" using app "Apna Hisaab" (expense tracker). Language: ${langName}. Friendly tone, max 12 words, one emoji. No quotes.`
                            }] }],
                            generationConfig: { temperature: 0.8, maxOutputTokens: 60 }
                        })
                    }
                );
                if (res.ok) {
                    const d = await res.json();
                    const text = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    if (text) msg = text;
                }
            } catch (_) { /* use fallback */ }
        }
        _showWelcomeToast(msg);
    };

    function _showWelcomeToast(msg) {
        const t = document.createElement('div');
        t.className = 'welcome-toast-el';
        t.innerHTML = `<span class="welcome-toast-icon">👋</span><span>${msg}</span>`;
        document.body.appendChild(t);
        requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('welcome-toast-visible')));
        setTimeout(() => {
            t.classList.remove('welcome-toast-visible');
            setTimeout(() => t.remove(), 400);
        }, 5000);
    }

})();
