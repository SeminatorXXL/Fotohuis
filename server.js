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

const PORT      = Number(process.env.PORT) || 3000;
const USE_HTTPS = String(process.env.USE_HTTPS).toLowerCase() === 'true';
const BASE_URL  = process.env.BASE_URL || `http://localhost:${PORT}`;

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
(async function loadCompanyInfo() {
  try {
    const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1');
    app.locals.companyInfo = rows[0] || {};
  } catch (err) {
    console.error('❌ Company info load failed:', err);
    app.locals.companyInfo = {};
  }
})();

/**
 * Asset cache-busting helper
 */
const assetCache = new Map();

app.locals.versionAsset = (assetPath) => {
  if (process.env.NODE_ENV === 'production' && assetCache.has(assetPath)) {
    return assetCache.get(assetPath);
  }

  try {
    const fullPath = path.join(__dirname, 'public', assetPath);
    const stat = fs.statSync(fullPath);
    const versioned = `${assetPath}?v=${stat.mtime.getTime()}`;

    if (process.env.NODE_ENV === 'production') {
      assetCache.set(assetPath, versioned);
    }
    return versioned;
  } catch {
    return `${assetPath}?v=${Date.now()}`;
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

// Sessions
app.use(
  session({
    secret: crypto.randomBytes(64).toString('hex'),
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
    const key  = fs.readFileSync(process.env.CERT_KEY_PATH, 'utf8');
    const cert = fs.readFileSync(process.env.CERT_FULLCHAIN_PATH, 'utf8');

    https.createServer({ key, cert }, app).listen(PORT || 443, () => {
      console.log(`🔒 HTTPS server running on port ${PORT || 443}`);
    });
  } catch (err) {
    console.error('❌ SSL failed, falling back to HTTP:', err.message);
    startHttp();
  }
}

USE_HTTPS ? startHttps() : startHttp();
