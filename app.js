const apiBase = "";

// текущий пользователь (сохраним id в localStorage)
let currentUser = null;

// элементы
const registerForm = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const schoolInput = document.getElementById("school");
const canTeachInput = document.getElementById("canTeach");
const wantLearnInput = document.getElementById("wantLearn");
const currentUserInfo = document.getElementById("currentUserInfo");

const reloadUsersBtn = document.getElementById("reloadUsersBtn");
const usersList = document.getElementById("usersList");

const findMatchesBtn = document.getElementById("findMatchesBtn");
const matchesDiv = document.getElementById("matches");

const requestsDiv = document.getElementById("requests");

const chatFromIdInput = document.getElementById("chatFromId");
const chatToIdInput = document.getElementById("chatToId");
const chatMessagesDiv = document.getElementById("chatMessages");
const chatTextInput = document.getElementById("chatText");
const sendMsgBtn = document.getElementById("sendMsgBtn");
const reloadChatBtn = document.getElementById("reloadChatBtn");

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

function saveCurrentUserId(id) {
  currentUser = { id };
  localStorage.setItem("skillswap_user_id", id);
  updateCurrentUserInfo();
}

function loadCurrentUserId() {
  const id = localStorage.getItem("skillswap_user_id");
  if (id) {
    currentUser = { id };
    updateCurrentUserInfo();
  }
}

function updateCurrentUserInfo() {
  if (!currentUser) {
    currentUserInfo.textContent = "Профиль ещё не сохранён.";
    return;
  }
  currentUserInfo.textContent = "Твой ID: " + currentUser.id + " (используется для матчей и чата).";
  chatFromIdInput.value = currentUser.id;
}

async function fetchJson(url, options) {
  const res = await fetch(apiBase + url, options);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ===== РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ =====

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const school = schoolInput.value.trim();
  const canTeach = canTeachInput.value.trim();
  const wantLearn = wantLearnInput.value.trim();

  if (!name || !canTeach || !wantLearn) {
    alert("Заполни обязательные поля");
    return;
  }

  try {
    const user = await fetchJson("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, school, canTeach, wantLearn })
    });

    saveCurrentUserId(user.id);
    alert("Профиль сохранён. Твой ID: " + user.id);
    await loadUsers();
  } catch (err) {
    console.error(err);
    alert("Ошибка при сохранении профиля: " + err.message);
  }
});

// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ =====

async function loadUsers() {
  try {
    const users = await fetchJson("/api/users");
    renderUsers(users);
  } catch (err) {
    console.error(err);
    alert("Ошибка при загрузке пользователей: " + err.message);
  }
}

function renderUsers(users) {
  usersList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.className = "user-item";

    const skillsTeach = u.canTeach.join(", ");
    const skillsLearn = u.wantLearn.join(", ");

    li.innerHTML = `
      <div><strong>${u.name}</strong> ${u.school ? `(${u.school})` : ""}</div>
      <div class="user-id">ID: ${u.id}</div>
      <div><strong>Может объяснить:</strong> ${skillsTeach || "—"}</div>
      <div><strong>Хочет изучать:</strong> ${skillsLearn || "—"}</div>
      <button data-id="${u.id}" class="btn-match-for">Найти матчи с этим пользователем</button>
    `;
    usersList.appendChild(li);
  });

  document.querySelectorAll(".btn-match-for").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await findMatchesFor(id);
    });
  });
}

// ===== МАТЧИНГ =====

findMatchesBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Сначала создай профиль");
    return;
  }
  await findMatchesFor(currentUser.id);
});

async function findMatchesFor(userId) {
  try {
    const data = await fetchJson(`/api/matches/${userId}`);
    renderMatches(data);
  } catch (err) {
    console.error(err);
    alert("Ошибка при поиске совпадений: " + err.message);
  }
}

