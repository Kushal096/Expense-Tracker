const createAccountBtn = document.getElementById("createAccountBtn");
const backToSignin = document.getElementById("backToSignin");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");


createAccountBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const full_name = fullNameInput.value;
  const email = emailInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!full_name || !email || !password || !confirmPassword) {
    alert("Please fill in all fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
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
    alert("Account created successfully. Please sign in.");
    window.location.href = "login.html";
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

backToSignin.addEventListener("click", () => {
  window.location.href = "login.html";
});