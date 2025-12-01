// ===== ГЛОБАЛЬНОЕ СОСТОЯНИЕ =====
let currentUser = null;
let activeChatUser = null;
let chatReloadTimer = null;

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ FETCH =====
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = data && data.error ? data.error : 'Ошибка запроса';
    throw new Error(msg);
  }
  return data;
}

// ===== РАБОТА С ТЕКУЩИМ ПОЛЬЗОВАТЕЛЕМ =====
function saveCurrentUser(user) {
  currentUser = user;
  localStorage.setItem('ss_current_user', JSON.stringify(user));
}

function loadCurrentUserFromStorage() {
  const raw = localStorage.getItem('ss_current_user');
  if (!raw) return;
  try {
    currentUser = JSON.parse(raw);
  } catch {
    currentUser = null;
  }
}

function clearCurrentUser() {
  currentUser = null;
  activeChatUser = null;
  localStorage.removeItem('ss_current_user');
}

// ===== ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ =====
function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
  stopChatAutoReload();
}

function showAppScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'flex';
  const nameText = document.getElementById('userNameText');
  nameText.textContent = ${currentUser.name} · ${currentUser.email};
}

// ===== АВТОРИЗАЦИЯ =====
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

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
    showAppScreen();
    await loadUsers();
    resetChatUi();
  } catch (err) {
    alert(err.message);
  }
}

async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  if (!name  !email  !password) {
    alert('Заполни все поля регистрации');
    return;
  }

  try {
    await fetchJson('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    alert('Регистрация успешна! Теперь войди под своим email и паролем.');
    // переключаемся на форму логина
    switchAuthMode('login');
    document.getElementById('loginEmail').value = email;
  } catch (err) {
    alert(err.message);
  }
}

function handleLogout() {
  clearCurrentUser();
  resetChatUi();
  showAuthScreen();
}

// ===== ПЕРЕКЛЮЧЕНИЕ ТАБОВ ВХОД/РЕГИСТРАЦИЯ =====
function switchAuthMode(mode) {
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (mode === 'login') {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  } else {
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  }
}

// ===== ПОЛЬЗОВАТЕЛИ =====
async function loadUsers() {
  try {
    const data = await fetchJson('/api/users');
    const ul = document.getElementById('usersList');
    ul.innerHTML = '';

    const users = data.users.filter(u => !currentUser || u.id !== currentUser.id);

    if (!users.length) {
      const li = document.createElement('li');
      li.className = 'user-item';
      li.textContent = 'Пока здесь только ты 🙂';
      ul.appendChild(li);return;
    }

    users.forEach(u => {
      const li = document.createElement('li');
      li.className = 'user-item';
      li.dataset.userid = u.id;
      li.innerHTML = `
        <div class="user-name">${u.name}</div>
        <div class="user-meta">id: ${u.id}</div>
      `;
      li.addEventListener('click', () => selectChatUser(u, li));
      ul.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки пользователей: ' + err.message);
  }
}

function selectChatUser(user, listItemElement) {
  activeChatUser = user;

  // подсветка выбранного
  document.querySelectorAll('.user-item').forEach(li => {
    li.classList.remove('active');
  });
  if (listItemElement) {
    listItemElement.classList.add('active');
  }

  const chatTitle = document.getElementById('chatTitle');
  const chatHint = document.getElementById('chatHint');
  chatTitle.textContent = Чат с ${user.name};
  chatHint.textContent = id собеседника: ${user.id};

  loadChat();
  startChatAutoReload();
}

// ===== ЧАТ =====
async function loadChat() {
  if (!currentUser || !activeChatUser) return;

  try {
    const data = await fetchJson(
      /api/messages?a=${encodeURIComponent(currentUser.id)}&b=${encodeURIComponent(activeChatUser.id)}
    );
    renderChat(data.messages);
  } catch (err) {
    console.error(err);
  }
}

function renderChat(messages) {
  const box = document.getElementById('chatMessages');
  box.innerHTML = '';

  if (!messages.length) {
    box.innerHTML = '<div class="chat-empty">Пока сообщений нет. Напиши первым 👋</div>';
    return;
  }

  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = 'chat-message';
    if (m.fromId === currentUser.id) {
      div.classList.add('me');
    }

    const time = new Date(m.createdAt).toLocaleTimeString();
    const who = m.fromId === currentUser.id ? 'Ты' : 'Он/Она';

    div.innerHTML = `
      <div class="chat-meta">
        <span class="chat-who">${who}</span>
        <span class="chat-time">${time}</span>
      </div>
      <div class="chat-text">${escapeHtml(m.text)}</div>
    `;
    box.appendChild(div);
  });

  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  if (!currentUser || !activeChatUser) {
    alert('Сначала выбери собеседника слева');
    return;
  }

  const textarea = document.getElementById('chatInput');
  const text = textarea.value.trim();
  if (!text) return;

  try {
    await fetchJson('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromId: currentUser.id,
        toId: activeChatUser.id,
        text
      })
    });
    textarea.value = '';
    await loadChat();
  } catch (err) {
    alert('Ошибка отправки сообщения: ' + err.message);
  }
}

function resetChatUi() {
  const box = document.getElementById('chatMessages');
  const title = document.getElementById('chatTitle');
  const hint = document.getElementById('chatHint');
  const textarea = document.getElementById('chatInput');

  activeChatUser = null;
  stopChatAutoReload();
  if (box) box.innerHTML = '';
  if (title) title.textContent = 'Чат';
  if (hint) hint.textContent = 'Выбери пользователя слева, чтобы начать переписку.';
  if (textarea) textarea.value = '';
}

// автообновление чата
function startChatAutoReload() {
  stopChatAutoReload();
  chatReloadTimer = setInterval(loadChat, 4000);
}

function stopChatAutoReload() {
  if (chatReloadTimer) {
    clearInterval(chatReloadTimer);
    chatReloadTimer = null;
  }
}

// ===== УТИЛИТА: ЭСКЕЙП HTML =====
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', () => {
  // элементы
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const toRegisterLink = document.getElementById('toRegisterLink');
  const toLoginLink = document.getElementById('toLoginLink');const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const reloadUsersBtn = document.getElementById('reloadUsersBtn');
  const sendMsgBtn = document.getElementById('sendMsgBtn');
  const chatInput = document.getElementById('chatInput');

  // переключение вкладок
  loginTab.addEventListener('click', () => switchAuthMode('login'));
  registerTab.addEventListener('click', () => switchAuthMode('register'));
  toRegisterLink.addEventListener('click', () => switchAuthMode('register'));
  toLoginLink.addEventListener('click', () => switchAuthMode('login'));

  // кнопки
  loginBtn.addEventListener('click', handleLogin);
  registerBtn.addEventListener('click', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);
  reloadUsersBtn.addEventListener('click', loadUsers);
  sendMsgBtn.addEventListener('click', sendMessage);

  // Enter для отправки сообщений
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // если уже сохранён пользователь — сразу показываем приложение
  loadCurrentUserFromStorage();
  if (currentUser) {
    showAppScreen();
    loadUsers();
  } else {
    showAuthScreen();
  }
});
