// ==== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====
let currentUser = null;

// ==== ПОМОЩНИК ДЛЯ FETCH ====
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // игнор
  }
  if (!res.ok) {
    const msg = data && data.error ? data.error : 'Ошибка запроса';
    throw new Error(msg);
  }
  return data;
}

// ==== РАБОТА С ТЕКУЩИМ ПОЛЬЗОВАТЕЛЕМ ====
function saveCurrentUser(user) {
  currentUser = user;
  localStorage.setItem('ss_current_user', JSON.stringify(user));
  updateUiForAuth();
}

function loadCurrentUser() {
  const raw = localStorage.getItem('ss_current_user');
  if (!raw) return;
  try {
    currentUser = JSON.parse(raw);
  } catch {
    currentUser = null;
  }
  updateUiForAuth();
}

// ==== ОБНОВЛЕНИЕ UI ====
function updateUiForAuth() {
  const profileText = document.getElementById('profileText');
  const authBox = document.getElementById('authBox');
  const mainBox = document.getElementById('mainBox');
  const chatFromIdInput = document.getElementById('chatFromId');

  if (currentUser) {
    profileText.textContent = Вы вошли как: ${currentUser.name} (id: ${currentUser.id});
    authBox.style.display = 'none';
    mainBox.style.display = 'block';
    if (chatFromIdInput) chatFromIdInput.value = currentUser.id;
  } else {
    profileText.textContent = 'Вы не вошли';
    authBox.style.display = 'block';
    mainBox.style.display = 'none';
  }
}

// ==== РЕГИСТРАЦИЯ ====
async function registerUser() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  if (!name  !email  !password) {
    alert('Заполни все поля для регистрации');
    return;
  }

  try {
    const data = await fetchJson('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    alert('Регистрация прошла успешно! Теперь войди под своим email и паролем.');
    document.getElementById('logEmail').value = email;
  } catch (err) {
    alert(err.message);
  }
}

// ==== ЛОГИН ====
async function loginUser() {
  const email = document.getElementById('logEmail').value.trim();
  const password = document.getElementById('logPassword').value.trim();

  if (!email || !password) {
    alert('Введите email и пароль');
    return;
  }

  try {
    const data = await fetchJson('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    saveCurrentUser(data.user);
    alert(`Добро пожаловать, ${data.user.name}!`);
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
}

// ==== СПИСОК ПОЛЬЗОВАТЕЛЕЙ ====
async function loadUsers() {
  try {
    const data = await fetchJson('/api/users');
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    data.users.forEach(u => {
      const li = document.createElement('li');
      li.textContent = ${u.name} — id: ${u.id}, email: ${u.email};
      usersList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    alert('Ошибка при загрузке пользователей: ' + err.message);
  }
}

// ==== ЧАТ ====
async function loadChat() {
  const chatFromIdInput = document.getElementById('chatFromId');
  const chatToIdInput = document.getElementById('chatToId');

  const a = chatFromIdInput.value.trim();
  const b = chatToIdInput.value.trim();

  if (!a || !b) {
    alert('Заполни оба ID для чата');
    return;
  }

  try {
    const data = await fetchJson(`/api/messages?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
    renderChat(data.messages, a);
  } catch (err) {
    console.error(err);
    alert('Ошибка при загрузке чата: ' + err.message);
  }
}

function renderChat(messages, myId) {
  const chatMessagesDiv = document.getElementById('chatMessages');
  chatMessagesDiv.innerHTML = '';

  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = 'chat-message' + (m.fromId === myId ? ' me' : '');
    const time = new Date(m.createdAt).toLocaleTimeString();
    div.innerHTML = <span class="time">[${time}]</span> <strong>${m.fromId}</strong>: ${m.text};
    chatMessagesDiv.appendChild(div);
  });

  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

async function sendMessage() {
  const chatFromIdInput = document.getElementById('chatFromId');
  const chatToIdInput = document.getElementById('chatToId');
  const chatTextInput = document.getElementById('chatText');

  const fromId = chatFromIdInput.value.trim();
  const toId = chatToIdInput.value.trim();
  const text = chatTextInput.value.trim();

  if (!fromId  !toId  !text) {
    alert('Заполни ID и текст сообщения');
    return;
  }

  try {
    await fetchJson('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId, toId, text })
    });
    chatTextInput.value = '';
    await loadChat();
  } catch (err) {
    console.error(err);
    alert('Ошибка при отправке сообщения: ' + err.message);
  }
}

// ==== ИНИЦИАЛИЗАЦИЯ ====
window.addEventListener('DOMContentLoaded', () => {
  const reloadUsersBtn = document.getElementById('reloadUsersBtn');
  const sendMsgBtn = document.getElementById('sendMsgBtn');
  const reloadChatBtn = document.getElementById('reloadChatBtn');
  const chatTextInput = document.getElementById('chatText');

  if (reloadUsersBtn) reloadUsersBtn.addEventListener('click', loadUsers);
  if (sendMsgBtn) sendMsgBtn.addEventListener('click', sendMessage);
  if (reloadChatBtn) reloadChatBtn.addEventListener('click', loadChat);
  if (chatTextInput) {
    chatTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  loadCurrentUser();
  loadUsers();
});
