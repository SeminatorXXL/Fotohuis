const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../../db');
const { isAuthenticated } = require('../auth');
const loginProcess = require('../loginprocess');
const { body, validationResult } = require('express-validator');
const { encryptSecret, isEncryptedSecret } = require('../../lib/secret_crypto');

const router = express.Router();
router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');
const TBL = 'company_info';
const trim = (v) => (v ?? '').toString().trim();
const DEFAULT_OPENING_DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const FAV_DIR = path.join(__dirname, '../../public/images/fav');
const MAX_FAVICON_SIZE = 2 * 1024 * 1024;

if (!fs.existsSync(FAV_DIR)) {
  fs.mkdirSync(FAV_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, FAV_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
      const safeExt = ['.png', '.ico', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext) ? ext : '.png';
      cb(null, `favicon-${Date.now()}${safeExt}`);
    }
  }),
  limits: { fileSize: MAX_FAVICON_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = ['.png', '.ico', '.jpg', '.jpeg', '.webp', '.svg'];
    if (!allowed.includes(ext)) {
      return cb(new Error('Alleen .png, .ico, .jpg, .jpeg, .webp en .svg zijn toegestaan voor favicon.'));
    }
    cb(null, true);
  }
});

function faviconUploadMiddleware(req, res, next) {
  upload.single('favicon_file')(req, res, (err) => {
    if (err) {
      req.session.errors = [{ msg: err.message || 'Favicon upload mislukt.' }];
      return res.redirect('/cms/general');
    }
    next();
  });
}

async function ensureFaviconColumn() {
  const [rows] = await db.query("SHOW COLUMNS FROM company_info LIKE 'favicon'");
  if (!rows.length) {
    await db.query("ALTER TABLE company_info ADD COLUMN favicon VARCHAR(255) NULL AFTER logo");
  }
}

async function ensureAddressColumns() {
  const specs = [
    { name: 'address_line_1', sql: "ALTER TABLE company_info ADD COLUMN address_line_1 VARCHAR(255) NULL AFTER phone" },
    { name: 'address_line_2', sql: "ALTER TABLE company_info ADD COLUMN address_line_2 VARCHAR(255) NULL AFTER address_line_1" },
    { name: 'postal_code', sql: "ALTER TABLE company_info ADD COLUMN postal_code VARCHAR(32) NULL AFTER address_line_2" },
    { name: 'city', sql: "ALTER TABLE company_info ADD COLUMN city VARCHAR(128) NULL AFTER postal_code" },
    { name: 'country', sql: "ALTER TABLE company_info ADD COLUMN country VARCHAR(128) NULL AFTER city" },
    { name: 'site_url', sql: "ALTER TABLE company_info ADD COLUMN site_url VARCHAR(255) NULL AFTER country" },
    { name: 'opening_hours', sql: "ALTER TABLE company_info ADD COLUMN opening_hours TEXT NULL AFTER site_url" },
    { name: 'external_scripts', sql: "ALTER TABLE company_info ADD COLUMN external_scripts TEXT NULL AFTER cookie" },
    { name: 'smtp_host', sql: "ALTER TABLE company_info ADD COLUMN smtp_host VARCHAR(255) NULL AFTER external_scripts" },
    { name: 'smtp_port', sql: "ALTER TABLE company_info ADD COLUMN smtp_port INT NULL AFTER smtp_host" },
    { name: 'smtp_user', sql: "ALTER TABLE company_info ADD COLUMN smtp_user VARCHAR(255) NULL AFTER smtp_port" },
    { name: 'smtp_pass', sql: "ALTER TABLE company_info ADD COLUMN smtp_pass VARCHAR(255) NULL AFTER smtp_user" },
    { name: 'mail_from', sql: "ALTER TABLE company_info ADD COLUMN mail_from VARCHAR(255) NULL AFTER smtp_pass" },
    { name: 'upload_allowed_ext', sql: "ALTER TABLE company_info ADD COLUMN upload_allowed_ext VARCHAR(255) NULL AFTER mail_from" },
    { name: 'upload_max_size', sql: "ALTER TABLE company_info ADD COLUMN upload_max_size VARCHAR(32) NULL AFTER upload_allowed_ext" },
    { name: 'gsc_meta_tag', sql: "ALTER TABLE company_info ADD COLUMN gsc_meta_tag TEXT NULL AFTER gtm_head" }
  ];

  for (const spec of specs) {
    const [rows] = await db.query(`SHOW COLUMNS FROM company_info LIKE '${spec.name}'`);
    if (!rows.length) {
      await db.query(spec.sql);
      if (spec.name === 'gsc_meta_tag') {
        await db.query(
          `UPDATE company_info
           SET gsc_meta_tag = ?
           WHERE id = 1 AND (gsc_meta_tag IS NULL OR TRIM(gsc_meta_tag) = '')`,
          ['<meta name="google-site-verification" content="W7fe-Dge5RDO5ag_tI74e1x1R8v4tAQPgS65_vHu_E0">']
        );
      }
    }
  }
}

