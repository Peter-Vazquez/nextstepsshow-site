const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const sitemapPath = path.join(rootDir, "public", "sitemap.xml");
const siteConfigPath = path.join(__dirname, "data", "site.json");

const site = JSON.parse(fs.readFileSync(siteConfigPath, "utf8"));
const siteUrl = String(site.siteUrl || "https://www.nextstepsshow.com").replace(/\/+$/, "");
const manualEntries = [
  {
    path: "guest/past/",
    changefreq: "monthly",
    priority: "0.6"
  }
];

let sitemap = fs.readFileSync(sitemapPath, "utf8");
let added = 0;

for (const entry of manualEntries) {
  const loc = `${siteUrl}/${entry.path}`;

  if (sitemap.includes(`<loc>${loc}</loc>`)) {
    continue;
  }

  const xmlEntry = `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>\n`;
  sitemap = sitemap.replace("</urlset>", `${xmlEntry}</urlset>`);
  added += 1;
}

fs.writeFileSync(sitemapPath, sitemap, "utf8");
console.log(`Ensured manual sitemap pages; added ${added} entr${added === 1 ? "y" : "ies"}.`);
