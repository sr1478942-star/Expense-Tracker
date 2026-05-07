const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
let currentPort = PORT;
const API_KEY = process.env.API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const SEED_EMAIL = 'sandeep@gmail.com';
const SEED_PASS = '12345';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Validate Supabase configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function requireApiKey(req, res, next) {
  const key = req.header('x-api-key') || req.query.api_key;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key is not configured on the server.' });
  }
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid API key.' });
  }
  next();
}

app.use('/api', requireApiKey);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Supabase backend is running',
    port: currentPort,
    api: '/api/health or /api/auth/login'
  });
});

app.post('/api/setup', async (req, res) => {
  try {
    const client = new Client({ connectionString: SUPABASE_DB_URL });
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS expenses (
        email TEXT REFERENCES users(email) ON DELETE CASCADE,
        data JSONB DEFAULT '[]'::jsonb,
        PRIMARY KEY (email)
      );
      CREATE TABLE IF NOT EXISTS income (
        email TEXT REFERENCES users(email) ON DELETE CASCADE,
        amount NUMERIC DEFAULT 0,
        PRIMARY KEY (email)
      );
      ALTER TABLE users DISABLE ROW LEVEL SECURITY;
      ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
      ALTER TABLE income DISABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow all users" ON users FOR ALL USING (true);
      CREATE POLICY "Allow all expenses" ON expenses FOR ALL USING (true);
      CREATE POLICY "Allow all income" ON income FOR ALL USING (true);
    `);
    await client.end();
    res.json({ message: 'Tables created successfully' });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Failed to create tables' });
  }
});

async function getUser(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? { email: data.email, password: data.password } : null;
}

async function setUser(user) {
  const { error } = await supabase
    .from('users')
    .upsert({ email: user.email, password: user.password });
  if (error) throw error;
}

async function getExpenses(email) {
  const { data, error } = await supabase
    .from('expenses')
    .select('data')
    .eq('email', email)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? data.data : [];
}

async function setExpenses(email, expenses) {
  const { error } = await supabase
    .from('expenses')
    .upsert({ email, data: expenses });
  if (error) throw error;
}

async function getIncome(email) {
  const { data, error } = await supabase
    .from('income')
    .select('amount')
    .eq('email', email)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? Number(data.amount) : 0;
}

async function setIncome(email, income) {
  const { error } = await supabase
    .from('income')
    .upsert({ email, amount: income });
  if (error) throw error;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (email === SEED_EMAIL && password === SEED_PASS) {
    return res.json({ email, seed: true });
  }
  const user = await getUser(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json({ email });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (email === SEED_EMAIL) {
    return res.status(400).json({ error: 'Seed email cannot be registered.' });
  }
  if (await getUser(email)) {
    return res.status(409).json({ error: 'Email already exists.' });
  }
  await setUser({ email, password });
  await setExpenses(email, []);
  await setIncome(email, 0);
  res.status(201).json({ email });
});

app.get('/api/expenses', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required.' });
  }
  const expenses = await getExpenses(email);
  const income = await getIncome(email);
  res.json({ email, expenses, income });
});

app.post('/api/expenses', async (req, res) => {
  const { email, expense, income } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  if (expense) {
    const list = await getExpenses(email);
    list.push(expense);
    await setExpenses(email, list);
  }
  if (typeof income !== 'undefined') {
    await setIncome(email, income);
  }
  res.json({ email, expenses: await getExpenses(email), income: await getIncome(email) });
});

app.post('/api/backup', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  const backup = {
    user: await getUser(email),
    expenses: await getExpenses(email),
    income: await getIncome(email)
  };
  res.json(backup);
});

app.post('/api/restore', async (req, res) => {
  const { email, expenses, income } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  if (Array.isArray(expenses)) {
    await setExpenses(email, expenses);
  }
  if (typeof income !== 'undefined') {
    await setIncome(email, income);
  }
  res.json({ email, expenses: await getExpenses(email), income: await getIncome(email) });
});

function startServer(port) {
  currentPort = port;
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Trying port ${port + 1} instead.`);
      startServer(port + 1);
      return;
    }
    console.error('Server error:', err);
    process.exit(1);
  });
}

startServer(PORT);
