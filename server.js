const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// чтобы читать JSON из запросов
app.use(express.json());

// отдаём статику: index.html, style.css, app.js
app.use(express.static(__dirname));

// "база данных" в памяти сервера
let users = [];      // список пользователей
let requests = [];   // запросы обмена навыками
let messages = [];   // сообщения в "чате"

// зарегистрировать пользователя
app.post("/api/users", (req, res) => {
  const { name, school, canTeach, wantLearn } = req.body;

  if (!name || !canTeach || !wantLearn) {
    return res.status(400).json({ error: "Заполните имя, что можете и что хотите изучать" });
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    school: school || "",
    canTeach: canTeach.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
    wantLearn: wantLearn.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  res.json(newUser);
});

// получить всех пользователей
app.get("/api/users", (req, res) => {
  res.json(users);
});

// найти совпадения для пользователя по его id
app.get("/api/matches/:userId", (req, res) => {
  const { userId } = req.params;
  const me = users.find(u => u.id === userId);
  if (!me) return res.status(404).json({ error: "Пользователь не найден" });

  const matches = users
    .filter(u => u.id !== me.id)
    .map(u => {
      const theyCanTeach = new Set(u.canTeach);
      const theyWantLearn = new Set(u.wantLearn);
      const iCanTeach = new Set(me.canTeach);
      const iWantLearn = new Set(me.wantLearn);

      const skillsTheyCanHelpMe = me.wantLearn.filter(s => theyCanTeach.has(s));
      const skillsICanHelpThem = me.canTeach.filter(s => theyWantLearn.has(s));

      return {
        user: u,
        skillsTheyCanHelpMe,
        skillsICanHelpThem
      };
    })
    .filter(m => m.skillsTheyCanHelpMe.length > 0 || m.skillsICanHelpThem.length > 0);

  res.json({ me, matches });
});

// отправить запрос на обмен навыками
app.post("/api/requests", (req, res) => {
  const { fromId, toId, message } = req.body;

  if (!fromId || !toId) {
    return res.status(400).json({ error: "Нужны fromId и toId" });
  }

  const fromUser = users.find(u => u.id === fromId);
  const toUser = users.find(u => u.id === toId);
  if (!fromUser || !toUser) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const reqObj = {
    id: Date.now().toString(),
    fromId,
    toId,
    message: message || "",
    status: "pending", // pending | accepted | rejected
    createdAt: new Date().toISOString()
  };

  requests.push(reqObj);
  res.json(reqObj);
});

// получить запросы для конкретного пользователя
app.get("/api/requests/:userId", (req, res) => {
  const { userId } = req.params;
  const myRequests = requests.filter(r => r.toId === userId || r.fromId === userId);
  res.json(myRequests);
});

// изменить статус запроса (принять / отклонить)
app.post("/api/requests/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "accepted" или "rejected"

  const allowed = ["accepted", "rejected"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Некорректный статус" });
  }

  const r = requests.find(x => x.id === id);
  if (!r) return res.status(404).json({ error: "Запрос не найден" });

  r.status = status;
  res.json(r);
});

// простейший "чат" между двумя пользователями
app.post("/api/messages", (req, res) => {
  const { fromId, toId, text } = req.body;
  if (!fromId || !toId || !text) {
    return res.status(400).json({ error: "Нужны fromId, toId и text" });
  }

  const msg = {
    id: Date.now().toString(),
    fromId,
    toId,
    text,
    createdAt: new Date().toISOString()
  };

  messages.push(msg);
  res.json(msg);
});

app.get("/api/messages", (req, res) => {
  const { a, b } = req.query; // a и b — id двух пользователей
  if (!a || !b) return res.status(400).json({ error: "Нужны параметры a и b" });

  const dialog = messages.filter(
    m =>
      (m.fromId === a && m.toId === b) ||
      (m.fromId === b && m.toId === a)
  );

  res.json(dialog);
});

// стартуем сервер
app.listen(PORT, () => {
  console.log(`Сервер SkillSwap PRO запущен: http://localhost:${PORT}`);
});
