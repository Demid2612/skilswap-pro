const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

const DB_FILE = path.join(__dirname, 'db.json');

// ---------------- База данных ----------------
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], messages: [] }, null, 2));
  }
}

function readDb() {
  initDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---------------- Настройки ----------------
app.use(express.json());
app.use(express.static(__dirname));

// Проверка сервера (Render Health Check)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---------------- Регистрация ----------------
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name  !email  !password)
    return res.status(400).json({ error: "Заполни все поля!" });

  const db = readDb();
  if (db.users.some(u => u.email === email))
    return res.status(400).json({ error: "Email уже существует!" });

  const user = {
    id: Date.now().toString(),
    name,
    email,
    password
  };

  db.users.push(user);
  writeDb(db);

  const { password: _, ...safe } = user;
  res.json({ user: safe });
});

// ---------------- Логин ----------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  const db = readDb();
  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user)
    return res.status(400).json({ error: "Неверный логин или пароль" });

  const { password: _, ...safe } = user;
  res.json({ user: safe });
});

// ---------------- Запуск сервера ----------------
app.listen(PORT, () =>
  console.log("Server started on port " + PORT)
);
