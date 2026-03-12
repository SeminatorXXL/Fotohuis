const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const db      = require('../db');
const axios   = require('axios');
const nodemailer = require('nodemailer');

const { isAuthenticated } = require('./auth');
const loginProcess = require('./loginprocess');

router.use(loginProcess);

// ==========================
// Allowed templates (security)
// ==========================
const path = require('path');

const PAGE_VIEWS_DIR = path.join(__dirname, '../views/pages');
const ADMIN_VIEWS_DIR = path.join(__dirname, '../admin/views');
const PUBLIC_VIEWS = [
  path.join(__dirname, '../views/pages'),
  path.join(__dirname, '../admin/views')
];

const ALLOWED_TEMPLATES = fs
  .readdirSync(PAGE_VIEWS_DIR)
  .filter(f => f.endsWith('.ejs'))
  .map(f => f.replace('.ejs', ''));

let homepageFlagReady;

async function ensureHomepageFlagColumn() {
  if (!homepageFlagReady) {
    homepageFlagReady = (async () => {
      const [rows] = await db.query("SHOW COLUMNS FROM impressions LIKE 'exclude_from_homepage'");
      if (!rows.length) {
        await db.query(
          'ALTER TABLE impressions ADD COLUMN exclude_from_homepage TINYINT(1) NOT NULL DEFAULT 0 AFTER category_id'
        );
      }
    })().catch((err) => {
      homepageFlagReady = null;
      throw err;
    });
  }

  return homepageFlagReady;
}

function setPublicViews(req) {
  req.app.set('views', PUBLIC_VIEWS);
}

function setAdminViews(req) {
  req.app.set('views', ADMIN_VIEWS_DIR);
}

function safeInternalBackUrl(req, fallback = '/contact') {
  try {
    const ref = req.get('referer');
    if (!ref) return fallback;
    const parsed = new URL(ref);
    const sameHost = parsed.host === req.get('host');
    if (!sameHost) return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

async function sendContactMail({ companyInfo, payload }) {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    console.log('Contact form received (no SMTP configured):', payload);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  const to = companyInfo?.email || user;
  const from = process.env.MAIL_FROM || `"Website contact" <${user}>`;
  const subjectSuffix = payload.subject ? ` - ${payload.subject}` : '';
  const subject = `Nieuw contactbericht - ${companyInfo?.name || 'Website'}${subjectSuffix}`;
  const text = [
    `Naam: ${payload.name}`,
    `E-mail: ${payload.email}`,
    `Onderwerp: ${payload.subject || '-'}`,
    `Telefoon: ${payload.phone || '-'}`,
    '',
    'Bericht:',
    payload.message
  ].join('\n');

  await transporter.sendMail({
    to,
    from,
    replyTo: payload.email,
    subject,
    text
  });
}

function buildMenuTree(rows = []) {
  const byId = new Map(
    rows.map((row) => [
      Number(row.id),
      {
        ...row,
        id: Number(row.id),
        parent_id: row.parent_id == null ? null : Number(row.parent_id),
        position: Number(row.position),
        children: []
      }
    ])
  );

  const roots = [];

  for (const item of byId.values()) {
    if (item.parent_id && byId.has(item.parent_id)) {
      byId.get(item.parent_id).children.push(item);
    } else {
      roots.push(item);
    }
  }

  const sortItems = (items) => {
    items.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.id - b.id;
    });

    items.forEach((item) => sortItems(item.children));
    return items;
  };

  return sortItems(roots);
}

// ==========================
// Shared data per request
// ==========================
async function getCommonData() {
  const [
    [company],
    [menu],
    [pages],
    [categories]
  ] = await Promise.all([
    db.query('SELECT * FROM company_info WHERE id = 1'),
    db.query('SELECT * FROM menu ORDER BY parent_id IS NOT NULL, position ASC, id ASC'),
    db.query('SELECT id, alias, template FROM pages'),
    db.query(
      `SELECT c.*,
              COUNT(i.id) AS impressions_count
       FROM categories c
       LEFT JOIN impressions i ON i.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`
    )
  ]);

  return {
    companyInfo: company?.[0] || {},
    navItems: buildMenuTree(menu),
    pagesIndex: Object.fromEntries(pages.map(p => [p.alias, p])),
    categories
  };
}

/**
 * ==========================
 * HOMEPAGE
 * /
 * ==========================
 */
