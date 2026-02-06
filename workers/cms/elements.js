const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../../db');
const { isAuthenticated } = require('../auth');
const { body, validationResult } = require('express-validator');

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');

// Alle routes na login
router.use('/cms', isAuthenticated);

/**
 * GET /cms/elements/:id
 * Toont het formulier voor één element.
 */
router.get('/cms/elements/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await db.query('SELECT * FROM `elements` WHERE `id` = ?', [id]);
    if (!rows.length) {
      req.app.set('views', ADMIN_VIEWS);
      return res.status(404).render('404', {
        page: { page_title: 'Niet gevonden', page_description: 'Element bestaat niet.' }
      });
    }

    const element = rows[0];
    req.app.set('views', ADMIN_VIEWS);
    return res.render('element_form', {
      page_title: `Element bewerken: ${element.name || ('#' + element.id)}`,
      page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      element,
      errors: [],
      saved: String(req.query.saved) === '1',
      session: req.session,
      csrfToken: null
    });
  } catch (err) {
    console.error('Elements GET error:', err);
    req.app.set('views', ADMIN_VIEWS);
    return res.status(500).render('error', { message: 'Er ging iets mis bij het laden van het element.' });
  }
});

/**
 * POST /cms/elements/:id
 * Slaat wijzigingen op voor één element (zonder 'name' te wijzigen).
 */
router.post(
  '/cms/elements/:id',
  [
    body('title').trim().optional({ checkFalsy: true }),
    body('text').trim().optional({ checkFalsy: true }),
    body('title2').trim().optional({ checkFalsy: true }),
    body('text2').trim().optional({ checkFalsy: true })
  ],
  async (req, res) => {
    const id = Number(req.params.id);
    const errors = validationResult(req);

    const payload = {
      id,
      title: req.body.title ?? '',
      text: req.body.text ?? '',
      title2: req.body.title2 ?? '',
      text2: req.body.text2 ?? ''
    };

    if (!errors.isEmpty()) {
      req.app.set('views', ADMIN_VIEWS);
      return res.status(422).render('element_form', {
        page_title: `Element bewerken: #${id}`,
        page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
        element: { id, name: req.body.name || '', ...payload },
        errors: errors.array(),
        saved: false,
        session: req.session,
        csrfToken: null
      });
    }

    try {
      const [result] = await db.query(
        'UPDATE `elements` SET `title`=?, `text`=?, `title2`=?, `text2`=? WHERE `id`=?',
        [payload.title, payload.text, payload.title2, payload.text2, id]
      );
      if (result.affectedRows !== 1) throw new Error('Update failed');

      return res.redirect(`/cms/elements/${id}?saved=1`);
    } catch (err) {
      console.error('Elements POST error:', err);
      req.app.set('views', ADMIN_VIEWS);
      return res.status(500).render('element_form', {
        page_title: `Element bewerken: #${id}`,
        page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
        element: { id, ...payload },
        errors: [{ msg: 'Er trad een fout op tijdens het opslaan.' }],
        saved: false,
        session: req.session,
        csrfToken: null
      });
    }
  }
);

module.exports = router;
