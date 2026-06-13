# Next Steps Show Blog Workflow

This document explains how to create, edit, publish, and manage blog content for the Next Steps Show website.

The site is a static website. Blog pages, episode pages, show-note pages, category pages, tag pages, sitemap files, and other generated files are created by the build script.

## Key Rule

Do not edit generated blog pages directly.

Generated blog files live under:

```text
public/blog/
```

Manual blog post source files live under:

```text
src/blog/posts/
```

When creating or editing a blog post, edit the Markdown files in `src/blog/posts/`, then run the build command.

## Blog System Overview

The blog system supports:

```text
Manual blog posts
Reusable Markdown post template
Draft and published status
Categories
Tags
Blog pagination
Auto-generated podcast show notes
Show-note pagination
SEO metadata
Sitemap generation
Robots.txt generation
```

## Important Folders

```text
src/blog/posts/
```

This is where manual blog posts are written.

```text
src/blog/media/
```

This can be used later for blog images or media files.

```text
public/blog/
```

This is generated output. Do not edit these files directly.

```text
src/build.js
```

This is the site build script. It generates the homepage, episode archive, episode detail pages, blog pages, category pages, tag pages, show notes, sitemap, and robots.txt.

```text
public/css/styles.css
```

This controls site styling, including blog and show-note layout.

## Creating a New Blog Post

Start by copying the reusable template:

```text
src/blog/posts/_blog-post-template.md
```

Paste a copy into the same folder and rename it using this format:

```text
YYYY-MM-DD-short-post-title.md
```

Example:

```text
2026-06-14-why-local-leadership-still-matters.md
```

## Required Blog Post Format

Every post must begin with front matter.

The first line must be exactly:

```text
---
```

There should be no blank line above it.

Example:

```markdown
---
title: "Why Local Leadership Still Matters"
date: "2026-06-14"
author: "Peter Vazquez"
category: "Leadership"
tags: ["faith", "family", "freedom", "leadership", "community"]
excerpt: "Local leadership still matters because the health of a community depends on people willing to take responsibility close to home."
status: "published"
image: "images/hero.jpg"
---

Write the blog post here.
```

## Drafts vs. Published Posts

To keep a post hidden from the live blog, use:

```text
status: "draft"
```

To publish a post, use:

```text
status: "published"
```

Only posts marked as `published` are included in the generated blog.

## Categories

Use consistent category names.

Recommended categories:

```text
Commentary
Show Notes
Faith & Culture
Politics & Civic Life
Family & Community
Business & Enterprise
Leadership
Video Recaps
```

A post should usually have one category.

Example:

```text
category: "Commentary"
```

## Tags

Tags help group related posts.

Use an inline tag list to avoid YAML formatting errors.

Recommended format:

```text
tags: ["faith", "family", "freedom", "leadership"]
```

Avoid this incorrect format:

```text
tags:
  * faith
  * family
```

The asterisk format breaks the build because YAML treats `*` as an alias marker.

## Writing the Blog Post Body

The article content goes below the second `---`.

Use normal Markdown:

```markdown
## Section Heading

Paragraph text goes here.

## Another Section

More paragraph text goes here.
```

Keep paragraphs readable. Two to four sentences per paragraph usually works well.

## Recommended Blog Post Structure

A simple structure:

```text
Opening paragraph
Main Point One
Main Point Two
Why It Matters
The Next Step
```

Example:

```markdown
Opening paragraph goes here.

## Main Point One

Explain the first major idea.

## Main Point Two

Explain the second major idea.

## Why It Matters

Explain the real-world impact.

## The Next Step

Close with a clear takeaway.
```

## Build Command

After editing or creating blog posts, run this command from the project root:

```powershell
npm.cmd run build
```

Expected successful output should end with:

```text
Build complete.
```

The exact counts may vary, but a successful build may include lines like:

```text
Built 1 blog category pages.
Built 5 blog tag pages.
Built 36 show notes archive pages.
Built 425 show note pages.
Built sitemap.xml with 900+ URLs.
Built robots.txt.
Built 1 blog archive pages.
Built 1 blog posts.
Built 425 episode pages.
Build complete.
```

## Previewing Locally

After running the build, preview the generated blog page:

```text
public/blog/index.html
```

Preview an individual manual blog post:

```text
public/blog/[post-slug]/index.html
```

Preview show notes:

```text
public/blog/show-notes/index.html
```

Preview an individual show-note page:

```text
public/blog/show-notes/[episode-slug]/index.html
```

## Generated Files

The build script generates:

```text
public/blog/index.html
public/blog/page/...
public/blog/category/...
public/blog/tag/...
public/blog/show-notes/...
public/blog/[manual-post-slug]/index.html
public/episodes/...
public/sitemap.xml
public/robots.txt
```

Do not manually edit these generated files. Changes will be overwritten the next time the build runs.

## Auto-Generated Show Notes

Show-note pages are generated from the Podbean RSS feed.

They are created under:

```text
public/blog/show-notes/
```

Each show-note page can include:

```text
Episode title
Date
Duration
Artwork
Audio player
Episode summary
In This Episode section
Links to the full episode page
Links back to the show-note archive
```

If the RSS feed changes, the generated show-note pages may change the next time the build runs.

## SEO Files

The build script also generates:

```text
public/sitemap.xml
public/robots.txt
```

These help search engines discover site pages.

Do not edit these files directly. They are generated by `src/build.js`.

## Commit Workflow

After a successful build and local preview:

1. Open GitHub Desktop.
2. Review the changed files.
3. Use a clear commit message.
4. Commit to `main`.
5. Push origin.
6. Wait for GitHub Actions to turn green.
7. Check the live site and press `Ctrl + F5`.

## Common Commit Messages

```text
Add new blog post
Update blog post
Add blog category and tag pages
Add blog pagination support
Add auto-generated podcast show notes
Improve show note page structure
Add SEO metadata to generated pages
Add sitemap and robots generation
```

## Common Mistakes to Avoid

Do not edit:

```text
public/blog/index.html
public/blog/show-notes/
public/blog/category/
public/blog/tag/
public/episodes/
public/sitemap.xml
public/robots.txt
```

Do edit:

```text
src/blog/posts/
src/build.js
public/css/styles.css
```

Do not use smart quotes in front matter.

Use this:

```text
title: "My Blog Post"
```

Not this:

```text
title: “My Blog Post”
```

Do not put a blank line before the opening `---`.

Do not use asterisks for YAML tag lists.

Do not run:

```powershell
npm audit fix --force
```

unless there is a specific reason to do so.

## Safe Blog Publishing Checklist

Before committing a new blog post:

```text
The post is in src/blog/posts/
The file name uses YYYY-MM-DD-post-title.md
The first line is ---
The front matter has title, date, author, category, tags, excerpt, status, and image
The status is published if the post should go live
The build command completed successfully
The local blog page looks correct
The post page looks correct
GitHub Desktop shows expected changed files
```

## Current Blog System Status

The blog system currently supports both manual written posts and auto-generated podcast show notes.

Manual posts are controlled from:

```text
src/blog/posts/
```

Podcast show notes are generated from the RSS feed during the build.

The build command is:

```powershell
npm.cmd run build
```

The live site is deployed through GitHub Actions after changes are pushed to GitHub.
