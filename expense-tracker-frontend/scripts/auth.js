function showSignup() {
  document.getElementById("signin").style.display = "none";
  document.getElementById("signup").style.display = "block";
}

function showSignin() {
  document.getElementById("signup").style.display = "none";
  document.getElementById("signin").style.display = "block";
}

function goApp() {
  if (!requireAuth()) {
    return;
  }

  document.getElementById("authPage").style.display = "none";
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(page).style.display = "block";

  document.querySelectorAll(".nav div").forEach(n => n.classList.remove("active"));
  document.getElementById("nav" + capitalize(page)).classList.add("active");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) {
    return;
  }

  goApp();
  showPage("dashboard");

function showSignin() {
  document.getElementById("signup").style.display = "none";
  document.getElementById("signin").style.display = "block";
}


});
