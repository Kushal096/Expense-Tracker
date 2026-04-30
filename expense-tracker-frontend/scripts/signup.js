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

  const full_name = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!full_name || !email || !password || !confirmPassword) {
    showNotification("Please fill in all fields.", 'error');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showNotification("Enter a valid email address.", 'error');
    return;
  }

  if (password.length < 6) {
    showNotification("Password must be at least 6 characters long.", 'error');
    return;
  }

  const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
  if (!strongPassword.test(password)) {
    showNotification("Password must contain at least one letter and one number.", 'error');
    return;
  }

  if (password !== confirmPassword) {
    showNotification("Passwords do not match.", 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: full_name,
        email: email,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Signup failed");
    }

    await response.json();

    showNotification("Account created successfully. Please sign in.", 'success');
    window.location.href = "login.html";

  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
    console.error("Signup error:", error);
  }
});

backToSignin.addEventListener("click", () => {
  window.location.href = "login.html";
});