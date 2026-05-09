require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!API_KEY) {
  console.error('Missing API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
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

async function loadJsonData(table, email) {
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data?.data || [];
}

async function upsertJsonData(table, email, dataArray) {
  const { error } = await supabase
    .from(table)
    .upsert({ email, data: dataArray }, { onConflict: 'email' });

  if (error) {
    throw error;
  }
}

app.get('/api/expenses', requireApiKey, async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email query param is required' });

  try {
    const expenses = await loadJsonData('expenses', email);
    const incomes = await loadJsonData('income', email);
    return res.json({ expenses, incomes });
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

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    let currentExpenses = await loadJsonData('expenses', email);
    let currentIncomes = await loadJsonData('income', email);

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

    return res.json({ expenses: currentExpenses, incomes: currentIncomes });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return res.status(500).json({ error: 'Could not save expense data' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