router.get('/', async (req, res) => {
  try {
    await ensureHomepageFlagColumn();
    setPublicViews(req);

    const [rows] = await db.query(
      "SELECT * FROM pages WHERE template = 'template-home' LIMIT 1"
    );

    if (!rows.length) {
      return res.status(500).send('Homepage not configured');
    }

    const page = rows[0];
    const [impressions] = await db.query(
      'SELECT id, name, alt, path FROM impressions WHERE exclude_from_homepage = 0 ORDER BY RAND()'
    );
    const common = await getCommonData();

    const seo = {
      title: page.google_title || '',
      description: page.meta_description || '',
      banner: page.banner || ''
    };

    res.render(page.template, {
      page,
      impressions,
      seo,
      pageUrl: `${req.protocol}://${req.get('host')}/`,
      ...common
    });
  } catch (err) {
    console.error('❌ Homepage render error:', err);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * ==========================
 * CATEGORY DETAIL
 * /expertise/:alias
 * ==========================
 * Altijd template-cat
 * MOET vóór /:alias staan
 */
router.get('/expertise/:alias', async (req, res, next) => {
  try {
    setPublicViews(req);

    const [rows] = await db.query(
      'SELECT * FROM categories WHERE alias = ? LIMIT 1',
      [req.params.alias]
    );

    if (!rows.length) return next();

    const category = rows[0];
    const [impressions] = await db.query(
      'SELECT id, name, alt, path FROM impressions WHERE category_id = ? ORDER BY id DESC',
      [category.id]
    );
    const common = await getCommonData();

    const seo = {
      title: category.google_title || category.name,
      description: category.meta_description || '',
      banner: category.banner || ''
    };

    res.render('template-cat', {
      page: category,
      impressions,
      seo,
      pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      ...common
    });
  } catch (err) {
    console.error('❌ Category render error:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/contact/send', async (req, res) => {
  try {
    const backUrl = safeInternalBackUrl(req, '/contact');
    const honeypot = String(req.body.company_website || '').trim();

    // Spam bot trap: if this hidden field is filled, stop processing immediately.
    if (honeypot) {
      return res.redirect(`${backUrl}${backUrl.includes('?') ? '&' : '?'}contact=ok`);
    }

    const [companyRows] = await db.query('SELECT * FROM company_info WHERE id = 1 LIMIT 1');
    const companyInfo = companyRows?.[0] || {};

    const payload = {
      name: String(req.body.name || '').trim(),
      email: String(req.body.email || '').trim(),
      subject: String(req.body.subject || '').trim(),
      phone: String(req.body.phone || '').trim(),
      message: String(req.body.message || '').trim(),
      recaptchaToken: String(req.body.recaptcha_token || '').trim()
    };

    if (!payload.name || !payload.email || !payload.message) {
      return res.redirect(`${backUrl}${backUrl.includes('?') ? '&' : '?'}contact=invalid`);
    }

    const privateKey = String(companyInfo.recaptcha_private_key || '').trim();
    if (privateKey && payload.recaptchaToken) {
      const params = new URLSearchParams();
      params.append('secret', privateKey);
      params.append('response', payload.recaptchaToken);

      const verifyResponse = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
      );

      if (!verifyResponse?.data?.success) {
        return res.redirect(`${backUrl}${backUrl.includes('?') ? '&' : '?'}contact=error`);
      }
    }

    await sendContactMail({ companyInfo, payload });
    return res.redirect(`${backUrl}${backUrl.includes('?') ? '&' : '?'}contact=ok`);
  } catch (err) {
    console.error('Contact form error:', err);
    const backUrl = safeInternalBackUrl(req, '/contact');
    return res.redirect(`${backUrl}${backUrl.includes('?') ? '&' : '?'}contact=error`);
  }
});

/**
 * ==========================
 * PUBLIC PAGES (DB-driven)
 * /:alias
 * ==========================
 */
router.get('/:alias', async (req, res, next) => {
  try {
    setPublicViews(req);

    const [rows] = await db.query(
      'SELECT * FROM pages WHERE alias = ? LIMIT 1',
      [req.params.alias]
    );

    if (!rows.length) return next();

    const page = rows[0];

    if (!ALLOWED_TEMPLATES.includes(page.template)) {
      console.error(`❌ Ongeldig template: ${page.template}`);
      return res.status(500).send('Invalid template');
    }

    const common = await getCommonData();
    const renderData = {
      page,
      seo: {
        title: page.google_title || page.name,
        description: page.meta_description || '',
        banner: page.banner || ''
      },
      contactStatus: req.query.contact || '',
      pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      ...common
    };

    if (page.template === 'template-impressions') {
      const [impressions] = await db.query(
        `SELECT i.id, i.name, i.alt, i.path, i.category_id, c.name AS category_name, c.alias AS category_alias
         FROM impressions i
         INNER JOIN categories c ON c.id = i.category_id
         ORDER BY i.id DESC`
      );
      renderData.impressions = impressions;
    }

    res.render(page.template, renderData);
  } catch (err) {
    console.error('❌ Page render error:', err);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * ==========================
 * ADMIN / CMS PAGES
 * /cms/:alias
 * ==========================
 */
router.get('/cms/:alias', isAuthenticated, async (req, res, next) => {
  try {
    setAdminViews(req);

    const directAlias = req.params.alias;
    const prefixedAlias = `cms/${req.params.alias}`;
    const [rows] = await db.query(
      'SELECT * FROM private_pages WHERE alias IN (?, ?) LIMIT 1',
      [directAlias, prefixedAlias]
    );

    if (!rows.length) return next();

    const page = rows[0];
    const [companyRows] = await db.query('SELECT * FROM company_info WHERE id = 1 LIMIT 1');
    req.session.cookie.maxAge = 60 * 60 * 1000;

    res.render(page.view, {
      page_title: page.name,
      page_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      saved: req.query.saved === '1',
      errors: [],
      session: req.session,
      companyInfo: companyRows?.[0] || {}
    });
  } catch (err) {
    console.error('❌ Admin page error:', err);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * ==========================
 * 404 (CMS-based)
 * ==========================
 */
router.use(async (req, res) => {
  try {
    setPublicViews(req);

    const [rows] = await db.query(
      "SELECT * FROM pages WHERE alias = '404' LIMIT 1"
    );

    const page = rows[0] || {
      name: 'Pagina niet gevonden',
      google_title: '404 – Pagina niet gevonden',
      meta_description: 'Deze pagina bestaat niet.',
      banner: ''
    };

    const common = await getCommonData();

    const seo = {
      title: page.google_title || page.name,
      description: page.meta_description || '',
      banner: page.banner || ''
    };

    res.status(404).render(page.template || 'template', {
      page,
      seo,
      pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      ...common
    });
  } catch {
    res.status(404).send('Page not found');
  }
});

module.exports = (app) => router;
