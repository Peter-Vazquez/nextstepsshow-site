const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", function () {
    mainNav.classList.toggle("is-open");
  });
}

(function () {
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const existingScript = document.querySelector(`script[src="${src}"]`);

      if (existing