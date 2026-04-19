const createAccountBtn = document.getElementById("createAccountBtn");
const backToSignin = document.getElementById("backToSignin");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

createAccountBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const full_name = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  //  1. Empty fields check
  if (!full_name || !email || !password || !confirmPassword) {
    showNotification("Please fill in all fields.", 'error');
    return;
  }

  //  2. Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Enter a valid email address.");
    return;
  }

  // 3. Password length validation
  if (password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  //  4. Strong password (letter + number)
  const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
  if (!strongPassword.test(password)) {
    alert("Password must contain at least one letter and one number.");
    return;
  }

  //  5. Confirm password match
  if (password !== confirmPassword) {
    showNotification("Passwords do not match.", 'error');
    return;
  }

  // 6. API call
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

    alert("Account created successfully. Please sign in.");
    window.location.href = "login.html";

  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
    console.error("Signup error:", error);
  }
});

backToSignin.addEventListener("click", () => {
  window.location.href = "login.html";
});