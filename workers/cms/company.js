const express = require('express');
const path = require('path');
const db = require('../../db');
const { isAuthenticated } = require('../auth');
const loginProcess = require('../loginprocess');
const { body, validationResult } = require('express-validator');

const router = express.Router();
router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');
const TBL = 'company';
const trim = (v) => (v ?? '').toString().trim();

// ✅ GET: altijd verse data + cache uit
router.get('/cms/general', isAuthenticated, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);

    // cache-preventie voor zekerheid
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });

    const [rows] = await db.query(`SELECT * FROM ${TBL} WHERE id = 1`);
    const companyInfo = rows.length ? rows[0] : {};

    const saved = req.session.saved || false;
    const errors = req.session.errors || [];
    const formdata = req.session.formdata || null;

    // opschonen
    req.session.saved = null;
    req.session.errors = null;
    req.session.formdata = null;

    const viewModel = formdata ? { ...companyInfo, ...formdata } : companyInfo;

    return res.render('general', {
      session: req.session,
      saved,
      errors,
      companyInfo: viewModel,
    });
  } catch (err) {
    console.error('Error loading company:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// Validatieregels
const rules = [
  body('name').trim().notEmpty().withMessage('Bedrijfsnaam is verplicht.').isLength({ max: 255 }),
  body('logo').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('email').trim().notEmpty().withMessage('E-mail is verplicht.').isEmail().withMessage('Ongeldig e-mailadres.').isLength({ max: 255 }),
  body('email2').optional({ checkFalsy: true }).isEmail().withMessage('Ongeldig secundair e-mailadres.').isLength({ max: 255 }),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('coc').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('instagram').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('facebook').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('linkedin').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('tiktok').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('gtm_head').optional({ checkFalsy: true }).trim(),
  body('gtm_body').optional({ checkFalsy: true }).trim(),
  body('cookie').optional({ checkFalsy: true }).trim(),
  body('recaptcha_public_key').optional({ checkFalsy: true }).trim(),
];

router.post('/cms/general', isAuthenticated, rules, async (req, res) => {
  try {
    req.app.set('views', ADMIN_VIEWS);
    await Promise.all(rules.map(r => r.run(req)));
    const errors = validationResult(req);

    const data = {
      name: trim(req.body.name),
      logo: trim(req.body.logo),
      email: trim(req.body.email),
      email2: trim(req.body.email2),
      phone: trim(req.body.phone),
      coc: trim(req.body.coc),
      instagram: trim(req.body.instagram),
      facebook: trim(req.body.facebook),
      linkedin: trim(req.body.linkedin),
      tiktok: trim(req.body.tiktok),
      gtm_head: req.body.gtm_head ?? '',
      gtm_body: req.body.gtm_body ?? '',
      cookie: req.body.cookie ?? '',
      recaptcha_public_key: req.body.recaptcha_public_key ?? '',
    };

    if (!errors.isEmpty()) {
      req.session.errors = errors.array();
      req.session.formdata = data;
      return res.redirect('/cms/general');
    }

    const sql = `
      UPDATE ${TBL}
      SET name=?, logo=?, email=?, email2=?, phone=?, coc=?, instagram=?, facebook=?, linkedin=?, tiktok=?, gtm_head=?, gtm_body=?, cookie=?, recaptcha_public_key=?
      WHERE id=1
    `;
    const vals = [
      data.name, data.logo, data.email, data.email2, data.phone, data.coc,
      data.instagram, data.facebook, data.linkedin, data.tiktok,
      data.gtm_head, data.gtm_body, data.cookie, data.recaptcha_public_key
    ];
    await db.query(sql, vals);

    req.session.saved = true;

    return res.redirect('/cms/general?ts=' + Date.now());
  } catch (err) {
    console.error('Error updating company:', err);
    req.session.errors = [{ msg: 'Databasefout: ' + err.message }];
    return res.redirect('/cms/general');
  }
});

module.exports = router;
