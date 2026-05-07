const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const SEED_EMAIL = 'sandeep@gmail.com';
const SEED_PASS = '12345';

const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', err => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
  console.log('Connected to Redis');
})();

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

const getUserKey = email => `user:${email}`;
const getExpensesKey = email => `expenses:${email}`;
const getIncomeKey = email => `income:${email}`;

async function getUser(email) {
  const raw = await redisClient.get(getUserKey(email));
  return raw ? JSON.parse(raw) : null;
}

async function setUser(user) {
  await redisClient.set(getUserKey(user.email), JSON.stringify(user));
}

async function getExpenses(email) {
  const raw = await redisClient.get(getExpensesKey(email));
  return raw ? JSON.parse(raw) : [];
}

async function setExpenses(email, expenses) {
  await redisClient.set(getExpensesKey(email), JSON.stringify(expenses));
}

async function getIncome(email) {
  const raw = await redisClient.get(getIncomeKey(email));
  return raw ? Number(raw) : 0;
}

async function setIncome(email, income) {
  await redisClient.set(getIncomeKey(email), String(income));
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
