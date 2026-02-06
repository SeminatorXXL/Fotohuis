const express = require('express');
const path = require('path');
const db = require('../../db');
const bcrypt = require('bcrypt');
const { isAuthenticated } = require('../auth');
const loginProcess = require('../loginprocess');
const { validationResult, body } = require('express-validator');
const { sanitizeRich, clean } = require('../sanitize');
const session = require('express-session');

const router = express.Router();
router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');

// Helpers
const setFlash = (req, type, message) => {
  req.session.flash = { type, message };
};

// GET: account
router.get('/cms/account', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render(path.join(ADMIN_VIEWS, 'account.ejs'), {
    page_title: 'Account',
    errors: [],
    saved: false,
    session: req.session
  });
});

// POST: change password
router.post(
  '/cms/account/password',
  [
    body('current_password').trim().notEmpty().withMessage('Current password is required.'),
    body('new_password')
      .trim()
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('New password needs at least 1 uppercase letter.')
      .matches(/[a-z]/).withMessage('New password needs at least 1 lowercase letter.')
      .matches(/\d/).withMessage('New password needs at least 1 digit.'),
    body('confirm_password')
      .custom((val, { req }) => val === req.body.new_password)
      .withMessage('Password confirmation does not match.')
  ],
  async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render(path.join(ADMIN_VIEWS, 'account.ejs'), {
        page_title: 'Account',
        errors: errors.array(),
        saved: false,
        session: req.session
      });
    }

    try {
      const userId = req.session.user.id;

      // 1) Haal huidige hash op
      const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
      if (!rows || !rows.length) {
        setFlash(req, 'danger', 'User not found.');
        return res.redirect('/cms/account');
      }

      console.log('Stored hash:', rows[0].password);
      console.log('current:', req.body.current_password);
      const ok = await bcrypt.compare(req.body.current_password, rows[0].password || '');

      if (!ok) {
        return res.render(path.join(ADMIN_VIEWS, 'account.ejs'), {
          page_title: 'Account',
          errors: [{ msg: 'Current password is incorrect.' }],
          saved: false,
          session: req.session

        });
      }

      // 2) Update met nieuwe hash
      const newHash = await bcrypt.hash(req.body.new_password, 12);
      await db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, userId]);

      // 3) Regenerate session id for security
      req.session.regenerate(err => {
        if (err) {
          // Als regenereren mislukt, gewoon flash + redirect
          setFlash(req, 'success', 'Password changed successfully.');
          return res.redirect('/cms/account');
        }
        // Zet user terug op de sessie (afhankelijk van jouw loginProcess)
        req.session.user = { ...req.user }; // behoud bestaande user info
        setFlash(req, 'success', 'Password changed successfully.');
        res.redirect('/cms/account');
      });
    } catch (e) {
      console.error(e);
      setFlash(req, 'danger', 'Unexpected error. Please try again.');
      res.redirect('/cms/account');
    }
  }
);

module.exports = router;
