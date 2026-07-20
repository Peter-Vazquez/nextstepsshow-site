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

      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function getMainScriptBase() {
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const