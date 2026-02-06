const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/artist', (req, res) => res.redirect(301, '/artists'));
router.get('/artist/:alias', (req, res) => res.redirect(301, `/artists/${req.params.alias}`));

/**
 * Utility: zorg dat paden altijd met een leading slash beginnen.
 */
function normalizePath(p) {
  if (!p) return '/';
  return p.startsWith('/') ? p : `/${p}`;
}

(async () => {
  try {
    // Haal alle redirects op (id, from, to, type)
    const [rows] = await db.query('SELECT `from`, `to`, `type` FROM `redirects`');

    rows.forEach(r => {
      const fromPath = normalizePath(r.from);
      const toTarget = r.to || '/';
      const code = Number(r.type) === 302 ? 302 : 301; // default 301

      // Registreer exacte GET‑route
      router.get(fromPath, (req, res) => {
        // Optioneel: querystring meenemen
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        // Als je querystring NIET wilt meenemen, gebruik dan gewoon: res.redirect(code, toTarget);
        res.redirect(code, `${toTarget}${qs}`);
      });
    });

    console.log(`✅ Redirects geladen: ${rows.length}`);
  } catch (err) {
    console.error('❌ Fout bij laden redirects:', err);
  }
})();

module.exports = router;
