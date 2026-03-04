const express = require('express');
const path = require('path');
const db = require('../../db');
const { body, param, validationResult } = require('express-validator');
const { isAuthenticated } = require('../auth');
const loginProcess = require('../loginprocess');
const { clean } = require('../sanitize');

const router = express.Router();
router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');

const impressionRules = [
  body('name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('alt').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('path').trim().notEmpty().withMessage('Afbeelding pad is verplicht.').isLength({ max: 255 }),
  body('category_id').isInt({ min: 1 }).withMessage('Kies een categorie.').toInt()
];

async function getCompanyInfo() {
  const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1 LIMIT 1');
  return rows?.[0] || {};
}

router.get('/cms/impression', isAuthenticated, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
    const [impressions] = await db.query(
      `SELECT i.id, i.name, i.alt, i.path, i.category_id, i.created_at, c.name AS category_name, c.alias AS category_alias
       FROM impressions i
       INNER JOIN categories c ON c.id = i.category_id
       ORDER BY i.id DESC`
    );
    const companyInfo = await getCompanyInfo();

    res.render('impression', {
      page_title: 'Impressie',
      categories,
      impressions,
      impressionForm: { id: null, name: '', alt: '', path: '', category_id: '' },
      editing: false,
      errors: [],
      saved: req.query.saved === '1',
      session: req.session,
      companyInfo
    });
  } catch (err) {
    console.error('Error loading impressions:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.get(
  '/cms/impression/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig impressie id.')],
  async (req, res) => {
    try {
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid impression id');

      const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
      const [impressions] = await db.query(
        `SELECT i.id, i.name, i.alt, i.path, i.category_id, i.created_at, c.name AS category_name, c.alias AS category_alias
         FROM impressions i
         INNER JOIN categories c ON c.id = i.category_id
         ORDER BY i.id DESC`
      );
      const companyInfo = await getCompanyInfo();

      const [[impression]] = await db.query('SELECT * FROM impressions WHERE id = ?', [req.params.id]);
      if (!impression) return res.status(404).send('Impression not found');

      res.render('impression', {
        page_title: 'Impressie',
        categories,
        impressions,
        impressionForm: impression,
        editing: true,
        errors: [],
        saved: req.query.saved === '1',
        session: req.session,
        companyInfo
      });
    } catch (err) {
      console.error('Error loading impression:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post('/cms/impression/create', isAuthenticated, impressionRules, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const result = validationResult(req);
    const payload = {
      name: clean(req.body.name),
      alt: clean(req.body.alt),
      path: clean(req.body.path),
      category_id: Number(req.body.category_id)
    };

    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
    const [impressions] = await db.query(
      `SELECT i.id, i.name, i.alt, i.path, i.category_id, i.created_at, c.name AS category_name, c.alias AS category_alias
       FROM impressions i
       INNER JOIN categories c ON c.id = i.category_id
       ORDER BY i.id DESC`
    );
    const companyInfo = await getCompanyInfo();

    if (!result.isEmpty()) {
      return res.status(422).render('impression', {
        page_title: 'Impressie',
        categories,
        impressions,
        impressionForm: { id: null, ...payload },
        editing: false,
        errors: result.array(),
        saved: false,
        session: req.session,
        companyInfo
      });
    }

    await db.query(
      'INSERT INTO impressions (name, alt, path, category_id) VALUES (?, ?, ?, ?)',
      [payload.name || null, payload.alt || null, payload.path, payload.category_id]
    );

    res.redirect('/cms/impression?saved=1');
  } catch (err) {
    console.error('Error creating impression:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.post(
  '/cms/impression/update/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig impressie id.'), ...impressionRules],
  async (req, res) => {
    try {
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const result = validationResult(req);
      const payload = {
        id: Number(req.params.id),
        name: clean(req.body.name),
        alt: clean(req.body.alt),
        path: clean(req.body.path),
        category_id: Number(req.body.category_id)
      };

      const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
      const [impressions] = await db.query(
        `SELECT i.id, i.name, i.alt, i.path, i.category_id, i.created_at, c.name AS category_name, c.alias AS category_alias
         FROM impressions i
         INNER JOIN categories c ON c.id = i.category_id
         ORDER BY i.id DESC`
      );
      const companyInfo = await getCompanyInfo();

      if (!result.isEmpty()) {
        return res.status(422).render('impression', {
          page_title: 'Impressie',
          categories,
          impressions,
          impressionForm: payload,
          editing: true,
          errors: result.array(),
          saved: false,
          session: req.session,
          companyInfo
        });
      }

      await db.query(
        'UPDATE impressions SET name = ?, alt = ?, path = ?, category_id = ? WHERE id = ?',
        [payload.name || null, payload.alt || null, payload.path, payload.category_id, payload.id]
      );

      res.redirect(`/cms/impression/${payload.id}?saved=1`);
    } catch (err) {
      console.error('Error updating impression:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post(
  '/cms/impression/delete/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig impressie id.')],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid impression id');

      await db.query('DELETE FROM impressions WHERE id = ?', [req.params.id]);
      res.redirect('/cms/impression?saved=1');
    } catch (err) {
      console.error('Error deleting impression:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

module.exports = router;
