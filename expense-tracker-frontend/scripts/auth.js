// elements
const loginBox = document.getElementById("login-box");
const signupBox = document.getElementById("signup-box");

const goSignup = document.getElementById("goSignup");
const goLogin = document.getElementById("goLogin");

// signup
goSignup.addEventListener("click", () => {
    loginBox.classList.add("hidden");
    signupBox.classList.remove("hidden");
});

// login
goLogin.addEventListener("click", () => {
    signupBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
});