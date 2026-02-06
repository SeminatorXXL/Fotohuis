const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../db');

const { isAuthenticated } = require('./auth');
const loginProcess = require('./loginprocess');
router.use(loginProcess);

// View roots
const usersRouter = require('./cms/users');
const session = require('express-session');

const PUBLIC_VIEWS = path.join(__dirname, '../views');
const ADMIN_VIEWS  = path.join(__dirname, '../admin/views');

async function getCommonData() {
  // Navigatie & company & elementen
  const [companyRows]   = await db.query('SELECT * FROM company WHERE id = 1');
  const [navItems]      = await db.query('SELECT * FROM menu_items ORDER BY id ASC');
  const [newsletterEl]  = await db.query("SELECT * FROM elements WHERE `name` = 'newsletter' LIMIT 1");
  const [bookingSmallEl]= await db.query("SELECT * FROM elements WHERE `name` = 'bookingsmall' LIMIT 1");

  // Artists + news altijd live ophalen
  const [artists]    = await db.query('SELECT * FROM artists WHERE `active` = 1 ORDER BY headliner DESC, name ASC');
  const [newsItems]  = await db.query('SELECT * FROM news_posts WHERE active = 1 ORDER BY featured DESC, publish_date DESC');

  // Page paths (voor breadcrumbs/links)
  const [pagesRows]  = await db.query('SELECT id, view, alias FROM pages');
  const pagePaths = {};
  pagesRows.forEach(p => { pagePaths[p.view] = p.alias; });

  return {
    companyInfo: companyRows[0] || {},
    navItems,
    newsletter: newsletterEl[0] || {},
    bookingSmall: bookingSmallEl[0] || {},
    artists,
    newsItems,
    pagePaths
  };
}

