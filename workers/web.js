const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const db      = require('../db');

const { isAuthenticated } = require('./auth');
const loginProcess = require('./loginprocess');

router.use(loginProcess);

// ==========================
// Allowed templates (security)
// ==========================
const path = require('path');

const PAGE_VIEWS_DIR = path.join(__dirname, '../views/pages');

const ALLOWED_TEMPLATES = fs
  .readdirSync(PAGE_VIEWS_DIR)
  .filter(f => f.endsWith('.ejs'))
  .map(f => f.replace('.ejs', ''));

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
    db.query('SELECT * FROM menu ORDER BY parent_id, position'),
    db.query('SELECT id, alias, template FROM pages'),
    db.query('SELECT * FROM categories ORDER BY name ASC')
  ]);

  return {
    companyInfo: company?.[0] || {},
    navItems: menu,
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
    const [rows] = await db.query(
      "SELECT * FROM pages WHERE template = 'template-home' LIMIT 1"
    );

    if (!rows.length) {
      return res.status(500).send('Homepage not configured');
    }

    const page = rows[0];
    const common = await getCommonData();

    const seo = {
      title: page.google_title || '',
      description: page.meta_description || '',
      banner: page.banner || ''
    };

    res.render(page.template, {
      page,
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
    const [rows] = await db.query(
      'SELECT * FROM categories WHERE alias = ? LIMIT 1',
      [req.params.alias]
    );

    if (!rows.length) return next();

    const category = rows[0];
    const common = await getCommonData();

    const seo = {
      title: category.google_title || category.name,
      description: category.meta_description || '',
      banner: category.banner || ''
    };

    res.render('template-cat', {
      page: category,
      seo,
      pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      ...common
    });
  } catch (err) {
    console.error('❌ Category render error:', err);
    res.status(500).send('Internal Server Error');
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

    const seo = {
      title: page.google_title || page.name,
      description: page.meta_description || '',
      banner: page.banner || ''
    };

    res.render(page.template, {
      page,
      seo,
      pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      ...common
    });
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
    const [rows] = await db.query(
      'SELECT * FROM private_pages WHERE alias = ? LIMIT 1',
      [req.params.alias]
    );

    if (!rows.length) return next();

    const page = rows[0];
    req.session.cookie.maxAge = 60 * 60 * 1000;

    res.render(`admin/${page.view}`, {
      page_title: page.name,
      page_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      saved: req.query.saved === '1',
      errors: []
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
