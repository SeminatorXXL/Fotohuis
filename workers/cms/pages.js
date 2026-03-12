const express = require('express');
const path = require('path');
const db = require('../../db');
const { body, param, validationResult } = require('express-validator');
const { isAuthenticated } = require('../auth');
const loginProcess = require('../loginprocess');
const { sanitizeRich, clean } = require('../sanitize');

const router = express.Router();
router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');

const allowedTemplates = ['template', 'template-home', 'template-overview', 'template-cat', 'template-contact', 'template-impressions'];
const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '');
const asFlag = (value, fallback = 0) => {
  if (Array.isArray(value)) return value.includes('1') ? 1 : 0;
  if (value === '1' || value === 1 || value === true || value === 'true' || value === 'on') return 1;
  if (value === '0' || value === 0 || value === false || value === 'false' || value === 'off') return 0;
  return fallback;
};

const pageRules = [
  body('name').trim().notEmpty().withMessage('Naam is verplicht.').isLength({ max: 255 }),
  body('title').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('template').isIn(allowedTemplates).withMessage('Ongeldig template.'),
  body('alias').trim().notEmpty().withMessage('Alias is verplicht.').isLength({ max: 255 }),
  body('google_title').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('meta_description').optional({ checkFalsy: true }).trim(),
  body('banner').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('image_path').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('image_alt').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('text').optional({ checkFalsy: true }).trim()
];

const emptyForm = {
  id: null,
  name: '',
  title: '',
  template: 'template',
  alias: '',
  google_title: '',
  meta_description: '',
  banner: '',
  image_path: '',
  image_alt: '',
  text: '',
  seo_index: 1,
  seo_follow: 1,
  seo_sitemap: 1
};

async function getCompanyInfo() {
  const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1 LIMIT 1');
  return rows?.[0] || {};
}

async function getOrderedPages() {
  const [rows] = await db.query(
    `SELECT id, name, title, template, alias, google_title, meta_description, banner, image_path, image_alt, text, seo_index, seo_follow, seo_sitemap
     FROM pages
     ORDER BY (alias = '/') DESC, name ASC`
  );
  return rows;
}