function renderMatches(data) {
  const { me, matches } = data;
  matchesDiv.innerHTML = "";

  const title = document.createElement("p");
  title.innerHTML = `<strong>Пользователь:</strong> ${me.name} (ID: ${me.id})`;
  matchesDiv.appendChild(title);

  if (matches.length === 0) {
    matchesDiv.innerHTML += "<p>Совпадений по навыкам пока нет.</p>";
    return;
  }

  matches.forEach(m => {
    const card = document.createElement("div");
    card.className = "match-card";

    const they = m.user;

    const helpMe = m.skillsTheyCanHelpMe.map(s => `<span class="chip">${s}</span>`).join(" ");
    const helpThem = m.skillsICanHelpThem.map(s => `<span class="chip">${s}</span>`).join(" ");

    card.innerHTML = `
      <div><strong>${they.name}</strong> (ID: ${they.id})</div>
      <div><strong>Он(а) может помочь мне с:</strong> ${helpMe || "—"}</div>
      <div><strong>Я могу помочь ему/ей с:</strong> ${helpThem || "—"}</div>
      <button class="btn-send-request" data-to="${they.id}">Отправить запрос обмена</button>
    `;
    matchesDiv.appendChild(card);
  });

  document.querySelectorAll(".btn-send-request").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!currentUser) {
        alert("Сначала создай профиль");
        return;
      }
      const toId = btn.getAttribute("data-to");
      const msg = prompt("Напиши короткое сообщение (например: давай поменяемся уроками):", "Привет! Давай обмениваться навыками?");
      try {
        await fetchJson("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromId: currentUser.id,
            toId,
            message: msg || ""
          })
        });
        alert("Запрос отправлен");
        await loadRequests();
      } catch (err) {
        console.error(err);
        alert("Ошибка при отправке запроса: " + err.message);
      }
    });
  });
}

// ===== ЗАПРОСЫ =====

async function loadRequests() {
  if (!currentUser) return;
  try {
    const list = await fetchJson(`/api/requests/${currentUser.id}`);
    renderRequests(list);
  } catch (err) {
    console.error(err);
  }
}

function renderRequests(list) {
  requestsDiv.innerHTML = "";
  if (list.length === 0) {
    requestsDiv.textContent = "Нет запросов.";
    return;
  }

  list.forEach(r => {
    const card = document.createElement("div");
    card.className = "request-card";

    const isIncoming = r.toId === currentUser.id;
    const direction = isIncoming ? "Входящий" : "Исходящий";

    card.innerHTML = `
      <div><strong>${direction} запрос</strong> (ID: ${r.id})</div>
      <div>От: ${r.fromId} → Кому: ${r.toId}</div>
      <div>Сообщение: ${r.message || "—"}</div>
      <div>Статус: <strong>${r.status}</strong></div>
    `;

    if (isIncoming && r.status === "pending") {
      const btnAccept = document.createElement("button");
      btnAccept.textContent = "Принять";
      btnAccept.addEventListener("click", () => updateRequestStatus(r.id, "accepted"));

      const btnReject = document.createElement("button");
      btnReject.textContent = "Отклонить";
      btnReject.addEventListener("click", () => updateRequestStatus(r.id, "rejected"));

      card.appendChild(btnAccept);
      card.appendChild(btnReject);
    }

    requestsDiv.appendChild(card);
  });
}

async function updateRequestStatus(id, status) {
  try {
    await fetchJson(`/api/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await loadRequests();
  } catch (err) {
    console.error(err);
    alert("Ошибка: " + err.message);
  }
}

// ===== ЧАТ =====

async function loadChat() {
  const a = chatFromIdInput.value.trim();
  const b = chatToIdInput.value.trim();
  if (!a || !b) {
    alert("Заполни оба ID для чата");
    return;
  }

  try {
    const msgs = await fetchJson(`/api/messages?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
    renderChat(msgs, a);
  } catch (err) {
    console.error(err);
    alert("Ошибка при загрузке чата: " + err.message);
  }
}

function renderChat(msgs, myId) {
  chatMessagesDiv.innerHTML = "";
  msgs.forEach(m => {
    const div = document.createElement("div");
    div.className = "chat-message" + (m.fromId === myId ? " me" : "");
    const time = new Date(m.createdAt).toLocaleTimeString();
    div.innerHTML = `<span class="time">[${time}]</span> ${m.fromId}: ${m.text}`;
    chatMessagesDiv.appendChild(div);
  });
  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

async function sendMessage() {
  const fromId = chatFromIdInput.value.trim();
  const toId = chatToIdInput.value.trim();
  const text = chatTextInput.value.trim();
  if (!fromId || !toId || !text) {
    alert("Заполни ID и текст сообщения");
    return;
  }

  try {
    await fetchJson("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromId, toId, text })
    });
    chatTextInput.value = "";
    await loadChat();
  } catch (err) {
    console.error(err);
    alert("Ошибка при отправке сообщения: " + err.message);
  }
}

sendMsgBtn.addEventListener("click", sendMessage);
reloadChatBtn.addEventListener("click", loadChat);
chatTextInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// ===== КНОПКИ ЗАГРУЗКИ =====

reloadUsersBtn.addEventListener("click", loadUsers);

// ===== ИНИЦИАЛИЗАЦИЯ =====
loadCurrentUserId();
loadUsers();
setInterval(loadRequests, 5000);
