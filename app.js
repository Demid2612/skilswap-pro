let currentUser = null;

function registerUser() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  })
    .then(r => r.json())
    .then(d => {
      if (d.error) return alert(d.error);
      alert("Регистрация прошла успешно!");
    });
}

function loginUser() {
  const email = document.getElementById("logEmail").value;
  const password = document.getElementById("logPassword").value;

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(r => r.json())
    .then(d => {
      if (d.error) return alert(d.error);
      currentUser = d.user;
      alert("Добро пожаловать, " + currentUser.name);
      document.getElementById("authBox").style.display = "none";
      document.getElementById("profile").innerText = "Вы вошли как: " + currentUser.name;
    });
}
