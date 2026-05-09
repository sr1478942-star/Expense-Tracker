require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const app = express();
const port = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('Missing required environment variable: API_KEY');
  process.exit(1);
}

const VALID_API_KEYS = new Set([API_KEY]);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let pgClient = null;

async function getPgClient() {
  if (!SUPABASE_DB_URL) return null;
  try {
    const client = new Client({ connectionString: SUPABASE_DB_URL });
    await client.connect();
    return client;
  } catch (err) {
    console.error('PG client connect error:', err.message);
    return null;
  }
}

async function runPgQuery(query) {
  const client = await getPgClient();
  if (!client) return;
  try {
    await client.query(query);
  } catch (err) {
    console.error('PG query error:', err.message);
  } finally {
    await client.end();
  }
}

async function ensureSupabaseJsonSchema() {
  if (!SUPABASE_DB_URL) {
    console.warn('SUPABASE_DB_URL missing; schema migrations disabled.');
    return;
  }
  try {
    await runPgQuery(`ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS data jsonb;`);
    await runPgQuery(`ALTER TABLE public.income ADD COLUMN IF NOT EXISTS data jsonb;`);
    await runPgQuery(`CREATE TABLE IF NOT EXISTS public.khata (email text PRIMARY KEY, data jsonb);`);
  } catch (err) {
    console.error('Schema migration warning:', err.message || err);
  }
}

app.use(cors());
app.use(express.json());

// Serve static files with API_KEY injection for frontend
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    const fs = require('fs');
    const indexPath = path.join(__dirname, 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send('Error loading page');
      }
      const injectedHtml = data.replace(
        '</head>',
        `<script>window.__APP_CONFIG__ = { API_KEY: '${API_KEY}' };</script>\n</head>`
      );
      res.send(injectedHtml);
    });
  } else {
    next();
  }
});

app.use(express.static(path.join(__dirname)));

function requireApiKey(req, res, next) {
  const headerKey = req.headers['x-api-key'] || req.headers['authorization'];
  const authKey = typeof headerKey === 'string' ? headerKey.replace(/^Bearer\s+/i, '') : headerKey;
  const queryKey = req.query.api_key || req.query.apiKey || req.query.apikey;
  const key = authKey || queryKey;
  if (!VALID_API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, environment: process.env.NODE_ENV || 'development' });
});

app.post('/api/auth/signup', requireApiKey, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data: existingUsers, error: selectError } = await supabase
    .from('users')
    .select('email')
    .eq('email', email);

  if (selectError) {
    console.error('Signup select error:', selectError);
    return res.status(500).json({ error: 'Unable to verify user' });
  }

  if (existingUsers && existingUsers.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const { error: insertError } = await supabase
    .from('users')
    .insert({ email, password });

  if (insertError) {
    console.error('Signup insert error:', insertError);
    return res.status(500).json({ error: 'Signup failed' });
  }

  return res.json({ message: 'Signup successful' });
});

app.post('/api/auth/login', requireApiKey, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('password')
    .eq('email', email);

  if (error) {
    console.error('Login select error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }

  if (!users || users.length === 0) {
    return res.status(401).json({ error: 'Email not found' });
  }

  if (users[0].password !== password) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  return res.json({ message: 'Login successful' });
});

function isSchemaError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return error.code === 'PGRST116' || error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703' || message.includes('could not find') || message.includes('invalid column');
}

async function ensureJsonTableStructure(table) {
  if (!SUPABASE_DB_URL) return;
  try {
    if (table === 'khata') {
      await runPgQuery(`CREATE TABLE IF NOT EXISTS public.khata (email text PRIMARY KEY, data jsonb);`);
    }
    if (table === 'income') {
      await runPgQuery(`ALTER TABLE public.income ADD COLUMN IF NOT EXISTS data jsonb;`);
    }
    if (table === 'expenses') {
      await runPgQuery(`ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS data jsonb;`);
    }
  } catch (err) {
    console.error(`Schema ensure failed for table ${table}:`, err.message || err);
  }
}

async function loadJsonData(table, email) {
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .eq('email', email)
    .single();

  if (error) {
    if (isSchemaError(error)) {
      await ensureJsonTableStructure(table);
      return [];
    }
    console.error(`loadJsonData fallback for table=${table}, email=${email}:`, error);
    return [];
  }

  return data?.data || [];
}

async function upsertJsonData(table, email, dataArray) {
  const { error } = await supabase
    .from(table)
    .upsert({ email, data: dataArray }, { onConflict: 'email' });

  if (error) {
    if (isSchemaError(error)) {
      await ensureJsonTableStructure(table);
      const { error: retryError } = await supabase
        .from(table)
        .upsert({ email, data: dataArray }, { onConflict: 'email' });
      if (retryError) {
        throw retryError;
      }
      return;
    }
    throw error;
  }
}

app.get('/api/expenses', requireApiKey, async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email query param is required' });

  try {
    const expenses = await loadJsonData('expenses', email);
    const incomes = await loadJsonData('income', email);
    const khataBook = await loadJsonData('khata', email);
    return res.json({ expenses, incomes, khataBook });
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return res.status(500).json({ error: 'Could not load expense data' });
  }
});

app.post('/api/expenses', requireApiKey, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const expense = req.body.expense;
  const expenses = req.body.expenses;
  const incomes = req.body.incomes;
  const khata = req.body.khata;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    let currentExpenses = await loadJsonData('expenses', email);
    let currentIncomes = await loadJsonData('income', email);
    let currentKhata = await loadJsonData('khata', email);

    if (expense) {
      currentExpenses = Array.isArray(currentExpenses) ? currentExpenses : [];
      currentExpenses.push(expense);
      await upsertJsonData('expenses', email, currentExpenses);
    }

    if (Array.isArray(expenses)) {
      await upsertJsonData('expenses', email, expenses);
      currentExpenses = expenses;
    }

    if (Array.isArray(incomes)) {
      await upsertJsonData('income', email, incomes);
      currentIncomes = incomes;
    }

    if (Array.isArray(khata)) {
      await upsertJsonData('khata', email, khata);
      currentKhata = khata;
    }

    return res.json({ expenses: currentExpenses, incomes: currentIncomes, khataBook: currentKhata });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return res.status(500).json({ error: 'Could not save expense data' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureSupabaseJsonSchema().finally(() => {
  app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
  });
});
