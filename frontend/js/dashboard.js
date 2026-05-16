const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async function () {
    await fetch("/api/auth/logout", {
        method: "POST"
    });

    window.location.href = "../index.html";
});

async function checkLogin() {
    const response = await fetch("/api/auth/me");
    const data = await response.json();

    if (!response.ok) {
        window.location.href = "../index.html";
        return;
    }

    document.getElementById("message").textContent = `Welcome, ${data.user.username}`;
}

checkLogin();