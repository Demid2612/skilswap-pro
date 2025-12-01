const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_FILE = path.join(__dirname, 'db.json');

// ---------- "БАЗА ДАННЫХ" ----------
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const empty = { users: [], messages: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf8');
  }
}

function readDb() {
  initDb();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { users: [], messages: [] };
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// ---------- НАСТРОЙКА EXPRESS ----------
app.use(express.json());
app.use(express.static(__dirname));

// health-check для Render
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// ---------- РЕГИСТРАЦИЯ ----------
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name  !email  !password) {
    return res.status(400).json({ error: 'Заполни имя, email и пароль' });
  }

  const db = readDb();

  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Пользователь с таким email уже есть' });
  }

  const user = {
    id: Date.now().toString(),
    name,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDb(db);

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ---------- ЛОГИН ----------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Введите email и пароль' });
  }

  const db = readDb();
  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(400).json({ error: 'Неверный email или пароль' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ---------- СПИСОК ПОЛЬЗОВАТЕЛЕЙ ----------
app.get('/api/users', (req, res) => {
  const db = readDb();
  const users = db.users.map(u => {
    const { password, ...safe } = u;
    return safe;
  });
  res.json({ users });
});

// ---------- СООБЩЕНИЯ (ЧАТ) ----------

// Получить сообщения между двумя пользователями
app.get('/api/messages', (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) {
    return res.status(400).json({ error: 'Нужны оба id (a и b)' });
  }

  const db = readDb();
  const messages = db.messages
    .filter(
      m =>
        (m.fromId === a && m.toId === b) ||
        (m.fromId === b && m.toId === a)
    )
    .sort((m1, m2) => new Date(m1.createdAt) - new Date(m2.createdAt));

  res.json({ messages });
});

// Отправить сообщение
app.post('/api/messages', (req, res) => {
  const { fromId, toId, text } = req.body;

  if (!fromId  !toId  !text) {
    return res.status(400).json({ error: 'fromId, toId и text обязательны' });
  }

  const db = readDb();

  const message = {
    id: Date.now().toString(),
    fromId,
    toId,
    text,
    createdAt: new Date().toISOString()
  };

  db.messages.push(message);
  writeDb(db);

  res.json({ message });
});

// ---------- ЗАПУСК СЕРВЕРА ----------
app.listen(PORT, () => {
  console.log(`SkillSwap PRO server started on port ${PORT}`);
});
