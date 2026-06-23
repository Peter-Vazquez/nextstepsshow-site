(function () {
  const guestsPerPage = 12;
  const rawGuestData = window.NSRPN_PAST_GUESTS_TSV || "";

  const guests = rawGuestData
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      return {
        name: parts[0] || "",
        description: parts.slice(1).join(" ") || "Past guest on The Next Steps Show."
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

  function renderGuestCard(guest) {
    return `
          <article class="guest-card">
            <h4>${escapeHtml(guest.name)}</h4>
            <p>${escapeHtml(guest.description)}</p>
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