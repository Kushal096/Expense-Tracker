const API_BASE_URL = "http://127.0.0.1:8000";

const signupForm = document.getElementById("signup-form");
const signupMessage = document.getElementById("signup-message");
const signupButton = document.getElementById("signup-btn");

function setMessage(message, type = "info") {
    signupMessage.textContent = message;
    signupMessage.className = `message ${type}`;
}

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("signup-username").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    if (!username || !email || !password || !confirmPassword) {
        setMessage("Please fill all fields.", "error");
        return;
    }

    if (password !== confirmPassword) {
        setMessage("Passwords do not match.", "error");
        return;
    }

    signupButton.disabled = true;
    signupButton.textContent = "Creating...";
    setMessage("", "info");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Signup failed");
        }

        setMessage("Account created successfully. Redirecting to login...", "success");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);
    } catch (error) {
        setMessage(error.message || "Unable to signup right now.", "error");
    } finally {
        signupButton.disabled = false;
        signupButton.textContent = "Create Account";
    }
});