async function loadRoutes(app) {
  try {
    // Deze twee tabellen gebruiken we om routes te registreren (structuur).
    // Inhoud halen we per request opnieuw op.
    const [pages]        = await db.query('SELECT * FROM pages');
    const [privatePages] = await db.query('SELECT * FROM private_pages');

    /**
     * ---------- Public pages ----------
     * Voor elke page-alias zetten we een GET route.
     * Binnen de handler doen we live queries voor alle benodigde data.
     */
    pages.forEach(page => {
      router.get(`/${page.alias}`, async (req, res) => {
        try {
          app.set('views', PUBLIC_VIEWS);

          // Haal actuele page-rij op (titel/desc kunnen gewijzigd zijn).
          const [pageRowRes] = await db.query('SELECT * FROM pages WHERE id = ?', [page.id]);
          const pageRow = pageRowRes[0] || page;

          // Bijbehorende page_content live ophalen
          const [pageContentRes] = await db.query('SELECT * FROM `page_content` WHERE `page_id` = ? LIMIT 1', [page.id]);
          const pageContent = pageContentRes[0] || {};

          // Gedeelde data (company/nav/artists/news/etc.)
          const common = await getCommonData();

          res.render(page.view, {
            page: pageRow,
            pageUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
            pageContent,
            companyInfo: common.companyInfo,
            navItems: common.navItems,
            pagePaths: common.pagePaths,
            artists: common.artists,
            newsItems: common.newsItems,
            newsletter: common.newsletter
          });
        } catch (error) {
          console.error(`Error loading page ${page.alias}:`, error);
          res.status(500).send('Internal Server Error');
        }
      });
    });

    // Redirects (ongewijzigd)
    const redirects = require('./redirects');
    router.use(redirects);

    // ---------- Artist detail ----------
    router.get('/artists/:alias', async (req, res) => {
      try {
        const { alias } = req.params;
        app.set('views', PUBLIC_VIEWS);

        const [artistResults] = await db.query(
          'SELECT * FROM artists WHERE alias = ? AND active = 1 LIMIT 1',
          [alias]
        );

        // 404 content alvast live ophalen
        const [page404] = await db.query('SELECT * FROM pages WHERE id = 8 LIMIT 1');
        const [pageContent404] = await db.query('SELECT * FROM `page_content` WHERE `page_id` = 8 LIMIT 1');

        const common = await getCommonData();

        if (artistResults.length === 0) {
          return res.status(404).render('404', {
            page: page404[0] || { page_title: 'Page not found', page_description: 'The page you are looking for does not exist.' },
            pageContent: pageContent404[0] || {},
            pageUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
            navItems: common.navItems,
            companyInfo: common.companyInfo
          });
        }

        const artist = artistResults[0];
        let media = [];
        if (artist.media) {
          try { media = JSON.parse(artist.media); } catch (e) { console.error('Media JSON parse error:', e); }
        }

        res.render('artist_detail', {
          page: artist,
          pageUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
          companyInfo: common.companyInfo,
          navItems: common.navItems,
          pagePaths: common.pagePaths,
          bookingSmall: common.bookingSmall,
          media
        });
      } catch (error) {
        console.error('Error loading artist page:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // ---------- News detail ----------
    router.get('/news/:alias', async (req, res) => {
      try {
        const { alias } = req.params;
        app.set('views', PUBLIC_VIEWS);

        const [newsResults] = await db.query(
          'SELECT * FROM news_posts WHERE alias = ? AND active = 1 LIMIT 1',
          [alias]
        );

        const [page404] = await db.query('SELECT * FROM pages WHERE id = 8 LIMIT 1');
        const [pageContent404] = await db.query('SELECT * FROM `page_content` WHERE `page_id` = 8 LIMIT 1');

        const common = await getCommonData();

        if (newsResults.length === 0) {
          return res.status(404).render('404', {
            page: page404[0] || { page_title: 'Page not found', page_description: 'The page you are looking for does not exist.' },
            pageContent: pageContent404[0] || {},
            pageUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
            navItems: common.navItems,
            companyInfo: common.companyInfo
          });
        }

        const newsItem = newsResults[0];
        res.render('news_detail', {
          page: newsItem,
          pageUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
          companyInfo: common.companyInfo,
          navItems: common.navItems,
          pagePaths: common.pagePaths
        });
      } catch (error) {
        console.error('Error loading news page:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    /**
     * ---------- Admin/private pages ----------
     * Alleen login overslaan; elke adminpagina krijgt live artistCount (voorbeeld).
     */
    privatePages.forEach(p => {
      if (p.alias === 'login') return;

      router.get(`/${p.alias}`, isAuthenticated, async (req, res) => {
        try {
          app.set('views', ADMIN_VIEWS);
          req.session.cookie.maxAge = 60 * 60 * 1000;

          // Live statistiek (zoals je al deed)
          const [rows] = await db.query(
            'SELECT COUNT(*) AS total FROM artists WHERE active = 1 AND live_act = 0'
          );
          const artistCount = rows[0]?.total ?? 0;

          res.render(p.view, {
              page_title: p.name,
              page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
              artistCount, // kan null zijn voor andere pagina’s
              saved: req.query.saved === '1' || false,
              errors: []
          });
        } catch (err) {
          console.error(`Error loading admin page ${p.alias}:`, err);
          res.status(500).send('Internal Server Error');
        }
      });
    });

    router.use(usersRouter);

    // ---------- 404 (public) ----------
    router.use(async (req, res) => {
      app.set('views', PUBLIC_VIEWS);

      const [page404] = await db.query('SELECT * FROM pages WHERE id = 8 LIMIT 1');
      const [pageContent404] = await db.query('SELECT * FROM `page_content` WHERE `page_id` = 8 LIMIT 1');
      const common = await getCommonData();

      res.status(404).render('404', {
        page: page404[0] || { page_title: 'Page not found', page_description: 'The page you are looking for does not exist.' },
        pageContent: pageContent404[0] || {},
        pageUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
        navItems: common.navItems,
        companyInfo: common.companyInfo
      });
    });

    console.log('✅ Routes geladen (public + admin) met live data per request.');
  } catch (err) {
    console.error('❌ Database error bij het laden van routes:', err);
  }
}

module.exports = (app) => {
  loadRoutes(app);
  return router;
};
