const API_BASE_URL = "http://127.0.0.1:8000";

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-btn");

function setMessage(message, type = "info") {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        setMessage("Please enter both email and password.", "error");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    setMessage("", "info");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Login failed");
        }

        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("token_type", result.token_type);

        setMessage("Login successful.", "success");
    } catch (error) {
        setMessage(error.message || "Unable to login right now.", "error");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log In";
    }
});
