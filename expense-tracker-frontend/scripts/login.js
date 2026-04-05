const signinBtn = document.getElementById("signinBtn");
const createAccountLink = document.getElementById("createAccountLink");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

signinBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
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
    window.location.href = "dashboard.html";
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

createAccountLink.addEventListener("click", () => {
  window.location.href = "signup.html";
});