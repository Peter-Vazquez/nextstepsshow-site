(function () {
  const searchInput = document.getElementById("siteSearchInput");
  const searchForm = document.getElementById("siteSearchForm");
  const searchStatus = document.getElementById("siteSearchStatus");
  const searchResults = document.getElementById("siteSearchResults");
  const rawGuestData = window.NSRPN_PAST_GUESTS_TSV || "";
  const seedIndex = window.NSRPN_SITE_SEARCH_INDEX || [];
  const rssFeedUrl = "https://feed.podbean.com/nextstepsshow/feed.xml";
  let searchIndexPromise = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getAssetRoot() {
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const searchScript = scripts.find(function (script) {
      return script.src.includes("/js/site-search.js");
    });

    if (!searchScript) {
      return `${window.location.origin}/`;
    }

    return searchScript.src.replace(/js\/site-search\.js(?:\?.*)?$/, "");
  }

  const assetRoot = getAssetRoot();

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 90);
  }

  function trimText(value, limit) {
    const clean = String(value || "").replace(/\s+/g, " ").trim();

    if (clean.length <= limit) {
      return clean;
    }

    return `${clean.slice(0, limit - 3).trim()}...`;
  }

  function absoluteSiteUrl(path) {
    if (!path) {
      return assetRoot;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${assetRoot}${String(path).replace(/^\/+/, "")}`;
  }

  function parseGuests() {
    return rawGuestData
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("\t");
        const name = parts[0] || "";
        const description = parts[1] || "Past guest on The Next Steps Show.";

        return {
          title: name,
          type: "Guest",
          description,
          text: `${name} ${description}`,
          url: `${assetRoot}guest/past/?guest=${encodeURIComponent(name)}`
        };
      })
      .filter((guest) => guest.title);
  }

  function parseSeedIndex() {
    return seedIndex.map((entry) => ({
      title: entry.title || "Untitled",
      type: entry.type || "Page",
      description: entry.description || "",
      text: `${entry.title || ""} ${entry.description || ""}`,
      url: absoluteSiteUrl(entry.url || "")
    }));
  }

  async function parseRssEpisodes() {
    try {
      const response = await fetch(rssFeedUrl);

      if (!response.ok) {
        return [];
      }

      const xmlText = await response.text();
      const doc = new DOMParser().parseFromString(xmlText, "application/xml");
      const items = Array.from(doc.querySelectorAll("item"));

      return items.map((item) => {
        const title = item.querySelector("title")?.textContent || "Episode";
        const description = item.querySelector("description")?.textContent || item.querySelector("summary")?.textContent || "Podcast episode from The Next Steps Show.";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        const slug = slugify(title) || "episodes";

        return {
          title,
          type: "Episode",
          description: trimText(description, 220),
          text: `${title} ${description} ${pubDate}`,
          url: `${assetRoot}episodes/${slug}/`
        };
      });
    } catch (error) {
      return [];
    }
  }

  async function buildSearchIndex() {
    if (searchStatus) {
      searchStatus.textContent = "Building search index...";
    }

    const pages = parseSeedIndex();
    const guests = parseGuests();
    const episodes = await parseRssEpisodes();

    return pages.concat(guests, episodes);
  }

  function scoreEntry(entry, rawQuery) {
    const query = normalize(rawQuery);
    const tokens = query.split(" ").filter((token) => token.length >= 2);
    const title = normalize(entry.title);
    const description = normalize(entry.description);
    const text = normalize(entry.text);

    if (!tokens.length) {
      return 0;
    }

    const haystack = `${title} ${description} ${text}`;
    const fullMatch = haystack.includes(query);
    const tokenMatch = tokens.every((token) => haystack.includes(token));

    if (!fullMatch && !tokenMatch) {
      return 0;
    }

    let score = fullMatch ? 80 : 10;

    tokens.forEach((token) => {
      if (title.includes(token)) {
        score += 25;
      }

      if (description.includes(token)) {
        score += 12;
      }

      if (text.includes(token)) {
        score += 2;
      }
    });

    if (entry.type === "Guest") {
      score += 8;
    }

    if (entry.type === "Episode") {
      score += 6;
    }

    return score;
  }

  function renderResults(entries, query) {
    const scoredResults = entries
      .map((entry) => Object.assign({}, entry, { score: scoreEntry(entry, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);

    if (searchStatus) {
      searchStatus.textContent = scoredResults.length
        ? `${scoredResults.length} result${scoredResults.length === 1 ? "" : "s"} for "${query}".`
        : `No results found for "${query}".`;
    }

    if (!searchResults) {
      return;
    }

    if (!scoredResults.length) {
      searchResults.innerHTML = `
        <div class="search-empty-state">
          <h2>No results found.</h2>
          <p>Try a guest name, episode title, topic, issue, or keyword.</p>
        </div>`;
      return;
    }

    searchResults.innerHTML = scoredResults.map((entry) => `
      <article class="search-result-card">
        <p class="search-result-type">${escapeHtml(entry.type)}</p>
        <h3><a href="${escapeHtml(entry.url)}">${escapeHtml(entry.title)}</a></h3>
        <p>${escapeHtml(trimText(entry.description || entry.text, 220))}</p>
        <a href="${escapeHtml(entry.url)}">Open Result</a>
      </article>`).join("\n");
  }

  async function performSearch(query) {
    const cleanQuery = String(query || "").trim();

    if (!cleanQuery) {
      if (searchStatus) {
        searchStatus.textContent = "Enter a guest name, episode title, topic, or keyword to search the site.";
      }

      if (searchResults) {
        searchResults.innerHTML = "";
      }

      return;
    }

    if (!searchIndexPromise) {
      searchIndexPromise = buildSearchIndex();
    }

    try {
      const index = await searchIndexPromise;
      renderResults(index, cleanQuery);
    } catch (error) {
      if (searchStatus) {
        searchStatus.textContent = "Search could not load. Please refresh the page and try again.";
      }
    }
  }

  if (!searchForm || !searchInput) {
    return;
  }

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    window.history.replaceState({}, "", url.toString());
    performSearch(query);
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q") || "";

  if (initialQuery) {
    searchInput.value = initialQuery;
    performSearch(initialQuery);
  } else if (searchStatus) {
    searchStatus.textContent = "Enter a guest name, episode title, topic, or keyword to search the site.";
  }
}());