const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '../public');

async function ensureDir(filePath) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

module.exports = async (req, res, next) => {
  try {
    const accept = String(req.headers['accept'] || '');
    const urlPath = req.path;
    const { w, h } = req.query;

    const isImage = /^\/media\/.+\.(jpe?g|png)$/i.test(urlPath);
    const acceptsWebp = accept.includes('image/webp');

    if (!isImage || !acceptsWebp) return next();

    const srcPath = path.join(PUBLIC_DIR, urlPath);

    // crop parameters (parse naar int)
    const width = w ? parseInt(w, 10) : null;
    const height = h ? parseInt(h, 10) : null;

    // Maak bestandsnaam uniek met crop info
    const webpUrl = urlPath
      .replace(/^\/media\//, '/media-webp/')
      .replace(/\.(jpe?g|png)$/i, '')
      + (width || height ? `-${width || ''}x${height || ''}` : '')
      + '.webp';

    const webpPath = path.join(PUBLIC_DIR, webpUrl);

    // Bestaat bron?
    try {
      await fsp.access(srcPath, fs.constants.F_OK);
    } catch {
      return next(); // bron niet gevonden
    }

    // Bestaat webp al?
    try {
      await fsp.access(webpPath, fs.constants.F_OK);
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      return res.sendFile(webpPath);
    } catch { /* nieuw maken */ }

    // Maak webp met crop/resize
    await ensureDir(webpPath);
    let pipeline = sharp(srcPath).rotate();

    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'cover',   // crop to fill
        position: 'center'
      });
    }

    await pipeline.webp({ quality: 80 }).toFile(webpPath);

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    return res.sendFile(webpPath);
  } catch (err) {
    console.error('[webp_middleware] error:', err.message);
    return next();
  }
};
