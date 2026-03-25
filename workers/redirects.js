const express = require('express');
const db = require('../db');

const router = express.Router();

const REDIRECT_CACHE_TTL_MS = 5000;

let redirectsCache = [];
let redirectsCacheExpiresAt = 0;
let redirectsLoadingPromise = null;

function normalizePath(pathname = '') {
  const value = String(pathname || '').trim();
  if (!value || value === '/') return '/';

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
}

function normalizeTarget(target = '') {
  const value = String(target || '').trim();
  if (!value) return '/';
  if (/^https?:\/\//i.test(value)) return value;
  return normalizePath(value);
}

async function loadRedirects(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && redirectsCacheExpiresAt > now && redirectsCache.length) {
    return redirectsCache;
  }

  if (!forceRefresh && redirectsLoadingPromise) {
    return redirectsLoadingPromise;
  }

  redirectsLoadingPromise = (async () => {
    const [rows] = await db.query('SELECT id, `from`, `to`, `type` FROM `redirects`');
    redirectsCache = rows.map((row) => ({
      id: Number(row.id),
      from: normalizePath(row.from),
      to: normalizeTarget(row.to),
      type: Number(row.type) === 302 ? 302 : 301
    }));
    redirectsCacheExpiresAt = Date.now() + REDIRECT_CACHE_TTL_MS;
    return redirectsCache;
  })();

  try {
    return await redirectsLoadingPromise;
  } finally {
    redirectsLoadingPromise = null;
  }
}

router.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const requestPath = normalizePath(req.path);

  try {
    const redirects = await loadRedirects();
    const match = redirects.find((redirect) => redirect.from === requestPath);

    if (!match) {
      return next();
    }

    const queryString = req.originalUrl.includes('?')
      ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
      : '';

    return res.redirect(match.type, `${match.to}${queryString}`);
  } catch (err) {
    console.error('Redirect lookup failed:', err);
    return next();
  }
});

module.exports = router;