function parseOpeningHoursRows(source) {
  if (!source) return [];
  let parsed = [];
  if (Array.isArray(source)) {
    parsed = source;
  } else if (typeof source === 'string') {
    try {
      const json = JSON.parse(source);
      if (Array.isArray(json)) parsed = json;
    } catch (_err) {
      parsed = source
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [left, right] = line.split(':');
          const day = trim(left || '');
          const range = trim(right || '');
          if (!range || /^gesloten$/i.test(range)) {
            return { day, open: '', close: '' };
          }
          const [open, close] = range.split('-').map((v) => trim(v));
          return { day, open, close };
        });
    }
  }

  return parsed
    .map((row) => ({
      day: trim(row?.day),
      open: trim(row?.open),
      close: trim(row?.close)
    }))
    .filter((row) => row.day || row.open || row.close);
}

function buildOpeningHoursFromBody(body, fallbackRaw = '') {
  const days = Array.isArray(body.opening_hours_day) ? body.opening_hours_day : (body.opening_hours_day ? [body.opening_hours_day] : []);
  const opens = Array.isArray(body.opening_hours_open) ? body.opening_hours_open : (body.opening_hours_open ? [body.opening_hours_open] : []);
  const closes = Array.isArray(body.opening_hours_close) ? body.opening_hours_close : (body.opening_hours_close ? [body.opening_hours_close] : []);
  const rowCount = Math.max(days.length, opens.length, closes.length);
  const rows = [];

  for (let i = 0; i < rowCount; i++) {
    const day = trim(days[i]);
    const open = trim(opens[i]);
    const close = trim(closes[i]);
    if (!day && !open && !close) continue;
    rows.push({ day, open, close });
  }

  if (!rows.length) {
    return parseOpeningHoursRows(fallbackRaw);
  }
  return rows.slice(0, 14);
}

function serializeOpeningHours(rows) {
  const normalized = parseOpeningHoursRows(rows);
  return JSON.stringify(normalized);
}

function parseExternalScripts(source) {
  if (!source) return [];

  let parsed = [];
  if (Array.isArray(source)) {
    parsed = source;
  } else if (typeof source === 'string') {
    try {
      const json = JSON.parse(source);
      if (Array.isArray(json)) {
        parsed = json;
      } else {
        parsed = source.split(/\r?\n/);
      }
    } catch (_err) {
      parsed = source.split(/\r?\n/);
    }
  }

  return parsed
    .map((entry) => trim(entry))
    .filter(Boolean);
}

function serializeExternalScripts(source) {
  return JSON.stringify(parseExternalScripts(source));
}

function buildExternalScriptsFromBody(body, fallbackRaw = '') {
  const entries = Array.isArray(body.external_scripts_entry)
    ? body.external_scripts_entry
    : (body.external_scripts_entry ? [body.external_scripts_entry] : []);

  const normalized = entries
    .map((entry) => trim(entry))
    .filter(Boolean);

  if (!normalized.length) {
    return parseExternalScripts(body.external_scripts || fallbackRaw);
  }

  return normalized;
}

