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
    const mainScript = scripts.find(function (script) {
      return script.src.includes("/js/main.js");
    });

    if (!mainScript) {
      return null;
    }

    return mainScript.src.replace(/main\.js(?:\?.*)?$/, "");
  }

  function enhanceGuestRoster() {
    const roster = document.getElementById("guest-roster");

    if (!roster) {
      return;
    }

    const container = roster.querySelector(".container");
    const heading = roster.querySelector(".section-heading h2");
    const intro = roster.querySelector(".section-heading p:last-child");
    const groups = Array.from(roster.querySelectorAll(".guest-roster-group"));

    if (heading) {
      heading.textContent = "Upcoming Conversations and Recent Guests";
    }

    if (intro) {
      intro.textContent = "Confirmed upcoming guests will appear here once approved for public promotion. Recent guests are shown below, with the full past guest archive available separately.";
    }

    if (!container || groups.length < 2) {
      return;
    }

    const recentGroup = groups[1];
    recentGroup.innerHTML = `
        <h3>Recent Guests</h3>
        <p id="recentGuestSummary">Loading recent guests...</p>

        <div class="guest-card-grid" id="recentGuestGrid">
          <article class="guest-card guest-card-muted">
            <h4>Loading Recent Guests</h4>
            <p>The recent guest list is loading.</p>
          </article>
        </div>

        <div class="platform-review-cta">
          <a href="past/" class="button primary">View All Past Guests</a>
        </div>`;

    groups.slice(2).forEach(function (group) {
      group.remove();
    });

    const base = getMainScriptBase();

    if (!base) {
      return;
    }

    loadScript(base + "guest-archive-data.js")
      .then(function () {
        return loadScript(base + "guest-archive.js");
      })
      .catch(function () {
        const summary = document.getElementById("recentGuestSummary");

        if (summary) {
          summary.textContent = "Recent guests could not be loaded.";
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceGuestRoster);
  } else {
    enhanceGuestRoster();
  }
}());