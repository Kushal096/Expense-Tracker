const createAccountBtn = document.getElementById("createAccountBtn");
const backToSignin = document.getElementById("backToSignin");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

document.addEventListener("DOMContentLoaded", () => {
  redirectIfAuthenticated();
});


createAccountBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  
  if (!createAccountBtn || createAccountBtn.disabled) {
    return;
  }

  const full_name = fullNameInput.value;
  const email = emailInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!full_name || !email || !password || !confirmPassword) {
    showNotification("Please fill in all fields.", 'error');
    return;
  }

  if (password !== confirmPassword) {
    showNotification("Passwords do not match.", 'error');
    return;
  }

  try {
    await loadingManager.executeWithLoading(createAccountBtn, async () => {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: full_name, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Signup failed");
      }

      const data = await response.json();
      showNotification("Account created successfully. Please sign in.", 'success');
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    });
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
    console.error("Signup error:", error);
  }
});

backToSignin.addEventListener("click", () => {
  window.location.href = "login.html";
});