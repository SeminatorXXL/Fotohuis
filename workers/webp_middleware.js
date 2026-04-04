const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '../public');

async function ensureDir(filePath) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

function parseDimension(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseFocusPercent(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(100, Math.max(0, parsed));
}

function toCacheToken(value) {
  return String(value).replace('.', '_');
}

function getFocusedCropRegion(sourceWidth, sourceHeight, targetWidth, targetHeight, focusXPercent, focusYPercent) {
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) {
    return null;
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  const focusX = (focusXPercent / 100) * sourceWidth;
  const focusY = (focusYPercent / 100) * sourceHeight;

  if (Math.abs(sourceRatio - targetRatio) < 0.0001) {
    return {
      left: 0,
      top: 0,
      width: sourceWidth,
      height: sourceHeight
    };
  }

  if (sourceRatio > targetRatio) {
    const cropWidth = Math.max(1, Math.min(sourceWidth, Math.round(sourceHeight * targetRatio)));
    const desiredLeft = Math.round(focusX - (cropWidth / 2));
    const left = Math.max(0, Math.min(sourceWidth - cropWidth, desiredLeft));

    return {
      left,
      top: 0,
      width: cropWidth,
      height: sourceHeight
    };
  }

  const cropHeight = Math.max(1, Math.min(sourceHeight, Math.round(sourceWidth / targetRatio)));
  const desiredTop = Math.round(focusY - (cropHeight / 2));
  const top = Math.max(0, Math.min(sourceHeight - cropHeight, desiredTop));

  return {
    left: 0,
    top,
    width: sourceWidth,
    height: cropHeight
  };
}

module.exports = async (req, res, next) => {
  try {
    const accept = String(req.headers['accept'] || '');
    const urlPath = req.path;
    const { w, h, fx, fy } = req.query;

    const isImage = /^\/media\/.+\.(jpe?g|png)$/i.test(urlPath);
    const acceptsWebp = accept.includes('image/webp');

    if (!isImage || !acceptsWebp) return next();

    const srcPath = path.join(PUBLIC_DIR, urlPath);

    // crop parameters (parse naar int)
    const width = parseDimension(w);
    const height = parseDimension(h);
    const focusX = parseFocusPercent(fx);
    const focusY = parseFocusPercent(fy);

    // Maak bestandsnaam uniek met crop info
    const webpUrl = urlPath
      .replace(/^\/media\//, '/media-webp/')
      .replace(/\.(jpe?g|png)$/i, '')
      + (width || height ? `-${width || ''}x${height || ''}` : '')
      + (focusX != null ? `-fx${toCacheToken(focusX)}` : '')
      + (focusY != null ? `-fy${toCacheToken(focusY)}` : '')
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
    const metadata = (width && height) ? await sharp(srcPath).rotate().metadata() : null;

    if (width || height) {
      if (width && height && metadata?.width && metadata?.height && (focusX != null || focusY != null)) {
        const cropRegion = getFocusedCropRegion(
          metadata.width,
          metadata.height,
          width,
          height,
          focusX ?? 50,
          focusY ?? 50
        );

        if (cropRegion) {
          pipeline = pipeline
            .extract(cropRegion)
            .resize(width, height, {
              fit: 'fill'
            });
        } else {
          pipeline = pipeline.resize(width, height, {
            fit: 'cover',
            position: 'center'
          });
        }
      } else {
        pipeline = pipeline.resize(width, height, {
          fit: 'cover',
          position: 'center'
        });
      }
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
