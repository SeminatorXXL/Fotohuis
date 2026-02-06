// /workers/sitemap.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const xml = require('xml');

async function generateSitemapXml(req) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const [pages] = await db.query("SELECT * FROM pages WHERE sitemap = 1 ORDER BY id ASC");
    const [artists] = await db.query("SELECT * FROM artists");
    const [news] = await db.query("SELECT * FROM news_posts");

    const urls = [];

    // Homepage - hoogste prioriteit
    urls.push({
        url: [
            { loc: `${baseUrl}/` },
            { priority: '1.0' }
        ]
    });

    // Alle pagina’s behalve artists en news
    pages.forEach(page => {
        if (page.alias && page.alias !== 'artists' && page.alias !== 'news') {
            urls.push({
                url: [
                    { loc: `${baseUrl}/${page.alias}` },
                    { priority: '0.8' }
                ]
            });
        }
    });

    // Artists hoofdpagina + subpagina’s
    const artistPage = pages.find(p => p.alias === 'artists');
    if (artistPage) {
        urls.push({
            url: [
                { loc: `${baseUrl}/artists` },
                { priority: '0.8' }
            ]
        });

        artists.forEach(artist => {
            urls.push({
                url: [
                    { loc: `${baseUrl}/artists/${artist.alias}` },
                    { priority: '0.7' }
                ]
            });
        });
    }

    // News hoofdpagina + subpagina’s
    const newsPage = pages.find(p => p.alias === 'news');
    if (newsPage) {
        urls.push({
            url: [
                { loc: `${baseUrl}/news` },
                { priority: '0.8' }
            ]
        });

        news.forEach(item => {
            urls.push({
                url: [
                    { loc: `${baseUrl}/news/${item.alias}` },
                    { priority: '0.7' }
                ]
            });
        });
    }

    return xml([
        {
            urlset: [
                { _attr: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' } },
                ...urls
            ]
        }
    ], { declaration: true });
}

router.get('/sitemap.xml', async (req, res) => {
    try {
        const xmlContent = await generateSitemapXml(req);
        res.header('Content-Type', 'application/xml');
        res.send(xmlContent);
    } catch (err) {
        console.error("Sitemap XML error:", err);
        res.status(500).send("Error generating sitemap.");
    }
});

router.get('/sitemap', async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const [pages] = await db.query("SELECT * FROM pages WHERE sitemap = 1");
        const [artists] = await db.query("SELECT * FROM artists");
        const [news] = await db.query("SELECT * FROM news_posts");

        const [companyInfo] = await db.query("SELECT * FROM company WHERE `id` = 1");
        const [page] = await db.query("SELECT * FROM pages WHERE id = 13");
        const [pageContent] = await db.query("SELECT * FROM `page_content` WHERE `page_id` = 13");

        const [navItems] = await db.query("SELECT * FROM menu_items");


        const viewsPath = path.join(__dirname, '../views');
        req.app.set('views', viewsPath);

        res.render('sitemap', {
            page: page.length > 0 ? page[0] : {},
            pageUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
            navItems: navItems,
            baseUrl,
            pages,
            artists,
            news,
            pageContent: pageContent.length > 0 ? pageContent[0] : {},
            companyInfo: companyInfo.length > 0 ? companyInfo[0] : {}
        });
    } catch (err) {
        console.error("Sitemap HTML error:", err);
        res.status(500).send("Error generating sitemap page.");
    }
});

module.exports = router;
