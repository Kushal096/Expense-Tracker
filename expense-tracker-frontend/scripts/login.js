const signinBtn = document.getElementById("signinBtn");
const createAccountLink = document.getElementById("createAccountLink");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

signinBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  
  if (!signinBtn || signinBtn.disabled) {
    return;
  }

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showNotification("Please enter both email and password.", 'error');
    return;
  }

  try {
    await loadingManager.executeWithLoading(signinBtn, async () => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      showNotification('Login successful!', 'success');
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    });
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
    console.error("Login error:", error);
  }
});

createAccountLink.addEventListener("click", () => {
  window.location.href = "signup.html";
});