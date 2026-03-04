const express = require('express');
const router = express.Router();
const db = require('../db');
const xml = require('xml');

async function getSitemapEntries(req) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const [pages] = await db.query(
    "SELECT name, alias FROM pages WHERE alias IS NOT NULL AND alias <> '' AND alias <> '404' AND seo_sitemap = 1 ORDER BY (alias = '/') DESC, id ASC"
  );
  const [categories] = await db.query(
    "SELECT name, alias FROM categories WHERE alias IS NOT NULL AND alias <> '' ORDER BY name ASC"
  );

  const pageEntries = pages.map((page) => {
    const isHome = page.alias === '/';
    return {
      group: 'Pagina\'s',
      label: page.name || (isHome ? 'Home' : page.alias),
      loc: isHome ? `${baseUrl}/` : `${baseUrl}/${page.alias}`,
      path: isHome ? '/' : `/${page.alias}`,
      priority: isHome ? '1.0' : '0.8'
    };
  });

  const categoryEntries = categories.map((category) => ({
    group: 'Expertises',
    label: category.name || category.alias,
    loc: `${baseUrl}/expertise/${category.alias}`,
    path: `/expertise/${category.alias}`,
    priority: '0.8'
  }));

  return {
    baseUrl,
    entries: [...pageEntries, ...categoryEntries]
  };
}

async function generateSitemapXml(req) {
  const { entries } = await getSitemapEntries(req);
  const urls = entries.map((entry) => ({
    url: [{ loc: entry.loc }, { priority: entry.priority }]
  }));

  return xml(
    [{ urlset: [{ _attr: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' } }, ...urls] }],
    { declaration: true }
  );
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateSitemapHtml({ baseUrl, entries }) {
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.group]) acc[entry.group] = [];
    acc[entry.group].push(entry);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .map(([group, groupEntries]) => {
      const items = groupEntries
        .map(
          (entry) => `
            <li class="sitemap-item">
              <a href="${escapeHtml(entry.loc)}">${escapeHtml(entry.label)}</a>
              <span>${escapeHtml(entry.path)}</span>
            </li>`
        )
        .join('');

      return `
        <section class="sitemap-section">
          <h2>${escapeHtml(group)}</h2>
          <ul class="sitemap-list">${items}</ul>
        </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sitemap</title>
  <style>
    :root {
      --bg: #f3efe6;
      --card: #ffffff;
      --line: #d8d0c2;
      --text: #1f1a17;
      --muted: #6f655d;
      --accent: #8f4a2b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background: linear-gradient(180deg, #ece5d8 0%, var(--bg) 100%);
      color: var(--text);
    }
    .wrap {
      width: min(960px, calc(100% - 32px));
      margin: 48px auto;
    }
    .hero, .sitemap-section {
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: 0 18px 40px rgba(31, 26, 23, 0.08);
    }
    .hero {
      padding: 32px;
      margin-bottom: 24px;
    }
    h1, h2 {
      margin: 0 0 12px;
      font-weight: normal;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }
    .hero a {
      color: var(--accent);
      text-decoration: none;
    }
    .grid {
      display: grid;
      gap: 20px;
    }
    .sitemap-section {
      padding: 24px;
    }
    .sitemap-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 12px;
    }
    .sitemap-item {
      border-top: 1px solid var(--line);
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      flex-wrap: wrap;
    }
    .sitemap-item:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .sitemap-item a {
      color: var(--text);
      text-decoration: none;
      font-size: 1.1rem;
    }
    .sitemap-item a:hover {
      color: var(--accent);
    }
    .sitemap-item span {
      color: var(--muted);
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.95rem;
    }
    @media (max-width: 640px) {
      .wrap { margin: 24px auto; }
      .hero, .sitemap-section { padding: 20px; border-radius: 14px; }
      .sitemap-item { gap: 6px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>Sitemap</h1>
      <p>
        Overzicht van alle publieke pagina's op
        <a href="${escapeHtml(baseUrl)}">${escapeHtml(baseUrl)}</a>.
        Voor de XML-versie gebruik je <a href="/sitemap.xml">/sitemap.xml</a>.
      </p>
    </section>
    <div class="grid">
      ${sections}
    </div>
  </main>
</body>
</html>`;
}

router.get('/sitemap.xml', async (req, res) => {
  try {
    const xmlContent = await generateSitemapXml(req);
    res.header('Content-Type', 'application/xml');
    res.send(xmlContent);
  } catch (err) {
    console.error('Sitemap XML error:', err);
    res.status(500).send('Error generating sitemap.');
  }
});

router.get('/sitemap', async (req, res) => {
  try {
    const data = await getSitemapEntries(req);
    res.type('html').send(generateSitemapHtml(data));
  } catch (err) {
    console.error('Sitemap route error:', err);
    res.status(500).send('Error generating sitemap page.');
  }
});

module.exports = router;
