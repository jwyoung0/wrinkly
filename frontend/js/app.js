// Find elements from HTML
const message = document.getElementById("message");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");

async function sendAuthRequest(endpoint) {
    const username = usernameInput.value;
    const password = passwordInput.value;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    const data = await response.json();

    if (!response.ok) {
        message.textContent = data.message || "Something went wrong";
        return false;
    }

    message.textContent = data.message;
    return true;
}


// Add click behavior
registerBtn.addEventListener("click", function () {
    sendAuthRequest("/api/auth/register");
});

loginBtn.addEventListener("click", async function () {
    const success = await sendAuthRequest("/api/auth/login");

    if (success) {
        window.location.href = "/dashboard";
    }
});
