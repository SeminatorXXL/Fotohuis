const express = require('express');
const path = require('path');
const db = require('../../db');
const { isAuthenticated } = require('../auth');
const loginProcess = require('../loginprocess');
const { validationResult } = require('express-validator');
const { updateRules } = require('../validators/pagesValidator'); // 👈 uit bestaande map
const { sanitizeRich, clean } = require('../sanitize');          // 👈 losse file in /workers

const router = express.Router();
router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');

// Lijst: alleen pages die gekoppelde page_content hebben
router.get('/cms/pages', isAuthenticated, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const [pages] = await db.query(`
      SELECT p.id, p.name, p.alias, p.view
      FROM pages p
      INNER JOIN page_content pc ON pc.page_id = p.id
      ORDER BY p.id ASC
    `);

    const [elements] = await db.query(`SELECT * FROM elements ORDER BY id ASC`);

    res.render('pages', {
      page_title: 'Pages',
      page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      pages,
      elements,
      session: req.session,
    });
  } catch (err) {
    console.error('Error loading CMS Pages:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Detail/Bewerk
router.get('/cms/pages/:id', isAuthenticated, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const pageId = Number(req.params.id);
    if (Number.isNaN(pageId)) return res.status(400).send('Invalid page id');

    const [[pageRow]] = await db.query('SELECT * FROM pages WHERE id = ?', [pageId]);
    if (!pageRow) return res.status(404).send('Page not found');

    const [pcRows] = await db.query('SELECT * FROM page_content WHERE page_id = ?', [pageId]);

    const content = pcRows[0] || {
      id: null,
      page_id: pageRow.id,
      main_title: '',
      banner: '',
      banner_alt: '',
      banner_text: '',
      seo_image_1: '',
      seo_image_alt_1: '',
      seo_title_1: '',
      seo_text_1: '',
      seo_image_2: '',
      seo_image_alt_2: '',
      seo_title_2: '',
      seo_text_2: '',
      seo_image_3: '',
      seo_image_alt_3: '',
      seo_title_3: '',
      seo_text_3: '',
      quote: '',
      quote_image: ''
    };

    res.render('page_content', {
      page_title: `Page content: ${pageRow.name}`,
      page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      page: pageRow,
      content,
      saved: req.query.saved === '1',
      errors: [],
      session: req.session
    });
  } catch (err) {
    console.error('Error loading page content:', err);
    res.status(500).send('Internal Server Error');
  }
});

// OPSLAAN
router.post('/cms/pages/:id', isAuthenticated, updateRules, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

    const pageId = Number(req.params.id);
    if (Number.isNaN(pageId)) return res.status(400).send('Invalid page id');

    const [[pageRow]] = await db.query('SELECT * FROM pages WHERE id = ?', [pageId]);
    if (!pageRow) return res.status(404).send('Page not found');

    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(422).render('page_content', {
        page_title: `Page content: ${pageRow.name}`,
        page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
        page: pageRow,
        content: { ...req.body, page_id: pageId },
        saved: false,
        errors: result.array()
      });
    }

    const payload = {
      page_title: sanitizeRich(req.body.page_title),
      page_description: clean(req.body.page_description),

      main_title: clean(req.body.main_title),
      banner: clean(req.body.banner),
      banner_alt: clean(req.body.banner_alt),

      banner_text: sanitizeRich(req.body.banner_text),

      seo_image_1: clean(req.body.seo_image_1),
      seo_image_alt_1: clean(req.body.seo_image_alt_1),
      seo_title_1: clean(req.body.seo_title_1),
      seo_text_1: sanitizeRich(req.body.seo_text_1),

      seo_image_2: clean(req.body.seo_image_2),
      seo_image_alt_2: clean(req.body.seo_image_alt_2),
      seo_title_2: clean(req.body.seo_title_2),
      seo_text_2: sanitizeRich(req.body.seo_text_2),

      seo_image_3: clean(req.body.seo_image_3),
      seo_image_alt_3: clean(req.body.seo_image_alt_3),
      seo_title_3: clean(req.body.seo_title_3),
      seo_text_3: sanitizeRich(req.body.seo_text_3),

      quote: clean(req.body.quote),
      quote_image: clean(req.body.quote_image)
    };

    const [[existing]] = await db.query(
      'SELECT id FROM page_content WHERE page_id = ? LIMIT 1',
      [pageId]
    );

    if (existing) {
      await db.query(
        'UPDATE pages SET page_title = ?, page_description = ? WHERE id = ?',
        [payload.page_title, payload.page_description, pageId]
      );
      await db.query(
        `UPDATE page_content
           SET main_title = ?, banner = ?, banner_alt = ?, banner_text = ?,
               seo_image_1 = ?, seo_image_alt_1 = ?, seo_title_1 = ?, seo_text_1 = ?,
               seo_image_2 = ?, seo_image_alt_2 = ?, seo_title_2 = ?, seo_text_2 = ?,
               seo_image_3 = ?, seo_image_alt_3 = ?, seo_title_3 = ?, seo_text_3 = ?,
               quote = ?, quote_image = ?
         WHERE page_id = ?`,
        [
          payload.main_title, payload.banner, payload.banner_alt, payload.banner_text,
          payload.seo_image_1, payload.seo_image_alt_1, payload.seo_title_1, payload.seo_text_1,
          payload.seo_image_2, payload.seo_image_alt_2, payload.seo_title_2, payload.seo_text_2,
          payload.seo_image_3, payload.seo_image_alt_3, payload.seo_title_3, payload.seo_text_3,
          payload.quote, payload.quote_image,
          pageId
        ]
      );
    } else {
      await db.query(
        `INSERT INTO page_content
          (page_id, main_title, banner, banner_alt, banner_text,
           seo_image_1, seo_image_alt_1, seo_title_1, seo_text_1,
           seo_image_2, seo_image_alt_2, seo_title_2, seo_text_2,
           seo_image_3, seo_image_alt_3, seo_title_3, seo_text_3,
           quote, quote_image)
         VALUES (?,?,?,?,?,
                 ?,?,?,?,
                 ?,?,?,?,
                 ?,?,?,?,
                 ?,?)`,
        [
          pageId,
          payload.main_title, payload.banner, payload.banner_alt, payload.banner_text,
          payload.seo_image_1, payload.seo_image_alt_1, payload.seo_title_1, payload.seo_text_1,
          payload.seo_image_2, payload.seo_image_alt_2, payload.seo_title_2, payload.seo_text_2,
          payload.seo_image_3, payload.seo_image_alt_3, payload.seo_title_3, payload.seo_text_3,
          payload.quote, payload.quote_image
        ]
      );
    }

    return res.redirect(`/cms/pages/${pageId}?saved=1`);
  } catch (err) {
    console.error('Error saving page content:', err);
    return res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
