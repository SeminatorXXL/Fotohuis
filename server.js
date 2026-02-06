const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const compression = require('compression');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const db = require('./db');

// === Globale variabele companyInfo beschikbaar maken ===
(async () => {
  try {
    const [companyInfo] = await db.query('SELECT * FROM company WHERE id = 1');
    app.locals.companyInfo = companyInfo.length > 0 ? companyInfo[0] : {};
  } catch (err) {
    console.error('❌ Kon company info niet laden:', err);
    app.locals.companyInfo = {};
  }
})();

// === Helper voor cache-busting van assets ===
const assetVersionCache = new Map();
app.locals.versionAsset = (assetPath) => {
  // Gebruik de gecachte versie als die bestaat in productie
  if (process.env.NODE_ENV === 'production' && assetVersionCache.has(assetPath)) {
    return assetVersionCache.get(assetPath);
  }

  try {
    const publicPath = path.join(__dirname, 'public', assetPath);
    const stats = fs.statSync(publicPath);
    const versionedPath = `${assetPath}?v=${stats.mtime.getTime()}`;
    
    if (process.env.NODE_ENV === 'production') {
      assetVersionCache.set(assetPath, versionedPath);
    }
    return versionedPath;
  } catch (error) {
    return `${assetPath}?v=${Date.now()}`; // Fallback
  }
};
/**
 * ====== Config ======
 */
const PORT = Number(process.env.PORT) || 3000;
const USE_HTTPS = String(process.env.USE_HTTPS).toLowerCase() === 'true';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Standaard Let’s Encrypt paden; overschrijfbaar via .env
const CERT_KEY_PATH =
  process.env.CERT_KEY_PATH || '/etc/letsencrypt/live/purebookings.nl/privkey.pem';
const CERT_FULLCHAIN_PATH =
  process.env.CERT_FULLCHAIN_PATH || '/etc/letsencrypt/live/purebookings.nl/fullchain.pem';

/**
 * ====== Middlewares ======
 */

// Web performance
app.use(bodyParser.urlencoded({ extended: true })); // je gebruikt workers die form-data verwerken
app.use(compression());

// --- Belangrijk voor WebP varianten via Accept header ---
app.use((req, res, next) => {
  // Zorg dat caches (browser/CDN) weten dat de response afhangt van de Accept header
  res.setHeader('Vary', 'Accept');
  next();
});

// --- WebP middleware MOET vóór express.static staan ---
const webpMiddleware = require('./workers/webp_middleware');
app.use(webpMiddleware);

// Static files (30d cache; HTML nooit cachen)
app.use(
  express.static('public', {
    maxAge: '30d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// EJS
app.set('view engine', 'ejs');

// Sessions
const secretKey = crypto.randomBytes(64).toString('hex');
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 uur
  })
);

// Private assets
app.use('/private', express.static('private'));
app.use('/cms/private', express.static('private'));

// URL-encoded (fallback)
app.use(express.urlencoded({ extended: true }));

/**
 * ====== Workers / routes ======
 * Laat deze referenties staan zoals in je projectstructuur.
 */
const cmsPages = require('./workers/cms/pages');
const cmsElements = require('./workers/cms/elements');
const cmsBookings = require('./workers/cms/bookings');
const cmsArtists = require('./workers/cms/artists');
const cmsNews = require('./workers/cms/news');
const cmsCompany = require('./workers/cms/company');
const cmsRedirects = require('./workers/cms/redirects');
const cmsUsers = require('./workers/cms/users');
const cmsAccount = require('./workers/cms/account');

const webRoutes = require('./workers/web')(app);
const newsletterWorker = require('./workers/post_newsletter');
const bookingWorker = require('./workers/post_booking');
const contactWorker = require('./workers/post_contact');
const minifyMiddleware = require('./workers/minify_middleware');
const sitemapWorker = require('./workers/sitemap');
const mediaWorker = require('./workers/cms/cms_media');

// Volgorde: optimalisaties -> sitemap -> formulieren -> overige
// (webpMiddleware staat al boven static; NIET verplaatsen)
app.use(minifyMiddleware);
app.use(sitemapWorker);
app.use(newsletterWorker);
app.use(bookingWorker);
app.use(contactWorker);
app.use(mediaWorker);
require('./workers/image_converter'); // optioneel, laat staan als je 'm gebruikt

// cms
app.use(cmsPages);
app.use(cmsElements);
app.use(cmsBookings);
app.use(cmsArtists);
app.use(cmsNews);
app.use(cmsCompany);
app.use(cmsRedirects);
app.use(cmsUsers);
app.use(cmsAccount);

app.use((req, res, next) => {
  res.locals.session = req.session || {};
  next();
});

// Root routes
app.use('/', webRoutes);

/**
 * ====== Server start (HTTP/HTTPS) ======
 */
function startHttp() {
  http.createServer(app).listen(PORT, () => {
    console.log(`Server running with HTTP on ${BASE_URL}`);
  });
}

function startHttps() {
  try {
    const privateKey = fs.readFileSync(CERT_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(CERT_FULLCHAIN_PATH, 'utf8');
    const credentials = { key: privateKey, cert: certificate };

    // Bij HTTPS is poort meestal 443; maar respecteer PORT uit .env als die gezet is.
    const httpsPort = PORT || 443;
    https.createServer(credentials, app).listen(httpsPort, () => {
      console.log(`Server running with HTTPS on port ${httpsPort}`);
    });
  } catch (err) {
    console.error(
      `[SSL] Kon certificaten niet laden (${CERT_KEY_PATH} / ${CERT_FULLCHAIN_PATH}).`,
      '\nFoutmelding:', err.message,
      '\nVal terug naar HTTP...'
    );
    startHttp();
  }
}

if (USE_HTTPS) {
  startHttps();
} else {
  startHttp();
}
