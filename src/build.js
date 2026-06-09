const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const episodesDir = path.join(publicDir, "episodes");
const siteConfigPath = path.join(__dirname, "data", "site.json");

const EPISODES_PER_PAGE = 24;

const site = JSON.parse(fs.readFileSync(siteConfigPath, "utf8"));

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function escapeHtml(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtml(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, limit = 220) {
  const text = stripHtml(value);

  if (text.length <= limit) {
    return text;
  }

  return text.slice(0, limit).trim() + "...";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
function formatDuration(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const rawValue = String(value).trim();

  if (rawValue.includes(":")) {
    return rawValue;
  }

  const totalSeconds = Number(rawValue);

  if (!Number.isFinite(totalSeconds)) {
    return rawValue;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

function getRssTextField(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getRssTextField).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    const preferredTextKeys = ["#text", "__cdata", "_cdata", "text", "_text"];

    for (const key of preferredTextKeys) {
      if (key in value) {
        return getRssTextField(value[key]);
      }
    }

    return Object.entries(value)
      .filter(([key]) => !key.startsWith("@") && key !== "href" && key !== "url")
      .map(([, nestedValue]) => getRssTextField(nestedValue))
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function getEpisodeDescription(item) {
  return (
    getRssTextField(item["content:encoded"]) ||
    getRssTextField(item.description) ||
    getRssTextField(item["itunes:summary"]) ||
    ""
  );
}

function getEpisodeImage(item, channelImage) {
  if (item["itunes:image"] && item["itunes:image"].href) {
    return item["itunes:image"].href;
  }

  if (item.image && item.image.url) {
    return item.image.url;
  }

  return channelImage || "";
}

function getEpisodeAudio(item) {
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  return "";
}

function getChannelImage(channel) {
  if (channel["itunes:image"] && channel["itunes:image"].href) {
    return channel["itunes:image"].href;
  }

  if (channel.image && channel.image.url) {
    return channel.image.url;
  }

  return "";
}

function pageHeader(activePathPrefix = "../") {
  return `
  <header class="site-header">
    <div class="container header-inner">

      <a href="${activePathPrefix}" class="site-logo">
        <img src="${activePathPrefix}images/site-logo.png?v=2" alt="${escapeHtml(site.siteName)} logo" class="site-logo-img">
      </a>

      <button class="menu-toggle" id="menuToggle" aria-label="Open navigation">
        Menu
      </button>

      <nav class="main-nav" id="mainNav">
        <a href="${activePathPrefix}">Home</a>
        <a href="${activePathPrefix}mission/">Mission</a>
        <a href="${activePathPrefix}episodes/">Pods</a>
        <a href="${activePathPrefix}videos/">Vids</a>
        <a href="${activePathPrefix}blog/">Blog</a>
        <a href="${activePathPrefix}guest/">Guest</a>
        <a href="${activePathPrefix}nsrpn-online-radio/">NSRPN Online Radio</a>
        <a href="${escapeHtml(site.wyslLiveStream)}" target="_blank" rel="noopener">WYSL Live Stream</a>
        <a href="${activePathPrefix}contact/">Contact</a>
        <a href="${activePathPrefix}advertise/">Sponsor Us</a>
      </nav>

    </div>
  </header>`;
}

function pageFooter(activePathPrefix = "../") {
  const copyrightYear = site.copyrightYear || new Date().getFullYear();

  return `
  <footer class="site-footer">
    <div class="container footer-grid">

      <div class="footer-brand">
        <img src="${activePathPrefix}images/site-logo.png?v=2" alt="${escapeHtml(site.siteName)} logo" class="footer-logo">
        <p>
          ${escapeHtml(site.description)}
        </p>
      </div>

      <div>
        <h3 class="footer-heading">Explore</h3>
        <div class="footer-links">
          <a href="${activePathPrefix}">Home</a>
          <a href="${activePathPrefix}mission/">Mission</a>
          <a href="${activePathPrefix}episodes/">Pods</a>
          <a href="${activePathPrefix}videos/">Vids</a>
          <a href="${activePathPrefix}blog/">Blog</a>
          <a href="${activePathPrefix}guest/">Guest</a>
          <a href="${activePathPrefix}contact/">Contact</a>
          <a href="${activePathPrefix}advertise/">Sponsor Us</a>
        </div>
      </div>

      <div>
        <h3 class="footer-heading">Listen Live</h3>
        <p>${escapeHtml(site.liveSchedule || "Listen live, Monday through Friday at noon.")}</p>
        <p class="footer-stations">
          ${escapeHtml(site.stationLine || "WYSL 92.1 FM | 95.5 FM | 1040 AM")}
        </p>
        <a href="${escapeHtml(site.wyslLiveStream)}" target="_blank" rel="noopener" class="footer-button">
          WYSL Live Stream
        </a>
      </div>

      <div>
        <h3 class="footer-heading">Join the Conversation</h3>
        <p>
          Call in:<br>
          <a href="tel:15853463000">${escapeHtml(site.callInLocal || "(585) 346-3000")}</a>
        </p>
        <p>
          Toll-free:<br>
          <a href="tel:18665521009">${escapeHtml(site.callInTollFree || "(866) 552-1009")}</a>
        </p>
        <p>
          Text Peter:<br>
          <a href="sms:15858807580">${escapeHtml(site.textLine || "(585) 880-7580")}</a>
        </p>
      </div>

    </div>

    <div class="container footer-bottom">
      <p>&copy; ${escapeHtml(String(copyrightYear))} ${escapeHtml(site.siteName)}. All rights reserved.</p>
    </div>
  </footer>`;
}

function baseHtml({ title, description, cssPath, jsPath, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${escapeHtml(title)}</title>

  <meta name="description" content="${escapeHtml(description)}">

  <link rel="stylesheet" href="${cssPath}">
</head>

<body>

${body}

  <script src="${jsPath}"></script>
</body>
</html>
`;
}

function episodeCard(episode, prefix = "../") {
  const imageHtml = episode.image
    ? `<img class="episode-card-image" src="${escapeHtml(episode.image)}" alt="${escapeHtml(episode.title)} artwork">`
    : `<div class="episode-image placeholder-image">Episode Artwork</div>`;

  return `
          <article class="episode-card">
            ${imageHtml}

            <div class="episode-content">
              <p class="episode-date">${escapeHtml(episode.dateDisplay)}</p>
              <h3>${escapeHtml(episode.title)}</h3>
              <p>
                ${escapeHtml(episode.excerpt)}
              </p>
              <a href="${prefix}episodes/${escapeHtml(episode.slug)}/">Listen to the Episode</a>
            </div>
          </article>`;
}

function getEpisodeArchiveUrl(pageNumber, siteRootPrefix) {
  if (pageNumber <= 1) {
    return `${siteRootPrefix}episodes/`;
  }

  return `${siteRootPrefix}episodes/page/${pageNumber}/`;
}

function generatePagination(currentPage, totalPages, siteRootPrefix) {
  if (totalPages <= 1) {
    return "";
  }

  let pageLinks = "";

  if (currentPage > 1) {
    pageLinks += `<a href="${getEpisodeArchiveUrl(currentPage - 1, siteRootPrefix)}">Previous</a>`;
  }

  for (let page = 1; page <= totalPages; page++) {
    if (page === currentPage) {
      pageLinks += `<span class="current-page">${page}</span>`;
    } else {
      pageLinks += `<a href="${getEpisodeArchiveUrl(page, siteRootPrefix)}">${page}</a>`;
    }
  }

  if (currentPage < totalPages) {
    pageLinks += `<a href="${getEpisodeArchiveUrl(currentPage + 1, siteRootPrefix)}">Next</a>`;
  }

  return `
        <nav class="pagination" aria-label="Episode archive pagination">
          ${pageLinks}
        </nav>`;
}

function generateEpisodesIndex({
  episodes,
  currentPage = 1,
  totalPages = 1,
  siteRootPrefix = "../",
  cssPath = "../css/styles.css",
  jsPath = "../js/main.js"
}) {
  const startIndex = (currentPage - 1) * EPISODES_PER_PAGE;
  const pageEpisodes = episodes.slice(startIndex, startIndex + EPISODES_PER_PAGE);

  const latestEpisodes = pageEpisodes
    .map((episode) => episodeCard(episode, siteRootPrefix))
    .join("\n");

  const pagination = generatePagination(currentPage, totalPages, siteRootPrefix);

  const pageTitle = currentPage === 1
    ? `Pods | ${site.siteName}`
    : `Pods Page ${currentPage} | ${site.siteName}`;

  const body = `
${pageHeader(siteRootPrefix)}

  <main>

    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Podcast Archive</p>
        <h1>Pods</h1>
        <p>
          Listen to recent episodes of ${escapeHtml(site.siteName)} featuring conversations on faith, politics, entrepreneurship, leadership, family, culture, and civic responsibility.
        </p>
      </div>
    </section>

    <section class="content-section">
      <div class="container content-narrow">

        <h2>Podcast Episodes</h2>

        <p>
          Explore recent conversations from The Next Steps Show, featuring thoughtful interviews, timely commentary, and practical insight on the issues shaping families, communities, businesses, and civic life.
        </p>

        <p>
          Browse the archive below to catch up on past episodes, revisit important conversations, and share programs with others.
        </p>

      </div>
    </section>

    <section class="featured-section">
      <div class="container">

        <div class="section-heading">
          <p class="eyebrow">Recent Conversations</p>
          <h2>Latest Episodes</h2>
          <p>
            Page ${currentPage} of ${totalPages}
          </p>
        </div>

        <div class="episode-grid">
${latestEpisodes}
        </div>

${pagination}

      </div>
    </section>

  </main>

${pageFooter(siteRootPrefix)}
`;

  return baseHtml({
    title: pageTitle,
    description: `Listen to podcast episodes of ${site.siteName} with ${site.hostName}.`,
    cssPath,
    jsPath,
    body
  });
}
function generateHomePage(episodes) {
  const featuredEpisodes = episodes.slice(0, 3);
  const latestEpisodeCards = featuredEpisodes
    .map((episode) => episodeCard(episode, "./"))
    .join("\n");

  const platformLinks = [
  ["Apple Podcasts", site.platforms?.apple],
  ["Spotify", site.platforms?.spotify],
  ["iHeartRadio", site.platforms?.iheartradio],
  ["Amazon Music", site.platforms?.amazon],
  ["Podbean", site.platforms?.podbean],
  ["RSS Feed", site.platforms?.rss]
]
  .filter(([, url]) => url && url !== "#")
  .map(([label, url]) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  })
  .join("\n          ");

  const body = `
${pageHeader("./")}

  <main>

    <section class="hero">
      <div class="container hero-content">

        <p class="eyebrow">${escapeHtml(site.tagline)}</p>

        <h1>${escapeHtml(site.siteName)}</h1>

        <p class="hero-text">
          ${escapeHtml(site.description)}
        </p>

        <div class="hero-actions">
          <a href="episodes/" class="button primary">Listen to Episodes</a>
          <a href="advertise/" class="button secondary">Sponsor the Show</a>
        </div>

      </div>
    </section>

    <section class="intro-section">
      <div class="container intro-grid">

        <div>
          <h2>Conversations That Move People Forward</h2>

          <p>
            ${escapeHtml(site.siteName)} with ${escapeHtml(site.hostName)} brings together voices from politics, faith,
  			business, culture, and community leadership for conversations that reach beyond the
  			headlines and into the places where life is actually lived: around kitchen tables,
  			in church pews, inside classrooms, across shop floors, and throughout the neighborhoods
   			we call home. Each episode looks at the issues shaping families, communities, churches,
  			schools, businesses, and the future of our country, with a steady focus on truth,
  			responsibility, and what comes next.
          </p>

          <p>
            The show is built on a simple idea: talk plainly, think clearly, and take the next right step.
          </p>
        </div>

        <aside class="broadcast-card">
  <h3>Listen on Radio</h3>

  <p>
    Catch The Next Steps Show through the WYSL | WLEA Voice of Liberty Network,
    live Monday through Friday at noon.
  </p>

  <ul>
    <li><strong>WYSL:</strong> 92.1 FM, 95.5 FM, 1040 AM</li>
    <li><strong>WLEA:</strong> 1480 AM, 106.9 FM, 92.1 FM</li>
  </ul>

  <p>
    Tune in for conversations on faith, politics, leadership, business, culture,
    family, and the issues shaping our communities.
  </p>

  <a href="${escapeHtml(site.wyslLiveStream)}" class="button primary" target="_blank" rel="noopener">
    Listen Live
  </a>
</aside>

      </div>
    </section>
    <section class="live-section">
      <div class="container live-grid">

        <div>
          <p class="eyebrow">Listen Live</p>
          <h2>Join the Conversation</h2>

          <p>
            Call in, challenge, and participate. Share your story, questions, and perspective live on The Next Steps Show.
          </p>

          <p>
            ${escapeHtml(site.liveSchedule)}
          </p>

          <p class="station-line">
            ${escapeHtml(site.stationLine)}
          </p>
        </div>

        <div class="live-card">
          <h3>Call or Text the Show</h3>

          <p>
            Call in: <strong>${escapeHtml(site.callInLocal)}</strong>
          </p>

          <p>
            Toll-free: <strong>${escapeHtml(site.callInTollFree)}</strong>
          </p>

          <p>
            Text Peter: <strong>${escapeHtml(site.textLine)}</strong>
          </p>

          <div class="live-actions">
            <a href="${escapeHtml(site.wyslLiveStream)}" class="button primary" target="_blank" rel="noopener">Listen Live</a>
            <a href="tel:15853463000" class="button secondary">Call the Show</a>
          </div>
        </div>

      </div>
    </section>
    <section class="featured-section">
      <div class="container">

        <div class="section-heading">
          <p class="eyebrow">Recent Conversations</p>
          <h2>Latest Episodes</h2>
          <p>
            Listen to the latest conversations from The Next Steps Show.
          </p>
        </div>

        <div class="episode-grid">
${latestEpisodeCards}
        </div>

      </div>
    </section>

    <section class="platform-section">
      <div class="container">

        <div class="section-heading">
          <p class="eyebrow">Subscribe</p>
          <h2>Listen Wherever You Get Podcasts</h2>
        </div>

        <div class="platform-links">
          ${platformLinks}
        </div>

      </div>
    </section>

    <section class="sponsor-section">
      <div class="container sponsor-box">

        <div>
          <p class="eyebrow">Partner With The Show</p>
          <h2>Reach an Engaged Audience</h2>

          <p>
            Sponsor ${escapeHtml(site.siteName)} and connect your business, campaign, organization, or mission with listeners who care about faith, family, freedom, enterprise, and civic life.
          </p>
        </div>

        <a href="advertise/" class="button primary">Become a Sponsor</a>

      </div>
    </section>

  </main>

${pageFooter("./")}
`;

  return baseHtml({
    title: `${site.siteName} | Faith, Politics & Entrepreneurship`,
    description: site.description,
    cssPath: "css/styles.css",
    jsPath: "js/main.js",
    body
  });
}
function generateEpisodePage(episode) {
  const audioHtml = episode.audio
    ? `
          <audio controls preload="metadata" class="audio-player">
            <source src="${escapeHtml(episode.audio)}" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>`
    : "";

  const imageHtml = episode.image
    ? `<img class="episode-detail-artwork" src="${escapeHtml(episode.image)}" alt="${escapeHtml(episode.title)} artwork">`
    : `<div class="episode-image placeholder-image">Episode Artwork</div>`;

  const body = `
${pageHeader("../../")}

  <main>

    <section class="episode-detail">
      <div class="container episode-detail-grid">

        <div>
          ${imageHtml}
        </div>

        <div>
          <p class="episode-date">${escapeHtml(episode.dateDisplay)}</p>

          <h1>${escapeHtml(episode.title)}</h1>

          ${episode.duration ? `<p class="episode-duration">Duration: ${escapeHtml(episode.duration)}</p>` : ""}

          ${audioHtml}

          <div class="episode-description">
            <p>
              ${escapeHtml(episode.descriptionText)}
            </p>
          </div>

          <a class="button primary" href="../">Back to All Episodes</a>
        </div>

      </div>
    </section>

  </main>

${pageFooter("../../")}
`;

  return baseHtml({
    title: `${episode.title} | ${site.siteName}`,
    description: episode.excerpt,
    cssPath: "../../css/styles.css",
    jsPath: "../../js/main.js",
    body
  });
}
function parseEpisodesFromRss(rssText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "#text",
    cdataPropName: "#text"
  });

  const parsed = parser.parse(rssText);

  if (!parsed.rss || !parsed.rss.channel) {
    throw new Error("RSS feed structure was not recognized.");
  }

  const channel = parsed.rss.channel;
  const channelImage = getChannelImage(channel);

  const items = Array.isArray(channel.item) ? channel.item : [channel.item];

  return items
    .filter(Boolean)
    .map((item, index) => {
      const title = getRssTextField(item.title) || `Episode ${index + 1}`;
      const description = getEpisodeDescription(item);
      const slugBase = slugify(title);
      const slug = slugBase || `episode-${index + 1}`;

            const descriptionText = stripHtml(getRssTextField(description));

      return {
        title,
        slug,
        description,
        descriptionText,
        excerpt: truncateText(descriptionText, 220),
        date: item.pubDate || "",
        dateDisplay: formatDate(item.pubDate),
        duration: formatDuration(getRssTextField(item["itunes:duration"])),
        image: getEpisodeImage(item, channelImage),
        audio: getEpisodeAudio(item),
        link: getRssTextField(item.link),
        guid: getRssTextField(item.guid)
      };
    });
}

async function fetchRssFeed() {
  if (!site.rssFeedUrl || site.rssFeedUrl.includes("PASTE_YOUR")) {
    throw new Error("Missing RSS feed URL in src/data/site.json.");
  }

  const response = await fetch(site.rssFeedUrl);

  if (!response.ok) {
    throw new Error(`Could not fetch RSS feed. Status: ${response.status}`);
  }

  return response.text();
}

function cleanGeneratedEpisodePages(episodesDirPath) {
  if (!fs.existsSync(episodesDirPath)) {
    return;
  }

  const entries = fs.readdirSync(episodesDirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(episodesDirPath, entry.name);

    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

async function build() {
  console.log("Starting Next Steps Show site build...");

  ensureDir(episodesDir);

  const rssText = await fetchRssFeed();
  const episodes = parseEpisodesFromRss(rssText);

  if (!episodes.length) {
    throw new Error("No episodes were found in the RSS feed.");
  }

  cleanGeneratedEpisodePages(episodesDir);

  const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);

const episodesIndexHtml = generateEpisodesIndex({
  episodes,
  currentPage: 1,
  totalPages,
  siteRootPrefix: "../",
  cssPath: "../css/styles.css",
  jsPath: "../js/main.js"
});

fs.writeFileSync(path.join(episodesDir, "index.html"), episodesIndexHtml, "utf8");

for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
  const pageDir = path.join(episodesDir, "page", String(pageNumber));
  ensureDir(pageDir);

  const pageHtml = generateEpisodesIndex({
    episodes,
    currentPage: pageNumber,
    totalPages,
    siteRootPrefix: "../../../",
    cssPath: "../../../css/styles.css",
    jsPath: "../../../js/main.js"
  });

  fs.writeFileSync(path.join(pageDir, "index.html"), pageHtml, "utf8");
}

  const homePageHtml = generateHomePage(episodes);
  fs.writeFileSync(path.join(publicDir, "index.html"), homePageHtml, "utf8");

  for (const episode of episodes) {
    const episodeDir = path.join(episodesDir, episode.slug);
    ensureDir(episodeDir);

    const episodeHtml = generateEpisodePage(episode);
    fs.writeFileSync(path.join(episodeDir, "index.html"), episodeHtml, "utf8");
  }

  console.log(`Built ${episodes.length} episode pages.`);
  console.log("Build complete.");
}

build().catch((error) => {
  console.error("Build failed:");
  console.error(error.message);
  process.exit(1);
});