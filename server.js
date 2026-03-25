/**
 * ==========================
 * Core & config
 * ==========================
 */
require('dotenv').config();

const express     = require('express');
const session     = require('express-session');
const compression = require('compression');
const crypto      = require('crypto');
const fs          = require('fs');
const path        = require('path');
const http        = require('http');
const https       = require('https');

const db = require('./db');

const app = express();
app.set('trust proxy', 1);

const PORT      = Number(process.env.PORT) || 3000;
const USE_HTTPS = String(process.env.USE_HTTPS).toLowerCase() === 'true';
const BASE_URL  = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_SECRET = String(process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(64).toString('hex');
const CERT_KEY_PATH = String(process.env.CERT_KEY_PATH || process.env.SSL_KEY_PATH || '').trim();
const CERT_FULLCHAIN_PATH = String(process.env.CERT_FULLCHAIN_PATH || process.env.SSL_CERT_PATH || '').trim();
const DEFAULT_GSC_META_TAG = '<meta name="google-site-verification" content="W7fe-Dge5RDO5ag_tI74e1x1R8v4tAQPgS65_vHu_E0">';

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET ontbreekt in .env, tijdelijke fallback wordt gebruikt.');
}

// ==========================
// View engine & views folder
// ==========================
app.set('views', [
  path.join(__dirname, 'views', 'pages'),
  path.join(__dirname, 'admin', 'views')
]);
app.set('view engine', 'ejs');

/**
 * ==========================
 * App locals (global data)
 * ==========================
 */
async function ensureCompanyInfoGscMetaColumn() {
  const [rows] = await db.query("SHOW COLUMNS FROM company_info LIKE 'gsc_meta_tag'");
  if (!rows.length) {
    await db.query("ALTER TABLE company_info ADD COLUMN gsc_meta_tag TEXT NULL AFTER gtm_head");
    await db.query(
      `UPDATE company_info
       SET gsc_meta_tag = ?
       WHERE id = 1 AND (gsc_meta_tag IS NULL OR TRIM(gsc_meta_tag) = '')`,
      [DEFAULT_GSC_META_TAG]
    );
  }
}

(async function loadCompanyInfo() {
  try {
    await ensureCompanyInfoGscMetaColumn();
    const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1');
    app.locals.companyInfo = rows[0] || {};
  } catch (err) {
    console.error('❌ Company info load failed:', err);
    app.locals.companyInfo = {};
  }
})();

db.startHealthCheck(30000);
db.subscribe(({ isHealthy }) => {
  if (isHealthy) {
    void (async () => {
      try {
        await ensureCompanyInfoGscMetaColumn();
        const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1');
        app.locals.companyInfo = rows[0] || {};
      } catch (err) {
        console.error('Company info refresh failed after reconnect:', err);
      }
    })();
  }
});

/**
 * Asset cache-busting helper
 */
app.locals.versionAsset = (assetPath) => {
  if (!assetPath) return assetPath;

  const [pathname, queryString = ''] = String(assetPath).split('?');
  let fullPath;

  if (pathname.startsWith('/private/')) {
    fullPath = path.join(__dirname, pathname.replace(/^\/+/, '').split('/').join(path.sep));
  } else if (pathname.startsWith('/cms/private/')) {
    fullPath = path.join(__dirname, pathname.replace(/^\/cms\/private\//, 'private/').split('/').join(path.sep));
  } else {
    const relativePath = pathname.replace(/^\/+/, '').split('/').join(path.sep);
    fullPath = path.join(__dirname, 'public', relativePath);
  }

  try {
    const stat = fs.statSync(fullPath);
    const params = new URLSearchParams(queryString);

    params.set('v', String(Math.trunc(stat.mtimeMs)));

    return `${pathname}?${params.toString()}`;
  } catch {
    return assetPath;
  }
};

/**
 * ==========================
 * Middlewares
 * ==========================
 */
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Required for WebP negotiation
app.use((req, res, next) => {
  res.setHeader('Vary', 'Accept');
  next();
});

// WebP middleware (MOET vóór static)
app.use(require('./workers/webp_middleware'));

// Static files
app.use(
  express.static('public', {
    maxAge: '30d',
    setHeaders: (res, file) => {
      if (file.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  })
);

// Private static
app.use('/private', express.static('private'));
app.use('/cms/private', express.static('private'));

app.use((req, res, next) => {
  const acceptsHtml = req.accepts(['html', 'json', 'text']) === 'html';
  const isOfflinePage = req.path === '/db-offline.html';
  const isPublicAsset =
    req.path.startsWith('/css/') ||
    req.path.startsWith('/js/') ||
    req.path.startsWith('/images/') ||
    req.path.startsWith('/media/') ||
    req.path === '/favicon.ico' ||
    req.path === '/robots.txt';

  if (db.isHealthy() || isOfflinePage || isPublicAsset) {
    return next();
  }

  if (!acceptsHtml) {
    return res.status(404).json({ error: 'Tijdelijke technische problemen. Probeer het later nog eens.' });
  }

  return res.status(404).sendFile(path.join(__dirname, 'public', 'db-offline.html'));
});

// Sessions
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }
  })
);

// Session available in views
app.use((req, res, next) => {
  res.locals.session = req.session || {};
  next();
});

/**
 * ==========================
 * Workers & routes
 * ==========================
 */
app.use(require('./workers/minify_middleware'));
app.use(require('./workers/sitemap'));
app.use(require('./workers/cms/cms_media'));
require('./workers/image_converter');

// CMS
app.use(require('./workers/cms/company'));
app.use(require('./workers/cms/redirects'));
app.use(require('./workers/cms/users'));
app.use(require('./workers/cms/account'));
app.use(require('./workers/cms/pages'));
app.use(require('./workers/cms/menu'));
app.use(require('./workers/cms/categories'));
app.use(require('./workers/cms/impressions'));

// Public & admin routing
app.use('/', require('./workers/web')(app));

/**
 * ==========================
 * Server start
 * ==========================
 */
function startHttp() {
  http.createServer(app).listen(PORT, () => {
    console.log(`🚀 HTTP server running on ${BASE_URL}`);
  });
}

function startHttps() {
  try {
    const key  = fs.readFileSync(CERT_KEY_PATH, 'utf8');
    const cert = fs.readFileSync(CERT_FULLCHAIN_PATH, 'utf8');

    https.createServer({ key, cert }, app).listen(PORT || 443, () => {
      console.log(`🔒 HTTPS server running on port ${PORT || 443}`);
    });
  } catch (err) {
    console.error('❌ SSL failed, falling back to HTTP:', err.message);
    startHttp();
  }
}

USE_HTTPS ? startHttps() : startHttp();
