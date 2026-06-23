(function () {
  const guestsPerPage = 12;
  const rawGuestData = window.NSRPN_PAST_GUESTS_TSV || "";
  const guestImageMap = {
    "Joseph Hernandez": "Joseph-Hernandez.jpg",
    "Ian Trottier": "Ian-Trottier.jpg"
  };

  function getAssetRoot() {
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const archiveScript = scripts.find(function (script) {
      return script.src.includes("/js/guest-archive.js");
    });

    if (!archiveScript) {
      return "";
    }

    return archiveScript.src.replace(/js\/guest-archive\.js(?:\?.*)?$/, "");
  }

  const assetRoot = getAssetRoot();

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

  function extractEpisodeTitle(description) {
    const marker = "Appeared for:";

    if (!description || !description.includes(marker)) {
      return "";
    }

    const title = description.split(marker).slice(1).join(marker).trim();

    if (!title) {
      return "";
    }

    return title.replace(/\.$/, "");
  }

  function buildEpisodeLink(description, explicitLink) {
    if (explicitLink) {
      return explicitLink;
    }

    const episodeTitle = extractEpisodeTitle(description);
    const episodeSlug = slugify(episodeTitle);

    if (!episodeSlug) {
      return "";
    }

    return `${assetRoot}episodes/${episodeSlug}/`;
  }

  function buildEpisodeLabel(description, explicitLabel) {
    if (explicitLabel) {
      return explicitLabel;
    }

    return extractEpisodeTitle(description) || "Listen to Episode";
  }

  const guests = rawGuestData
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const name = parts[0] || "";
      const description = parts[1] || "Past guest on The Next Steps Show.";
      const image = parts[2] || guestImageMap[name] || "";
      const episodeLink = buildEpisodeLink(description, parts[3] || "");
      const episodeLabel = buildEpisodeLabel(description, parts[4] || "");

      return {
        name,
        description,
        image,
        episodeLink,
        episodeLabel
      };
    })
    .filter((guest) => guest.name);

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildImageSrc(filename) {
    if (!filename) {
      return "";
    }

    if (/^https?:\/\//i.test(filename)) {
      return filename;
    }

    const cleanFilename = String(filename).replace(/^\/+/, "");
    const encodedFilename = cleanFilename.split("/").map(encodeURIComponent).join("/");

    return `${assetRoot}images/guests/${encodedFilename}`;
  }

  function renderGuestCard(guest) {
    const imageSrc = buildImageSrc(guest.image);
    const imageHtml = imageSrc
      ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(guest.name)}" style="width:100%;aspect-ratio:1 / 1;object-fit:cover;border-radius:8px;margin-bottom:18px;">`
      : "";
    const episodeHtml = guest.episodeLink
      ? `<p><a class="episode-card-link" href="${escapeHtml(guest.episodeLink)}">Listen to Episode</a></p>`
      : "";

    return `
          <article class="guest-card">
            ${imageHtml}
            <h4>${escapeHtml(guest.name)}</h4>
            <p>${escapeHtml(guest.description)}</p>
            ${episodeHtml}
          </article>`;
  }

  function renderRecentGuests() {
    const grid = document.getElementById("recentGuestGrid");
    const summary = document.getElementById("recentGuestSummary");

    if (!grid) {
      return;
    }

    const recentGuests = guests.slice(0, guestsPerPage);

    if (summary) {
      summary.textContent = `Showing the ${recentGuests.length} most recent guests from the archive.`;
    }

    grid.innerHTML = recentGuests.map(renderGuestCard).join("\n");
  }

  function getCurrentPage(totalPages) {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = Number(params.get("page") || "1");

    if (!Number.isFinite(requestedPage) || requestedPage < 1) {
      return 1;
    }

    return Math.min(Math.floor(requestedPage), totalPages);
  }

  function renderPagination(currentPage, totalPages) {
    const pagination = document.getElementById("guestArchivePagination");

    if (!pagination) {
      return;
    }

    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    let links = "";

    if (currentPage > 1) {
      links += `<a href="?page=${currentPage - 1}">Previous</a>`;
    }

    for (let page = 1; page <= totalPages; page += 1) {
      if (page === currentPage) {
        links += `<span class="current-page">${page}</span>`;
      } else {
        links += `<a href="?page=${page}">${page}</a>`;
      }
    }

    if (currentPage < totalPages) {
      links += `<a href="?page=${currentPage + 1}">Next</a>`;
    }

    pagination.innerHTML = links;
  }

  function renderGuestArchive() {
    const grid = document.getElementById("guestArchiveGrid");
    const summary = document.getElementById("guestArchiveSummary");

    if (!grid || !summary) {
      return;
    }

    if (!guests.length) {
      summary.textContent = "The guest archive could not be loaded.";
      grid.innerHTML = `
          <article class="guest-card guest-card-muted">
            <h4>Guest Archive Unavailable</h4>
            <p>Please refresh the page or check back soon.</p>
          </article>`;
      return;
    }

    const totalGuests = guests.length;
    const totalPages = Math.max(1, Math.ceil(totalGuests / guestsPerPage));
    const currentPage = getCurrentPage(totalPages);
    const start = (currentPage - 1) * guestsPerPage;
    const pageGuests = guests.slice(start, start + guestsPerPage);

    summary.textContent = `${totalGuests} past guests. Showing page ${currentPage} of ${totalPages}.`;
    grid.innerHTML = pageGuests.map(renderGuestCard).join("\n");
    renderPagination(currentPage, totalPages);
  }

  renderRecentGuests();
  renderGuestArchive();
}());