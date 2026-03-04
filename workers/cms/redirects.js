const express = require('express');
const path = require('path');
const db = require('../../db');
const { body, validationResult, param } = require('express-validator');

let loginProcess = null;
try { loginProcess = require('../loginprocess'); } catch (_) {}

const router = express.Router();
if (loginProcess) router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');
const TBL = 'redirects';

const cleanPath = (s = '') => s.trim().replace(/\s+/g, '');
const isUrlOrPath = (v) => /^https?:\/\//i.test(v) || v.startsWith('/');

const redirectRules = [
  body('from')
    .customSanitizer(cleanPath)
    .notEmpty().withMessage('Van-pad is verplicht.')
    .custom((v) => v.startsWith('/')).withMessage('Van moet beginnen met "/".')
    .isLength({ max: 255 }).withMessage('Van is te lang (max 255).'),
  body('to')
    .customSanitizer(cleanPath)
    .notEmpty().withMessage('Naar-pad is verplicht.')
    .custom(isUrlOrPath).withMessage('Naar moet een URL (http...) zijn of met "/" beginnen.')
    .isLength({ max: 255 }).withMessage('Naar is te lang (max 255).'),
  body('type')
    .isIn(['301', '302']).withMessage('Type moet 301 of 302 zijn.')
];

router.get('/cms/redirects', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, \`from\`, \`to\`, \`type\` FROM ${TBL} ORDER BY id ASC`
    );

    res.render(path.join(ADMIN_VIEWS, 'redirects.ejs'), {
      page_title: 'Omleidingen',
      rows,
      errors: [],
      success: req.flash ? req.flash('success') : null,
      error: req.flash ? req.flash('error') : null,
      createDraft: { from: '', to: '', type: '301' },
      session: req.session
    });
  } catch (err) {
    console.error('Redirects list error:', err);
    if (req.flash) req.flash('error', 'Kon omleidingen niet laden.');
    res.status(500).render(path.join(ADMIN_VIEWS, 'redirects.ejs'), {
      page_title: 'Omleidingen',
      rows: [],
      errors: [{ msg: 'Interne fout bij het laden.' }],
      success: null,
      error: 'Interne fout bij het laden.',
      createDraft: { from: '', to: '', type: '301' },
      session: req.session
    });
  }
});

router.post('/cms/redirects/create', redirectRules, async (req, res) => {
  const errors = validationResult(req);
  const { from, to, type } = req.body;

  if (!errors.isEmpty()) {
    try {
      const [rows] = await db.query(
        `SELECT id, \`from\`, \`to\`, \`type\` FROM ${TBL} ORDER BY id ASC`
      );
      return res.status(400).render(path.join(ADMIN_VIEWS, 'redirects.ejs'), {
        page_title: 'Omleidingen',
        rows,
        errors: errors.array(),
        success: null,
        error: 'Controleer de invoer (toevoegen).',
        createDraft: { from, to, type }
      });
    } catch (err) {
      console.error('Create validation reload error:', err);
      return res.status(500).send('Interne fout.');
    }
  }

  try {
    const [dups] = await db.query(
      `SELECT id FROM ${TBL} WHERE \`from\` = ? LIMIT 1`,
      [from]
    );
    if (dups.length) {
      if (req.flash) req.flash('error', 'Er bestaat al een omleiding met dit van-pad.');
      return res.redirect('/cms/redirects');
    }

    await db.query(
      `INSERT INTO ${TBL} (\`from\`, \`to\`, \`type\`) VALUES (?, ?, ?)`,
      [from, to, type]
    );

    if (req.flash) req.flash('success', 'Omleiding aangemaakt.');
    res.redirect('/cms/redirects');
  } catch (err) {
    console.error('Redirect create error:', err);
    if (req.flash) req.flash('error', 'Aanmaken is mislukt.');
    res.redirect('/cms/redirects');
  }
});

router.post('/cms/redirects/update/:id', [param('id').isInt().toInt(), ...redirectRules], async (req, res) => {
  const errors = validationResult(req);
  const { id } = req.params;
  const { from, to, type } = req.body;

  if (!errors.isEmpty()) {
    if (req.flash) req.flash('error', 'Controleer de invoer (bewerken).');
    return res.redirect('/cms/redirects');
  }

  try {
    const [ex] = await db.query(`SELECT id FROM ${TBL} WHERE id = ?`, [id]);
    if (!ex.length) {
      if (req.flash) req.flash('error', 'Omleiding niet gevonden.');
      return res.redirect('/cms/redirects');
    }

    const [dups] = await db.query(
      `SELECT id FROM ${TBL} WHERE \`from\` = ? AND id <> ? LIMIT 1`,
      [from, id]
    );
    if (dups.length) {
      if (req.flash) req.flash('error', 'Er bestaat al een andere omleiding met dit van-pad.');
      return res.redirect('/cms/redirects');
    }

    await db.query(
      `UPDATE ${TBL} SET \`from\` = ?, \`to\` = ?, \`type\` = ? WHERE id = ?`,
      [from, to, type, id]
    );

    if (req.flash) req.flash('success', 'Omleiding opgeslagen.');
    res.redirect('/cms/redirects');
  } catch (err) {
    console.error('Redirect update error:', err);
    if (req.flash) req.flash('error', 'Opslaan is mislukt.');
    res.redirect('/cms/redirects');
  }
});

router.post('/cms/redirects/delete/:id', [param('id').isInt().toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.flash) req.flash('error', 'Ongeldige aanvraag (verwijderen).');
    return res.redirect('/cms/redirects');
  }

  try {
    await db.query(`DELETE FROM ${TBL} WHERE id = ?`, [req.params.id]);
    if (req.flash) req.flash('success', 'Omleiding verwijderd.');
    res.redirect('/cms/redirects');
  } catch (err) {
    console.error('Redirect delete error:', err);
    if (req.flash) req.flash('error', 'Verwijderen is mislukt.');
    res.redirect('/cms/redirects');
  }
});

module.exports = router;