router.get('/cms/pages', isAuthenticated, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const pages = await getOrderedPages();
    const companyInfo = await getCompanyInfo();

    const homePage = pages.find((p) => p.alias === '/');
    const selectedPage = req.query.new === '1'
      ? emptyForm
      : (homePage || pages[0] || emptyForm);

    res.render('pages', {
      page_title: 'Pagina\'s',
      pages,
      pageForm: selectedPage,
      editing: !!selectedPage.id,
      templates: allowedTemplates,
      errors: [],
      saved: req.query.saved === '1',
      session: req.session,
      companyInfo
    });
  } catch (err) {
    console.error('Error loading pages:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.get(
  '/cms/pages/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig pagina id.')],
  async (req, res) => {
    try {
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid page id');

      const pages = await getOrderedPages();
      const companyInfo = await getCompanyInfo();
      const [[page]] = await db.query(
        'SELECT id, name, title, template, alias, google_title, meta_description, banner, image_path, image_alt, text, seo_index, seo_follow, seo_sitemap FROM pages WHERE id = ?',
        [req.params.id]
      );
      if (!page) return res.status(404).send('Page not found');

      res.render('pages', {
        page_title: 'Pagina\'s',
        pages,
        pageForm: page,
        editing: true,
        templates: allowedTemplates,
        errors: [],
        saved: req.query.saved === '1',
        session: req.session,
        companyInfo
      });
    } catch (err) {
      console.error('Error loading page:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post('/cms/pages/create', isAuthenticated, pageRules, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const result = validationResult(req);
    const payload = {
      name: clean(req.body.name),
      title: clean(req.body.title),
      template: clean(req.body.template),
      alias: req.body.alias === '/' ? '/' : slugify(clean(req.body.alias)),
      google_title: clean(req.body.google_title),
      meta_description: clean(req.body.meta_description),
      banner: clean(req.body.banner),
      image_path: clean(req.body.image_path),
      image_alt: clean(req.body.image_alt),
      text: sanitizeRich(req.body.text),
      seo_index: asFlag(req.body.seo_index, 1),
      seo_follow: asFlag(req.body.seo_follow, 1),
      seo_sitemap: asFlag(req.body.seo_sitemap, 1)
    };

    const pages = await getOrderedPages();
    const companyInfo = await getCompanyInfo();

    if (!result.isEmpty()) {
      return res.status(422).render('pages', {
        page_title: 'Pagina\'s',
        pages,
        pageForm: { id: null, ...payload },
        editing: false,
        templates: allowedTemplates,
        errors: result.array(),
        saved: false,
        session: req.session,
        companyInfo
      });
    }

    const [[exists]] = await db.query('SELECT id FROM pages WHERE alias = ? LIMIT 1', [payload.alias]);
    if (exists) {
      return res.status(422).render('pages', {
        page_title: 'Pagina\'s',
        pages,
        pageForm: { id: null, ...payload },
        editing: false,
        templates: allowedTemplates,
        errors: [{ msg: 'Alias bestaat al. Kies een unieke alias.' }],
        saved: false,
        session: req.session,
        companyInfo
      });
    }

    const [resultInsert] = await db.query(
      `INSERT INTO pages (template, name, title, google_title, meta_description, alias, banner, text, image_path, image_alt, seo_index, seo_follow, seo_sitemap)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.template,
        payload.name,
        payload.title || null,
        payload.google_title || null,
        payload.meta_description || null,
        payload.alias,
        payload.banner || null,
        payload.text || null,
        payload.image_path || null,
        payload.image_alt || null,
        payload.seo_index,
        payload.seo_follow,
        payload.seo_sitemap
      ]
    );

    res.redirect(`/cms/pages/${resultInsert.insertId}?saved=1`);
  } catch (err) {
    console.error('Error creating page:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.post(
  '/cms/pages/update/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig pagina id.'), ...pageRules],
  async (req, res) => {
    try {
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const result = validationResult(req);
      const payload = {
        id: Number(req.params.id),
        name: clean(req.body.name),
        title: clean(req.body.title),
        template: clean(req.body.template),
        alias: req.body.alias === '/' ? '/' : slugify(clean(req.body.alias)),
        google_title: clean(req.body.google_title),
        meta_description: clean(req.body.meta_description),
        banner: clean(req.body.banner),
        image_path: clean(req.body.image_path),
        image_alt: clean(req.body.image_alt),
        text: sanitizeRich(req.body.text),
        seo_index: asFlag(req.body.seo_index, 1),
        seo_follow: asFlag(req.body.seo_follow, 1),
        seo_sitemap: asFlag(req.body.seo_sitemap, 1)
      };

      const pages = await getOrderedPages();
      const companyInfo = await getCompanyInfo();

      if (!result.isEmpty()) {
        return res.status(422).render('pages', {
          page_title: 'Pagina\'s',
          pages,
          pageForm: payload,
          editing: true,
          templates: allowedTemplates,
          errors: result.array(),
          saved: false,
          session: req.session,
          companyInfo
        });
      }

      const [[exists]] = await db.query(
        'SELECT id FROM pages WHERE alias = ? AND id <> ? LIMIT 1',
        [payload.alias, payload.id]
      );
      if (exists) {
        return res.status(422).render('pages', {
          page_title: 'Pagina\'s',
          pages,
          pageForm: payload,
          editing: true,
          templates: allowedTemplates,
          errors: [{ msg: 'Alias bestaat al. Kies een unieke alias.' }],
          saved: false,
          session: req.session,
          companyInfo
        });
      }

      await db.query(
        `UPDATE pages
         SET template = ?, name = ?, title = ?, google_title = ?, meta_description = ?, alias = ?, banner = ?, text = ?, image_path = ?, image_alt = ?, seo_index = ?, seo_follow = ?, seo_sitemap = ?
         WHERE id = ?`,
        [
          payload.template,
          payload.name,
          payload.title || null,
          payload.google_title || null,
          payload.meta_description || null,
          payload.alias,
          payload.banner || null,
          payload.text || null,
          payload.image_path || null,
          payload.image_alt || null,
          payload.seo_index,
          payload.seo_follow,
          payload.seo_sitemap,
          payload.id
        ]
      );

      res.redirect(`/cms/pages/${payload.id}?saved=1`);
    } catch (err) {
      console.error('Error updating page:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post(
  '/cms/pages/delete/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig pagina id.')],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid page id');

      await db.query('DELETE FROM pages WHERE id = ?', [req.params.id]);
      res.redirect('/cms/pages?saved=1');
    } catch (err) {
      console.error('Error deleting page:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

module.exports = router;
