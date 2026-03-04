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

const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryRules = [
  body('name').trim().notEmpty().withMessage('Naam is verplicht.').isLength({ max: 255 }),
  body('title').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('alias')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Alias mag alleen kleine letters, cijfers en streepjes bevatten.'),
  body('google_title').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('meta_description').optional({ checkFalsy: true }).trim(),
  body('cover').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('banner').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('text').optional({ checkFalsy: true }).trim()
];

async function getCompanyInfo() {
  const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1 LIMIT 1');
  return rows?.[0] || {};
}

router.get('/cms/categories', isAuthenticated, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const [categories] = await db.query(
      `SELECT c.*,
              COUNT(i.id) AS impressions_count
       FROM categories c
       LEFT JOIN impressions i ON i.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
    const companyInfo = await getCompanyInfo();

    const selectedCategory = req.query.new === '1'
      ? {
          id: null,
          name: '',
          title: '',
          alias: '',
          google_title: '',
          meta_description: '',
          cover: '',
          banner: '',
          text: ''
        }
      : (categories[0] || {
          id: null,
          name: '',
          title: '',
          alias: '',
          google_title: '',
          meta_description: '',
          cover: '',
          banner: '',
          text: ''
        });

    res.render('categories', {
      page_title: 'Categorieen',
      categories,
      categoryForm: selectedCategory,
      editing: !!selectedCategory.id,
      errors: [],
      saved: req.query.saved === '1',
      session: req.session,
      companyInfo
    });
  } catch (err) {
    console.error('Error loading categories:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.get(
  '/cms/categories/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig categorie id.')],
  async (req, res) => {
    try {
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid category id');

      const [categories] = await db.query(
        `SELECT c.*,
                COUNT(i.id) AS impressions_count
         FROM categories c
         LEFT JOIN impressions i ON i.category_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      );
      const companyInfo = await getCompanyInfo();

      const [[category]] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
      if (!category) return res.status(404).send('Category not found');

      res.render('categories', {
        page_title: 'Categorieen',
        categories,
        categoryForm: category,
        editing: true,
        errors: [],
        saved: req.query.saved === '1',
        session: req.session,
        companyInfo
      });
    } catch (err) {
      console.error('Error loading category:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post('/cms/categories/create', isAuthenticated, categoryRules, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const result = validationResult(req);
    const payload = {
      name: clean(req.body.name),
      title: clean(req.body.title),
      alias: clean(req.body.alias) || slugify(req.body.name),
      google_title: clean(req.body.google_title),
      meta_description: clean(req.body.meta_description),
      cover: clean(req.body.cover),
      banner: clean(req.body.banner),
      text: sanitizeRich(req.body.text)
    };

    if (!result.isEmpty()) {
      const [categories] = await db.query(
        `SELECT c.*,
                COUNT(i.id) AS impressions_count
         FROM categories c
         LEFT JOIN impressions i ON i.category_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      );
      const companyInfo = await getCompanyInfo();

      return res.status(422).render('categories', {
        page_title: 'Categorieen',
        categories,
        categoryForm: { id: null, ...payload },
        editing: false,
        errors: result.array(),
        saved: false,
        session: req.session,
        companyInfo
      });
    }

    const [[exists]] = await db.query('SELECT id FROM categories WHERE alias = ? LIMIT 1', [payload.alias]);
    if (exists) {
      const [categories] = await db.query(
        `SELECT c.*,
                COUNT(i.id) AS impressions_count
         FROM categories c
         LEFT JOIN impressions i ON i.category_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      );
      const companyInfo = await getCompanyInfo();

      return res.status(422).render('categories', {
        page_title: 'Categorieen',
        categories,
        categoryForm: { id: null, ...payload },
        editing: false,
        errors: [{ msg: 'Alias bestaat al. Kies een unieke alias.' }],
        saved: false,
        session: req.session,
        companyInfo
      });
    }

    const [resultInsert] = await db.query(
      `INSERT INTO categories
       (alias, name, title, google_title, meta_description, cover, banner, text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.alias,
        payload.name,
        payload.title || null,
        payload.google_title || null,
        payload.meta_description || null,
        payload.cover || '',
        payload.banner || null,
        payload.text || null
      ]
    );

    res.redirect(`/cms/categories/${resultInsert.insertId}?saved=1`);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.post(
  '/cms/categories/update/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig categorie id.'), ...categoryRules],
  async (req, res) => {
    try {
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const result = validationResult(req);
      const payload = {
        id: Number(req.params.id),
        name: clean(req.body.name),
        title: clean(req.body.title),
        alias: clean(req.body.alias) || slugify(req.body.name),
        google_title: clean(req.body.google_title),
        meta_description: clean(req.body.meta_description),
        cover: clean(req.body.cover),
        banner: clean(req.body.banner),
        text: sanitizeRich(req.body.text)
      };

      const [categories] = await db.query(
        `SELECT c.*,
                COUNT(i.id) AS impressions_count
         FROM categories c
         LEFT JOIN impressions i ON i.category_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      );
      const companyInfo = await getCompanyInfo();

      if (!result.isEmpty()) {
        return res.status(422).render('categories', {
          page_title: 'Categorieen',
          categories,
          categoryForm: payload,
          editing: true,
          errors: result.array(),
          saved: false,
          session: req.session,
          companyInfo
        });
      }

      const [[aliasExists]] = await db.query(
        'SELECT id FROM categories WHERE alias = ? AND id <> ? LIMIT 1',
        [payload.alias, payload.id]
      );
      if (aliasExists) {
        return res.status(422).render('categories', {
          page_title: 'Categorieen',
          categories,
          categoryForm: payload,
          editing: true,
          errors: [{ msg: 'Alias bestaat al. Kies een unieke alias.' }],
          saved: false,
          session: req.session,
          companyInfo
        });
      }

      await db.query(
        `UPDATE categories
         SET alias = ?, name = ?, title = ?, google_title = ?, meta_description = ?, cover = ?, banner = ?, text = ?
         WHERE id = ?`,
        [
          payload.alias,
          payload.name,
          payload.title || null,
          payload.google_title || null,
          payload.meta_description || null,
          payload.cover || '',
          payload.banner || null,
          payload.text || null,
          payload.id
        ]
      );

      res.redirect(`/cms/categories/${payload.id}?saved=1`);
    } catch (err) {
      console.error('Error updating category:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post(
  '/cms/categories/delete/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig categorie id.')],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid category id');

      await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
      res.redirect('/cms/categories?saved=1');
    } catch (err) {
      console.error('Error deleting category:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

module.exports = router;