function getSubmittedExternalScripts(body) {
  const entries = Array.isArray(body.external_scripts_entry)
    ? body.external_scripts_entry
    : (body.external_scripts_entry ? [body.external_scripts_entry] : []);

  return entries
    .map((entry) => trim(entry))
    .filter(Boolean);
}

// ✅ GET: altijd verse data + cache uit
router.get('/cms/general', isAuthenticated, async (req, res) => {
  try {
    await ensureFaviconColumn();
    await ensureAddressColumns();
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
    req.app.locals.companyInfo = companyInfo;

    const saved = req.session.saved || false;
    const errors = req.session.errors || [];
    const formdata = req.session.formdata || null;

    // opschonen
    req.session.saved = null;
    req.session.errors = null;
    req.session.formdata = null;

    const viewModel = formdata ? { ...companyInfo, ...formdata } : companyInfo;
    const smtpPassConfigured = Boolean(formdata?.smtp_pass || companyInfo.smtp_pass);
    viewModel.smtp_pass = formdata?.smtp_pass && !isEncryptedSecret(formdata.smtp_pass) ? formdata.smtp_pass : '';

    return res.render('general', {
      session: req.session,
      saved,
      errors,
      companyInfo: viewModel,
      smtpPassConfigured,
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
  body('favicon').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('email').trim().notEmpty().withMessage('E-mail is verplicht.').isEmail().withMessage('Ongeldig e-mailadres.').isLength({ max: 255 }),
  body('mobile').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('address_line_1').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('address_line_2').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('postal_code').optional({ checkFalsy: true }).trim().isLength({ max: 32 }),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 128 }),
  body('country').optional({ checkFalsy: true }).trim().isLength({ max: 128 }),
  body('site_url').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('opening_hours_day.*').optional({ checkFalsy: true }).trim().isLength({ max: 64 }),
  body('opening_hours_open.*').optional({ checkFalsy: true }).trim().isLength({ max: 16 }),
  body('opening_hours_close.*').optional({ checkFalsy: true }).trim().isLength({ max: 16 }),
  body('coc').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('instagram').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('facebook').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('linkedin').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('tiktok').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('gtm_head').optional({ checkFalsy: true }).trim(),
  body('gsc_meta_tag').optional({ checkFalsy: true }).trim(),
  body('gtm_body').optional({ checkFalsy: true }).trim(),
  body('cookie').optional({ checkFalsy: true }).trim(),
  body('external_scripts').optional({ checkFalsy: true }).trim(),
  body('external_scripts_entry.*').optional({ checkFalsy: true }).trim().isLength({ max: 10000 }),
  body('smtp_host').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('smtp_port').optional({ checkFalsy: true }).trim().isInt({ min: 1, max: 65535 }),
  body('smtp_user').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('smtp_pass').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('mail_from').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('upload_allowed_ext').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('upload_max_size').optional({ checkFalsy: true }).trim().isLength({ max: 32 }),
  body('recaptcha_public_key').optional({ checkFalsy: true }).trim(),
  body('recaptcha_private_key').optional({ checkFalsy: true }).trim(),
];

router.post('/cms/general', isAuthenticated, faviconUploadMiddleware, rules, async (req, res) => {
  try {
    await ensureFaviconColumn();
    await ensureAddressColumns();
    req.app.set('views', ADMIN_VIEWS);
    await Promise.all(rules.map(r => r.run(req)));
    const errors = validationResult(req);

    const [rows] = await db.query(`SELECT * FROM ${TBL} WHERE id = 1`);
    const current = rows.length ? rows[0] : {};
    const faviconPath = req.file ? `/images/fav/${req.file.filename}` : trim(req.body.favicon || current.favicon || '');
    const openingHoursRows = buildOpeningHoursFromBody(req.body, current.opening_hours || '');
    const openingHoursJson = serializeOpeningHours(openingHoursRows);
    const normalizedExternalScripts = buildExternalScriptsFromBody(req.body, current.external_scripts || '');
    const externalScriptsJson = serializeExternalScripts(normalizedExternalScripts);

    let smtpPassValue = current.smtp_pass || '';
    const submittedSmtpPass = trim(req.body.smtp_pass);

    if (submittedSmtpPass) {
      smtpPassValue = encryptSecret(submittedSmtpPass);
    } else if (smtpPassValue && !isEncryptedSecret(smtpPassValue)) {
      try {
        smtpPassValue = encryptSecret(smtpPassValue);
      } catch (_err) {
        smtpPassValue = current.smtp_pass || '';
      }
    }

    const data = {
      name: trim(req.body.name),
      logo: trim(req.body.logo),
      favicon: faviconPath,
      email: trim(req.body.email),
      mobile: trim(req.body.mobile),
      phone: trim(req.body.phone),
      address_line_1: trim(req.body.address_line_1),
      address_line_2: trim(req.body.address_line_2),
      postal_code: trim(req.body.postal_code),
      city: trim(req.body.city),
      country: trim(req.body.country),
      site_url: trim(req.body.site_url),
      opening_hours: openingHoursJson,
      coc: trim(req.body.coc),
      instagram: trim(req.body.instagram),
      facebook: trim(req.body.facebook),
      linkedin: trim(req.body.linkedin),
      tiktok: trim(req.body.tiktok),
      gtm_head: req.body.gtm_head ?? '',
      gsc_meta_tag: req.body.gsc_meta_tag ?? '',
      gtm_body: req.body.gtm_body ?? '',
      cookie: req.body.cookie ?? '',
      external_scripts: externalScriptsJson,
      smtp_host: trim(req.body.smtp_host),
      smtp_port: trim(req.body.smtp_port),
      smtp_user: trim(req.body.smtp_user),
      smtp_pass: smtpPassValue,
      mail_from: trim(req.body.mail_from),
      upload_allowed_ext: trim(req.body.upload_allowed_ext),
      upload_max_size: trim(req.body.upload_max_size),
      recaptcha_public_key: req.body.recaptcha_public_key ?? '',
      recaptcha_private_key: req.body.recaptcha_private_key ?? '',
    };

    const routeErrors = errors.array();
    if (routeErrors.length) {
      req.session.formdata = {
        ...data,
        opening_hours: openingHoursJson || serializeOpeningHours(DEFAULT_OPENING_DAYS.map((day) => ({ day, open: '', close: '' })))
      };
      req.session.errors = routeErrors;
      return res.redirect('/cms/general');
    }

    const sql = `
      UPDATE ${TBL}
      SET name=?, logo=?, favicon=?, email=?, mobile=?, phone=?, address_line_1=?, address_line_2=?, postal_code=?, city=?, country=?, site_url=?, opening_hours=?, coc=?, instagram=?, facebook=?, linkedin=?, tiktok=?, gtm_head=?, gsc_meta_tag=?, gtm_body=?, cookie=?, external_scripts=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, mail_from=?, upload_allowed_ext=?, upload_max_size=?, recaptcha_public_key=?, recaptcha_private_key=?
      WHERE id=1
    `;
    const vals = [
      data.name, data.logo, data.favicon, data.email, data.mobile, data.phone,
      data.address_line_1, data.address_line_2, data.postal_code, data.city, data.country, data.site_url, data.opening_hours, data.coc,
      data.instagram, data.facebook, data.linkedin, data.tiktok,
      data.gtm_head, data.gsc_meta_tag, data.gtm_body, data.cookie, data.external_scripts,
      data.smtp_host, data.smtp_port || null, data.smtp_user, data.smtp_pass, data.mail_from, data.upload_allowed_ext, data.upload_max_size,
      data.recaptcha_public_key, data.recaptcha_private_key
    ];
    await db.query(sql, vals);
    req.app.locals.companyInfo = { ...(req.app.locals.companyInfo || {}), ...data };

    req.session.saved = true;

    return res.redirect('/cms/general?ts=' + Date.now());
  } catch (err) {
    console.error('Error updating company:', err);
    req.session.errors = [{ msg: err.message || ('Databasefout: ' + err.message) }];
    return res.redirect('/cms/general');
  }
});

module.exports = router;
