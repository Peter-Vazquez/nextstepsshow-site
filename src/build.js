const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const episodesDir = path.join(publicDir, "episodes");
const siteConfigPath = path.join(__dirname, "data", "site.json");

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

function getRssTextField(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && "#text" in value) {
    return value["#text"];
  }

  return String(value);
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
        <span class="logo-main">${escapeHtml(site.siteName)}</span>
        <span class="logo-sub">With ${escapeHtml(site.hostName)}</span>
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
        <a href="${activePathPrefix}contact/">Contact</a>
        <a href="${activePathPrefix}advertise/">Sponsor Us</a>
      </nav>

    </div>
  </header>`;
}

function pageFooter(activePathPrefix = "../") {
  return `
  <footer class="site-footer">
    <div class="container footer-grid">

      <div>
        <h2>${escapeHtml(site.siteName)}</h2>
        <p>
          Faith, politics, entrepreneurship, leadership, and cultural commentary for people ready to move forward with purpose.
        </p>
      </div>

      <div>
        <h3>Explore</h3>
        <nav class="footer-nav">
          <a href="${activePathPrefix}episodes/">Pods</a>
          <a href="${activePathPrefix}videos/">Vids</a>
          <a href="${activePathPrefix}mission/">Mission</a>
          <a href="${activePathPrefix}guest/">Guest</a>
          <a href="${activePathPrefix}reviews/">Reviews</a>
          <a href="${activePathPrefix}sponsors/">Sponsors</a>
        </nav>
      </div>

      <div>
        <h3>Contact</h3>
        <p>Sponsor the show:</p>
        <p>${escapeHtml(site.phoneSponsor)}</p>
        <p>${escapeHtml(site.phonePrimary)}</p>
      </div>

    </div>

    <div class="container footer-bottom">
      <p>&copy; ${escapeHtml(site.copyrightYear)} ${escapeHtml(site.siteName)}. All rights reserved.</p>
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

function generateEpisodesIndex(episodes) {
  const latestEpisodes = episodes.map((episode) => episodeCard(episode, "../")).join("\n");

  const body = `
${pageHeader("../")}

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
          This page is generated from the Podbean RSS feed. New episodes can be added automatically when the site rebuilds.
        </p>

        <p>
          Podbean remains the podcast host. This website reads the feed and presents the episodes in a custom layout.
        </p>

      </div>
    </section>

    <section class="featured-section">
      <div class="container">

        <div class="section-heading">
          <p class="eyebrow">Recent Conversations</p>
          <h2>Latest Episodes</h2>
          <p>
            Browse the latest episodes from the podcast archive.
          </p>
        </div>

        <div class="episode-grid">
${latestEpisodes}
        </div>

      </div>
    </section>

  </main>

${pageFooter("../")}
`;

  return baseHtml({
    title: `Pods | ${site.siteName}`,
    description: `Listen to podcast episodes of ${site.siteName} with ${site.hostName}.`,
    cssPath: "../css/styles.css",
    jsPath: "../js/main.js",
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
              ${escapeHtml(stripHtml(episode.description))}
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

      return {
        title,
        slug,
        description,
        excerpt: truncateText(description, 220),
        date: item.pubDate || "",
        dateDisplay: formatDate(item.pubDate),
        duration: getRssTextField(item["itunes:duration"]),
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

  const episodesIndexHtml = generateEpisodesIndex(episodes);
  fs.writeFileSync(path.join(episodesDir, "index.html"), episodesIndexHtml, "utf8");

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