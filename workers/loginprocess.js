const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../db');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const ADMIN_VIEWS = path.join(__dirname, '../admin/views');

// GET /login
router.get('/login', (req, res) => {
  req.app.set('views', ADMIN_VIEWS);
  res.render('login', { error: null });
});

// POST /login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Voer een geldig e-mailadres in'),
    body('password').notEmpty().withMessage('Wachtwoord is verplicht')
  ],
  async (req, res) => {
    req.app.set('views', ADMIN_VIEWS);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('login', { error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      // Haal ook role & active op
      const [rows] = await db.query('SELECT id, name, email, password, role, active FROM users WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.render('login', { error: 'Onjuiste inloggegevens' });
      }

      const user = rows[0];
      if (user.active === 0) {
        return res.render('login', { error: 'Je account is inactief.' });
      }

      const stored = user.password || '';
      const looksHashed = /^\$2[aby]\$/.test(stored);

      let ok = false;

      if (looksHashed) {
        ok = await bcrypt.compare(password, stored);
      } else {
        // Migratie-pad: platte tekst -> meteen rehashen
        ok = password === stored;
        if (ok) {
          const newHash = await bcrypt.hash(password, 12);
          await db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
        }
      }

      if (!ok) {
        return res.render('login', { error: 'Onjuiste inloggegevens' });
      }

      // ✅ Login gelukt — zet role in sessie
      req.session.isAuthenticated = true;
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        active: user.active
      };
      req.session.cookie.maxAge = 60 * 60 * 1000; // 1 uur

      // Redirect to originally requested URL if present
      const redirectTo = req.session.returnTo || '/cms/dashboard';
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).send('Interne serverfout');
    }
  }
);

// POST /logout
router.post('/logout', (req, res) => {
  req.session?.destroy(() => res.redirect('/login'));
});

module.exports = router;
