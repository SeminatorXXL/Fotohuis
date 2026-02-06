const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../../db');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Views-map voor admin
const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');

const csrf = require('csrf-csrf');
// const csrfProtection = csrf();

const TBL = 'users';
// Auth helpers uit je bestaande stack
const { isAuthenticated } = require('../auth');

// Eenvoudige admin-check obv sessie
function isAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') return next();
  req.session.flash_error = 'Je hebt geen rechten om gebruikers te beheren.';
  return res.redirect('/cms/dashboard');
}

// ---------- Lijst ----------
router.get('/cms/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, active FROM users ORDER BY id DESC');
    const [company] = await db.query('SELECT name FROM company WHERE id = 1');

    // Render
    req.app.set('views', ADMIN_VIEWS);
    return res.render('users', {
      page_title: 'Users',
      page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      users,
      session: req.session,
      companyInfo: company?.[0] || {},
      _csrf: '' // geen csurf actief -> lege string om EJS tevreden te houden
    });
  } catch (err) {
    console.error('[users:list] DB error:', err);
    req.session.flash_error = 'Kon gebruikers niet laden.';
    return res.redirect('/cms/dashboard');
  }
});

// ---------- Create (GET) ----------
router.get('/cms/users/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [company] = await db.query('SELECT name FROM company WHERE id = 1');
    req.app.set('views', ADMIN_VIEWS);
    return res.render('user_form', {
      page_title: 'Create user',
      page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      mode: 'create',
      user: {},
      errors: [],
      session: req.session,
      companyInfo: company?.[0] || {},
      _csrf: ''
    });
  } catch (err) {
    console.error('[users:create:get] DB error:', err);
    req.session.flash_error = 'Kon formulier niet laden.';
    return res.redirect('/cms/users');
  }
});

// ---------- Create (POST) ----------
router.post(
  '/cms/users/create',
  isAuthenticated,
  isAdmin,
  body('name').trim().notEmpty().withMessage('Naam is verplicht.'),
  body('email').isEmail().withMessage('Voer een geldig e-mailadres in.')
    .bail()
    .custom(async (value) => {
      const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [value]);
      if (rows.length) throw new Error('Dit e-mailadres is al in gebruik.');
      return true;
    }),
  body('password').isLength({ min: 8 }).withMessage('Wachtwoord minimaal 8 tekens.'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Ongeldige rol.'),
  async (req, res) => {
    const errors = validationResult(req);
    const { name, email, password } = req.body;
    const role = req.body.role === 'admin' ? 'admin' : 'user';
    const active = req.body.active ? 1 : 1; // standaard aan

    if (!errors.isEmpty()) {
      const [company] = await db.query('SELECT name FROM company WHERE id = 1');
      req.app.set('views', ADMIN_VIEWS);
      return res.render('user_form', {
        page_title: 'Create user',
        page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
        mode: 'create',
        user: { name, email, role, active },
        errors: errors.array(),
        session: req.session,
        companyInfo: company?.[0] || {},
        _csrf: ''
      });
    }

    try {
      const hash = await bcrypt.hash(password, 12);
      await db.query(
        'INSERT INTO users (name, email, password, role, active) VALUES (?, ?, ?, ?, ?)',
        [name, email, hash, role, active]
      );
      req.session.flash_success = 'Gebruiker aangemaakt.';
      return res.redirect('/cms/users');
    } catch (err) {
      console.error('[users:create:post] DB error:', err);
      req.session.flash_error = 'Aanmaken mislukt.';
      return res.redirect('/cms/users');
    }
  }
);

// Helper om user te laden
async function getUserById(id) {
  const [rows] = await db.query('SELECT id, name, email, role, active FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

// ---------- Edit (GET) ----------
router.get('/cms/users/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      req.session.flash_error = 'Gebruiker niet gevonden.';
      return res.redirect('/cms/users');
    }
    const [company] = await db.query('SELECT name FROM company WHERE id = 1');
    req.app.set('views', ADMIN_VIEWS);
    return res.render('user_form', {
      page_title: 'Edit user',
      page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      mode: 'edit',
      user,
      errors: [],
      session: req.session,
      companyInfo: company?.[0] || {},
      _csrf: ''
    });
  } catch (err) {
    console.error('[users:edit:get] DB error:', err);
    req.session.flash_error = 'Kon gebruiker niet laden.';
    return res.redirect('/cms/users');
  }
});

// ---------- Edit (POST) ----------
router.post(
  '/cms/users/edit/:id',
  isAuthenticated,
  isAdmin,
  body('name').trim().notEmpty().withMessage('Naam is verplicht.'),
  body('email').isEmail().withMessage('Voer een geldig e-mailadres in.')
    .bail()
    .custom(async (value, { req }) => {
      const [rows] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ?', [value, req.params.id]);
      if (rows.length) throw new Error('Dit e-mailadres is al in gebruik.');
      return true;
    }),
  body('password').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('Wachtwoord minimaal 8 tekens.'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Ongeldige rol.'),
  async (req, res) => {
    const errors = validationResult(req);
    const { name, email } = req.body;
    const role = req.body.role === 'admin' ? 'admin' : 'user';
    const active = req.body.active ? 1 : 0;
    const id = req.params.id;

    if (!errors.isEmpty()) {
      const [company] = await db.query('SELECT name FROM company WHERE id = 1');
      req.app.set('views', ADMIN_VIEWS);
      return res.render('user_form', {
        page_title: 'Edit user',
        page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
        mode: 'edit',
        user: { id, name, email, role, active },
        errors: errors.array(),
        session: req.session,
        companyInfo: company?.[0] || {},
        _csrf: ''
      });
    }

    try {
      let sql, params;

      if (req.body.password) {
        const hash = await bcrypt.hash(req.body.password, 12);
        sql = 'UPDATE users SET name=?, email=?, role=?, active=?, password=? WHERE id=?';
        params = [name, email, role, active, hash, id];
      } else {
        sql = 'UPDATE users SET name=?, email=?, role=?, active=? WHERE id=?';
        params = [name, email, role, active, id];
      }

      await db.query(sql, params);
      req.session.flash_success = 'Gebruiker bijgewerkt.';
      return res.redirect('/cms/users');
    } catch (err) {
      console.error('[users:edit:post] DB error:', err);
      req.session.flash_error = 'Bijwerken mislukt.';
      return res.redirect('/cms/users');
    }
  }
);

// ---------- Delete (POST) ----------
router.post('/cms/users/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    // voorkom zelf-verwijdering
    if (req.session?.user?.id === id) {
      req.session.flash_error = 'Je kunt je eigen account niet verwijderen.';
      return res.redirect('/cms/users');
    }
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    req.session.flash_success = 'Gebruiker verwijderd.';
    return res.redirect('/cms/users');
  } catch (err) {
    console.error('[users:delete] DB error:', err);
    req.session.flash_error = 'Verwijderen mislukt.';
    return res.redirect('/cms/users');
  }
});

module.exports = router;
