const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", function () {
    mainNav.classList.toggle("is-open");
  });
}

(function () {
  function getMainScript() {
    return Array.from(document.querySelectorAll("script[src]")).find(function (script) {
      return script.src.includes("/js/main.js");
    });
  }

  function