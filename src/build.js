const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const episodesDir = path.join(publicDir, "episodes");
const blogSourceDir = path.join(__dirname, "blog", "posts");
const blogDir = path.join(publicDir, "blog");
const siteConfigPath = path.join(__dirname, "data", "site.json");

const EPISODES_PER_PAGE = 12;

const site = JSON.parse(fs.readFileSync(siteConfigPath, "utf8"));

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});
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

function createCleanExcerpt(value, limit = 180) {
  const text = stripHtml(value);

  if (text.length <= limit) {
    return text;
  }

  const excerpt = text.slice(0, limit).trim();
  const sentenceEnd = Math.max(
    excerpt.lastIndexOf(". "),
    excerpt.lastIndexOf("! "),
    excerpt.lastIndexOf("? ")
  );

  if (sentenceEnd >= 80) {
    return `${excerpt.slice(0, sentenceEnd + 1).trim()}...`;
  }

  return `${excerpt.replace(/[\s,;:.-]+$/, "")}...`;
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function formatEpisodeDescription(value) {
  const rawDescription = getRssTextField(value);

  const text = decodeHtmlEntities(rawDescription)
    .replace(/\r/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    return "<p>Episode details will be available soon.</p>";
  }

  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("\n");
}
function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function normalizeArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveSiteAsset(assetPath, activePathPrefix) {
  if (!assetPath) {
    return "";
  }

  const value = String(assetPath).trim();

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${activePathPrefix}${value.replace(/^\/+/, "")}`;
}

function readBlogPosts() {
  if (!fs.existsSync(blogSourceDir)) {
    return [];
  }

  return fs.readdirSync(blogSourceDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const filePath = path.join(blogSourceDir, fileName);
      const rawFile = fs.readFileSync(filePath, "utf8");
      const parsed = matter(rawFile);
      const data = parsed.data || {};

      const title = data.title ? String(data.title).trim() : fileName.replace(/\.md$/, "");
      const slug = data.slug ? slugify(data.slug) : slugify(title);
      const date = data.date ? String(data.date) : "";
      const contentHtml = markdown.render(parsed.content || "");
      const plainText = stripHtml(contentHtml);

      return {
        title,
        slug,
        date,
        dateDisplay: formatDate(date),
        author: data.author ? String(data.author).trim() : site.hostName || "Peter Vazquez",
        category: data.category ? String(data.category).trim() : "Commentary",
        tags: normalizeArray(data.tags),
        excerpt: data.excerpt ? String(data.excerpt).trim() : truncateText(plainText, 220),
        status: data.status ? String(data.status).trim().toLowerCase() : "published",
        image: data.image ? String(data.image).trim() : "",
        contentHtml
      };
    })
    .filter((post) => post.status === "published")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
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
		  <a href="${activePathPrefix}nsrpn-online-radio/">NSRPN Online Radio</a>
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

function episodeCard(episode, prefix = "../", options = {}) {
  const imageHtml = episode.image
    ? `<img class="episode-card-image" src="${escapeHtml(episode.image)}" alt="${escapeHtml(episode.title)} artwork">`
    : `<div class="episode-image placeholder-image">Episode Artwork</div>`;

  if (options.variant === "archive") {
    const metaItems = [episode.dateDisplay, episode.duration].filter(Boolean);
    const metaHtml = metaItems.length
      ? `<p class="episode-card-meta">${escapeHtml(metaItems.join(" • "))}</p>`
      : "";

    return `
          <article class="episode-card archive-episode-card">
            <a class="archive-episode-artwork" href="${prefix}episodes/${escapeHtml(episode.slug)}/" aria-label="Listen to ${escapeHtml(episode.title)}">
              ${imageHtml}
            </a>

            <div class="episode-content archive-episode-content">
              ${metaHtml}
              <h3><a href="${prefix}episodes/${escapeHtml(episode.slug)}/">${escapeHtml(episode.title)}</a></h3>
              <p class="episode-card-excerpt">
                ${escapeHtml(createCleanExcerpt(episode.descriptionText || episode.excerpt, 180))}
              </p>
              <a class="episode-card-link" href="${prefix}episodes/${escapeHtml(episode.slug)}/">Listen to the Episode</a>
            </div>
          </article>`;
  }

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
    .map((episode) => episodeCard(episode, siteRootPrefix, { variant: "archive" }))
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
<h1>Latest Episodes</h1>
<p>
  Explore conversations from The Next Steps Show with Peter Vazquez, featuring guests,
  commentary, and timely discussions on faith, politics, leadership, business, family,
  culture, community, and the issues shaping everyday life.
</p>
      </div>
    </section>

    <section class="content-section">
      <div class="container content-narrow">

        <h2>Browse the Archive</h2>

        <p>
  Start with the latest conversations, then move through the archive to revisit interviews,
  commentary, and stories that challenge, inform, and encourage listeners to take the next
  right step.
</p>

<p>
  Each episode is part of a larger conversation about faith, leadership, responsibility,
  community, and the future we are building together.
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
function getUniqueBlogTerms(posts, fieldName) {
  const terms = new Map();

  posts.forEach((post) => {
    const values = fieldName === "tags" ? post.tags : [post.category];

    values
      .filter(Boolean)
      .forEach((value) => {
        const label = String(value).trim();
        const slug = slugify(label);

        if (label && slug && !terms.has(slug)) {
          terms.set(slug, label);
        }
      });
  });

  return Array.from(terms.entries())
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function blogTermLinks(posts, activePathPrefix = "../") {
  const categories = getUniqueBlogTerms(posts, "category");
  const tags = getUniqueBlogTerms(posts, "tags");

  if (!categories.length && !tags.length) {
    return "";
  }

  const categoryLinks = categories
    .map((category) => `<a href="${activePathPrefix}blog/category/${escapeHtml(category.slug)}/">${escapeHtml(category.label)}</a>`)
    .join("\n");

  const tagLinks = tags
    .map((tag) => `<a href="${activePathPrefix}blog/tag/${escapeHtml(tag.slug)}/">${escapeHtml(tag.label)}</a>`)
    .join("\n");

  return `
    <section class="blog-taxonomy-section">
      <div class="container blog-taxonomy-grid">

        <div class="blog-taxonomy-card">
          <h2>Browse by Category</h2>
          <div class="blog-taxonomy-links">
${categoryLinks}
          </div>
        </div>

        <div class="blog-taxonomy-card">
          <h2>Browse by Tag</h2>
          <div class="blog-taxonomy-links">
${tagLinks}
          </div>
        </div>

      </div>
    </section>`;
}
function blogPostCard(post, activePathPrefix = "../") {
  const postUrl = `${activePathPrefix}blog/${escapeHtml(post.slug)}/`;
  const imageHtml = post.image
    ? `<img src="${escapeHtml(resolveSiteAsset(post.image, activePathPrefix))}" alt="${escapeHtml(post.title)}">`
    : "";

  return `
          <article class="blog-card">
            ${imageHtml ? `<a class="blog-card-image" href="${postUrl}">${imageHtml}</a>` : ""}

            <div class="blog-card-content">
              <p class="blog-meta">${escapeHtml(post.category)}${post.dateDisplay ? ` • ${escapeHtml(post.dateDisplay)}` : ""}</p>

              <h3>
                <a href="${postUrl}">${escapeHtml(post.title)}</a>
              </h3>

              <p>
                ${escapeHtml(post.excerpt)}
              </p>

              <a class="blog-read-link" href="${postUrl}">Read More</a>
            </div>
          </article>`;
}
function generateBlogIndex(posts) {
  const postCards = posts.length
    ? posts.map((post) => blogPostCard(post, "../")).join("\n")
    : `
          <div class="empty-state">
            <h2>Blog posts are coming soon.</h2>
            <p>Written commentary, show notes, and issue analysis will appear here as new posts are published.</p>
          </div>`;

  const body = `
${pageHeader("../")}

  <main class="blog-page">

    <section class="blog-hero">
      <div class="container blog-hero-inner">
        <p class="eyebrow">The Next Steps Blog</p>

        <h1>Written Commentary, Show Notes, and Issue Analysis</h1>

        <p class="blog-hero-lead">
          Explore written commentary, show notes, video recaps, guest highlights, and issue analysis from The Next Steps Show.
        </p>
      </div>
    </section>
   
${blogTermLinks(posts, "../")}
   
    <section class="blog-list-section">
      <div class="container">

        <div class="section-heading">
          <p class="eyebrow">Latest Posts</p>
          <h2>Read the Latest</h2>
        </div>

        <div class="blog-grid">
${postCards}
        </div>

      </div>
    </section>

  </main>

${pageFooter("../")}
`;

  return baseHtml({
    title: `Blog | ${site.siteName}`,
    description: "Written commentary, show notes, video recaps, guest highlights, and issue analysis from The Next Steps Show.",
    cssPath: "../css/styles.css",
    jsPath: "../js/main.js",
    body
  });
}
function generateBlogArchivePage({ title, description, posts, activePathPrefix, cssPath, jsPath }) {
  const postCards = posts.length
    ? posts.map((post) => blogPostCard(post, activePathPrefix)).join("\n")
    : `
          <div class="empty-state">
            <h2>No posts found.</h2>
            <p>More posts will appear here as new articles are published.</p>
          </div>`;

  const body = `
${pageHeader(activePathPrefix)}

  <main class="blog-page">

    <section class="blog-hero">
      <div class="container blog-hero-inner">
        <p class="eyebrow">The Next Steps Blog</p>

        <h1>${escapeHtml(title)}</h1>

        <p class="blog-hero-lead">
          ${escapeHtml(description)}
        </p>
      </div>
    </section>

    <section class="blog-list-section">
      <div class="container">

        <div class="section-heading">
          <p class="eyebrow">Archive</p>
          <h2>Posts in This Collection</h2>
        </div>

        <div class="blog-grid">
${postCards}
        </div>

        <div class="blog-archive-back">
          <a href="${activePathPrefix}blog/" class="button primary">Back to Blog</a>
        </div>

      </div>
    </section>

  </main>

${pageFooter(activePathPrefix)}
`;

  return baseHtml({
    title: `${title} | ${site.siteName}`,
    description,
    cssPath,
    jsPath,
    body
  });
}
function generateBlogPostPage(post) {
  const tagList = post.tags.length
    ? `
          <div class="blog-post-tags">
            ${post.tags.map((tag) => `<a href="../../blog/tag/${escapeHtml(slugify(tag))}/">${escapeHtml(tag)}</a>`).join("\n")}
          </div>`
    : "";

  const imageHtml = post.image
    ? `<img class="blog-post-image" src="${escapeHtml(resolveSiteAsset(post.image, "../../"))}" alt="${escapeHtml(post.title)}">`
    : "";

  const body = `
${pageHeader("../../")}

  <main class="blog-post-page">

    <article class="blog-post">

      <header class="blog-post-header">
        <div class="container">
          <a class="blog-back-link" href="../">← Back to Blog</a>

          <p class="eyebrow">${escapeHtml(post.category)}</p>

          <h1>${escapeHtml(post.title)}</h1>

          <p class="blog-post-meta">
            ${post.dateDisplay ? `${escapeHtml(post.dateDisplay)} • ` : ""}${escapeHtml(post.author)}
          </p>
        </div>
      </header>

      <div class="container blog-post-layout">
        ${imageHtml}

        <div class="blog-post-content">
          ${post.contentHtml}
        </div>

        ${tagList}

        <a class="button primary" href="../">Back to Blog</a>
      </div>

    </article>

  </main>

${pageFooter("../../")}
`;

  return baseHtml({
    title: `${post.title} | ${site.siteName}`,
    description: post.excerpt,
    cssPath: "../../css/styles.css",
    jsPath: "../../js/main.js",
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

        <div class="episode-detail-media">
          ${imageHtml}
        </div>

        <div class="episode-detail-copy">
          <p class="episode-date">${escapeHtml(episode.dateDisplay)}</p>

          <h1>${escapeHtml(episode.title)}</h1>

          ${episode.duration ? `<p class="episode-duration">Duration: ${escapeHtml(episode.duration)}</p>` : ""}

          ${audioHtml}

          <div class="episode-description">
            <h2>Episode Details</h2>
            ${formatEpisodeDescription(episode.description || episode.descriptionText)}
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
function cleanGeneratedBlogPages(blogDirPath) {
  if (!fs.existsSync(blogDirPath)) {
    return;
  }

  const entries = fs.readdirSync(blogDirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(blogDirPath, entry.name);

    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

function generateBlogTaxonomyPages(posts) {
  const categories = getUniqueBlogTerms(posts, "category");
  const tags = getUniqueBlogTerms(posts, "tags");

  for (const category of categories) {
    const categoryPosts = posts.filter((post) => slugify(post.category) === category.slug);
    const categoryDir = path.join(blogDir, "category", category.slug);

    ensureDir(categoryDir);

    const categoryHtml = generateBlogArchivePage({
      title: `${category.label} Posts`,
      description: `Read posts from The Next Steps Blog filed under ${category.label}.`,
      posts: categoryPosts,
      activePathPrefix: "../../../",
      cssPath: "../../../css/styles.css",
      jsPath: "../../../js/main.js"
    });

    fs.writeFileSync(path.join(categoryDir, "index.html"), categoryHtml, "utf8");
  }

  for (const tag of tags) {
    const tagPosts = posts.filter((post) => post.tags.some((postTag) => slugify(postTag) === tag.slug));
    const tagDir = path.join(blogDir, "tag", tag.slug);

    ensureDir(tagDir);

    const tagHtml = generateBlogArchivePage({
      title: `${tag.label} Posts`,
      description: `Read posts from The Next Steps Blog tagged with ${tag.label}.`,
      posts: tagPosts,
      activePathPrefix: "../../../",
      cssPath: "../../../css/styles.css",
      jsPath: "../../../js/main.js"
    });

    fs.writeFileSync(path.join(tagDir, "index.html"), tagHtml, "utf8");
  }

  console.log(`Built ${categories.length} blog category pages.`);
  console.log(`Built ${tags.length} blog tag pages.`);
}

async function build() {
  console.log("Starting Next Steps Show site build...");

  ensureDir(episodesDir);
  ensureDir(blogDir);

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

const blogPosts = readBlogPosts();

cleanGeneratedBlogPages(blogDir);

const blogIndexHtml = generateBlogIndex(blogPosts);
fs.writeFileSync(path.join(blogDir, "index.html"), blogIndexHtml, "utf8");

for (const post of blogPosts) {
  const postDir = path.join(blogDir, post.slug);
  ensureDir(postDir);

  const postHtml = generateBlogPostPage(post);
  fs.writeFileSync(path.join(postDir, "index.html"), postHtml, "utf8");
}

generateBlogTaxonomyPages(blogPosts);

console.log(`Built ${blogPosts.length} blog posts.`);

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