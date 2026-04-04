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

let impressionColumnsReady;

function normalizeHomepageFlag(value) {
  return value ? 1 : 0;
}

function normalizeFocusCoordinate(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(100, Math.max(0, Math.round(parsed * 100) / 100));
}

function validateFocusCoordinate(value, fieldLabel) {
  const normalized = String(value ?? '').trim().replace(',', '.');

  if (normalized === '') {
    return true;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${fieldLabel} moet tussen 0 en 100 liggen.`);
  }

  return true;
}

async function ensureImpressionColumns() {
  if (!impressionColumnsReady) {
    impressionColumnsReady = (async () => {
      const [rows] = await db.query("SHOW COLUMNS FROM impressions LIKE 'exclude_from_homepage'");
      if (!rows.length) {
        await db.query(
          'ALTER TABLE impressions ADD COLUMN exclude_from_homepage TINYINT(1) NOT NULL DEFAULT 0 AFTER category_id'
        );
      }

      const [focusXRows] = await db.query("SHOW COLUMNS FROM impressions LIKE 'focus_x'");
      if (!focusXRows.length) {
        await db.query(
          'ALTER TABLE impressions ADD COLUMN focus_x DECIMAL(5,2) NOT NULL DEFAULT 50.00 AFTER exclude_from_homepage'
        );
      }

      const [focusYRows] = await db.query("SHOW COLUMNS FROM impressions LIKE 'focus_y'");
      if (!focusYRows.length) {
        await db.query(
          'ALTER TABLE impressions ADD COLUMN focus_y DECIMAL(5,2) NOT NULL DEFAULT 50.00 AFTER focus_x'
        );
      }
    })().catch((err) => {
      impressionColumnsReady = null;
      throw err;
    });
  }

  return impressionColumnsReady;
}

const impressionRules = [
  body('name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('alt').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('path').trim().notEmpty().withMessage('Afbeelding pad is verplicht.').isLength({ max: 255 }),
  body('category_id').isInt({ min: 1 }).withMessage('Kies een categorie.').toInt(),
  body('focus_x').custom((value) => validateFocusCoordinate(value, 'Focus X')),
  body('focus_y').custom((value) => validateFocusCoordinate(value, 'Focus Y'))
];

async function getCompanyInfo() {
  const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1 LIMIT 1');
  return rows?.[0] || {};
}

async function getImpressions(categoryId = null) {
  const params = [];
  let sql =
    `SELECT i.id, i.name, i.alt, i.path, i.category_id, i.exclude_from_homepage, i.focus_x, i.focus_y, i.created_at, c.name AS category_name, c.alias AS category_alias
     FROM impressions i
     INNER JOIN categories c ON c.id = i.category_id`;

  if (categoryId) {
    sql += ' WHERE i.category_id = ?';
    params.push(categoryId);
  }

  sql += ' ORDER BY i.id DESC';

  const [impressions] = await db.query(sql, params);
  return impressions;
}

function buildFilterQuery(categoryId) {
  return categoryId ? `?category_id=${categoryId}` : '';
}

router.get('/cms/impression', isAuthenticated, async (req, res) => {
  try {
    await ensureImpressionColumns();
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const selectedCategoryId = Number(req.query.category_id) || null;
    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
    const impressions = await getImpressions(selectedCategoryId);
    const companyInfo = await getCompanyInfo();

    res.render('impression', {
      page_title: 'Impressie',
      categories,
      impressions,
      selectedCategoryId,
      impressionForm: { id: null, name: '', alt: '', path: '', category_id: '', exclude_from_homepage: 0, focus_x: 50, focus_y: 50 },
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
      await ensureImpressionColumns();
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid impression id');

      const selectedCategoryId = Number(req.query.category_id) || null;
      const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
      const impressions = await getImpressions(selectedCategoryId);
      const companyInfo = await getCompanyInfo();

      const [[impression]] = await db.query('SELECT * FROM impressions WHERE id = ?', [req.params.id]);
      if (!impression) return res.status(404).send('Impression not found');

      res.render('impression', {
        page_title: 'Impressie',
        categories,
        impressions,
        selectedCategoryId,
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
    await ensureImpressionColumns();
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const selectedCategoryId = Number(req.body.selected_category_id) || null;
    const result = validationResult(req);
    const payload = {
      name: clean(req.body.name),
      alt: clean(req.body.alt),
      path: clean(req.body.path),
      category_id: Number(req.body.category_id),
      exclude_from_homepage: normalizeHomepageFlag(req.body.exclude_from_homepage),
      focus_x: normalizeFocusCoordinate(req.body.focus_x),
      focus_y: normalizeFocusCoordinate(req.body.focus_y)
    };

    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
    const impressions = await getImpressions(selectedCategoryId);
    const companyInfo = await getCompanyInfo();

    if (!result.isEmpty()) {
      return res.status(422).render('impression', {
        page_title: 'Impressie',
        categories,
        impressions,
        selectedCategoryId,
        impressionForm: { id: null, ...payload },
        editing: false,
        errors: result.array(),
        saved: false,
        session: req.session,
        companyInfo
      });
    }

    await db.query(
      'INSERT INTO impressions (name, alt, path, category_id, exclude_from_homepage, focus_x, focus_y) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [payload.name || null, payload.alt || null, payload.path, payload.category_id, payload.exclude_from_homepage, payload.focus_x, payload.focus_y]
    );

    const query = selectedCategoryId ? `?saved=1&category_id=${selectedCategoryId}` : '?saved=1';
    res.redirect(`/cms/impression${query}`);
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
      await ensureImpressionColumns();
      req.app.set('views', ADMIN_VIEWS);
      if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

      const selectedCategoryId = Number(req.body.selected_category_id) || null;
      const result = validationResult(req);
      const payload = {
        id: Number(req.params.id),
        name: clean(req.body.name),
        alt: clean(req.body.alt),
        path: clean(req.body.path),
        category_id: Number(req.body.category_id),
        exclude_from_homepage: normalizeHomepageFlag(req.body.exclude_from_homepage),
        focus_x: normalizeFocusCoordinate(req.body.focus_x),
        focus_y: normalizeFocusCoordinate(req.body.focus_y)
      };

      const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
      const impressions = await getImpressions(selectedCategoryId);
      const companyInfo = await getCompanyInfo();

      if (!result.isEmpty()) {
        return res.status(422).render('impression', {
          page_title: 'Impressie',
          categories,
          impressions,
          selectedCategoryId,
          impressionForm: payload,
          editing: true,
          errors: result.array(),
          saved: false,
          session: req.session,
          companyInfo
        });
      }

      await db.query(
        'UPDATE impressions SET name = ?, alt = ?, path = ?, category_id = ?, exclude_from_homepage = ?, focus_x = ?, focus_y = ? WHERE id = ?',
        [payload.name || null, payload.alt || null, payload.path, payload.category_id, payload.exclude_from_homepage, payload.focus_x, payload.focus_y, payload.id]
      );

      const query = selectedCategoryId ? `?saved=1&category_id=${selectedCategoryId}` : '?saved=1';
      res.redirect(`/cms/impression/${payload.id}${query}`);
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
      const selectedCategoryId = Number(req.body.selected_category_id) || null;
      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid impression id');

      await db.query('DELETE FROM impressions WHERE id = ?', [req.params.id]);
      const query = selectedCategoryId ? `?saved=1&category_id=${selectedCategoryId}` : '?saved=1';
      res.redirect(`/cms/impression${query}`);
    } catch (err) {
      console.error('Error deleting impression:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

module.exports = router;
