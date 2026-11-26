# Neo Mobile Tag Drawer & UX Suite for Flarum

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Flarum](https://img.shields.io/badge/Flarum-1.x%20%7C%202.x-4282f0.svg)](https://flarum.org)
[![Powered by NeoTiler](https://img.shields.io/badge/Built%20for-NeoTiler%20Social-111827.svg)](https://getneotiler.com/social)

<p align="center">
  <img src="https://getneotiler.com/social/assets/logo-zohuavye.png" alt="NeoTiler Social" height="44" />
</p>

A lightweight, production-hardened Flarum extension (`neotiler/flarum-drawer-tags`) built for **[NeoTiler Social](https://getneotiler.com/social)**. It started as a mobile tag drawer and evolved into a focused navigation, engagement, and SEO enhancement suite for modern Flarum communities.

> **[TR]** Flarum forumları için geliştirilmiş hafif ve performans odaklı bir UX & SEO eklentisidir. Mobil hamburger menüye etiket (tag) çekmecesi, Stack Overflow tarzı sıralama sekmeleri, konu sonu **Related Discussions** (hem SPA hem crawler-friendly SSR), `fof/byobu` mesaj kısayolu ve daha temiz bir tartışma akışı sunar.

---

## Features

### 1. Mobile Navigation Tag Drawer & Home-Click Logo
- Injects primary tags directly into Flarum's native mobile navigation drawer (`HeaderSecondary`), preserving the exact `position` order configured in the admin panel.
- Renders each tag with its native FontAwesome icon tinted using the tag's own color (`--tag-color`), plus an **All Discussions** shortcut and separator.
- Displays a centered mobile brand logo that navigates cleanly back to the forum index on tap without interfering with desktop layout.

### 2. Related Discussions (SPA + Crawler SSR)
- **Zero-Overhead API Loading:** Hooked exclusively into `ShowDiscussionController` via `Extend\ApiController::prepareDataForSerialization` (`src/LoadRelatedDiscussions.php`). Index/list endpoints (`ListDiscussionsController`) incur zero extra queries or payload size.
- **Weighted Tag Relevance:** Scores visible, public, non-`noindex` discussions:
  - `+10` points per shared **child tag**
  - `+4` points per shared **primary tag**
  - Tie-breakers: `last_posted_at DESC`, then `comment_count DESC`
  - Returns up to **5** related discussions with an automatic fallback to the freshest visible public discussions when a tag has fewer matches.
- **Native-Looking SPA Component:** Mounted on `DiscussionPage.prototype.pageContent` (outside `PostStream`, keeping `ReplyPlaceholder` scroll math and `PostStreamScrubber` untouched). Includes vibrant solid tag badges with automatic YIQ contrast text, reply counts, relative timestamps, a **"More in \<Tag\> →"** link, and full Light / `fof/nightmode` Dark support.
- **Crawler-Friendly SSR:** Extends the `flarum.forum` Blade view namespace (`views/frontend/content/discussion.blade.php`) to render semantic `<section class="NeoRelatedDiscussions-ssr">` links directly inside `<noscript id="flarum-content">` so Googlebot and AI crawlers discover internal cross-links without executing JavaScript.

### 3. Stack Overflow–Style Sort Tabs
- Replaces Flarum's default sort dropdown on `IndexPage` with a clean horizontal segmented tab bar (`Latest`, `Top`, `Newest`, `Oldest`, etc.).
- Responsive horizontal scrolling on mobile and full support for `prefers-color-scheme: dark`, `.nightmode`, and `[data-theme="dark"]`.

### 4. Header Messages Shortcut (`fof/byobu`)
- Automatically adds an envelope button in `HeaderSecondary` next to the notifications bell when a user is signed in and `fof/byobu` routes are available.

### 5. Cleaner Discussion Stream
- Hides redundant `discussionStickied` timeline event notices (`.PostStream-item[data-type="discussionStickied"]`) since Flarum already displays the sticky pin badge in `DiscussionHero`.

---

## Architecture & Project Structure

```text
.
├── composer.json                                 # Package metadata & PSR-4 autoloading
├── extend.php                                    # Flarum extenders (Frontend, View, API Controller & Serializer)
├── src/
│   ├── LoadRelatedDiscussions.php                # Tag-scored related discussion query & visibility filtering
│   └── AddRelatedDiscussionsAttribute.php        # Exposes `relatedDiscussions` on DiscussionSerializer
├── views/
│   └── frontend/content/discussion.blade.php     # SSR Blade override emitting semantic related links
├── js/
│   ├── package.json                              # Webpack build config (flarum-webpack-config)
│   ├── dist/forum.js                             # Compiled production bundle
│   └── src/forum/
│       ├── index.js                              # Initializer (drawer tags, sort tabs, messages btn, related mount)
│       └── components/
│           └── RelatedDiscussions.js             # Mithril component with YIQ contrast badges
└── less/
    └── forum.less                                # Light/Dark styles, responsive grid alignment, stream polish
```

---

## Requirements

- **Flarum:** `^1.0 || ^2.0`
- **Required Extension:** `flarum/tags`
- **Optional Integrations:** `fof/byobu` (header messages icon), `fof/nightmode` (dark theme styles), `v17development/flarum-seo` (`seo_meta.robots_noindex` awareness)

---

## Installation

### Via Composer (Packagist / VCS)

```bash
composer require neotiler/flarum-drawer-tags
php flarum cache:clear
```

### Local Path Repository (Recommended for Custom Deployments)

1. Place this repository inside your Flarum installation's `packages/flarum-ext-drawer-tags` directory.
2. Add the path repository to your Flarum root `composer.json`:

```json
"repositories": [
    {
        "type": "path",
        "url": "packages/*",
        "options": {
            "symlink": true
        }
    }
]
```

3. Require the package and clear Flarum's cache:

```bash
composer require neotiler/flarum-drawer-tags:*@dev
php flarum cache:clear
```

---

## Development & Building Frontend Assets

Whenever you edit files under `js/src/`, rebuild the production bundle before deploying:

```bash
cd js
npm install
npm run build
```

For local watch mode:

```bash
cd js
npm run dev
```

After updating PHP, Blade, JS, or LESS files on the server, clear Flarum's compiled asset and view cache:

```bash
php flarum cache:clear
```

---

## Updating

```bash
composer update neotiler/flarum-drawer-tags
php flarum cache:clear
```

---

## Author

Built and maintained by **[NeoTiler](https://getneotiler.com)** for **[NeoTiler Social](https://getneotiler.com/social)**.

## License

This project is licensed under the **MIT License**.
