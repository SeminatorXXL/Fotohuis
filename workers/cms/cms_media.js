const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const fssync = require('fs');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');

require('dotenv').config();
const { isAuthenticated } = require('../auth');

// === Config ===
const PUBLIC_URL_MEDIA = '/media'; // publiek pad voor <img src>
const BASE_UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'public/media');
const ALLOWED = (process.env.UPLOAD_ALLOWED_EXT || 'jpg,jpeg,png,webp,gif,svg')
  .toLowerCase()
  .split(',')
  .map(e => e.trim());
const MAX_SIZE_LABEL = process.env.UPLOAD_MAX_SIZE || '10mb';

function parseSizeToBytes(value) {
  const raw = String(value || '').trim().toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
  if (!match) return 10 * 1024 * 1024;

  const n = Number(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  if (!Number.isFinite(n) || n <= 0) return 10 * 1024 * 1024;

  const map = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  return Math.round(n * (map[unit] || 1));
}

const MAX_SIZE_BYTES = parseSizeToBytes(MAX_SIZE_LABEL);

// === Helpers ===
function safeJoinBase(rel = '') {
  const joined = path.resolve(BASE_UPLOAD_DIR, rel);
  if (!joined.startsWith(BASE_UPLOAD_DIR)) {
    throw new Error('Path outside base not allowed');
  }
  return joined;
}

function fileIconByExt(ext) {
  const e = ext.toLowerCase();
  const image = ['.jpg','.jpeg','.png','.webp','.gif','.svg'];
  if (image.includes(e)) return 'fa-regular fa-image';
  return 'fa-regular fa-file';
}

function isImage(ext) {
  return ['.jpg','.jpeg','.png','.webp','.gif','.svg'].includes(ext.toLowerCase());
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dir = req.body.dir || '';
      const abs = safeJoinBase(dir);
      if (!fssync.existsSync(abs)) fssync.mkdirSync(abs, { recursive: true });
      cb(null, abs);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const original = file.originalname.replace(/\s+/g, '_');
    const ext = path.extname(original);
    const base = path.basename(original, ext);
    const candidate = `${base}${ext}`;
    const dir = req.body.dir || '';
    const abs = safeJoinBase(dir);
    const full = path.join(abs, candidate);
    if (fssync.existsSync(full)) {
      const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14);
      return cb(null, `${base}_${stamp}${ext}`);
    }
    cb(null, candidate);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
    if (!ALLOWED.includes(ext)) {
      return cb(new Error(`Bestandstype .${ext} is niet toegestaan`));
    }
    cb(null, true);
  }
});

function uploadFilesMiddleware(req, res, next) {
  upload.array('files', 20)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      req.session.flash_error = `Bestand is te groot. Maximale grootte is ${MAX_SIZE_LABEL}.`;
    } else {
      req.session.flash_error = err.message || 'Upload mislukt.';
    }

    const relDir = req.body?.dir || '';
    return res.redirect(`/cms/media?dir=${encodeURIComponent(relDir)}`);
  });
}

// Optioneel CSRF
let csrf = (req, res, next) => next();
if (String(process.env.USE_CSRF).toLowerCase() === 'true') {
  const csrfCsrf = require('csrf-csrf');
  csrf = csrfCsrf();
  router.use(csrf);
}

// === Views-basis voor admin ===
// __dirname == /workers/cms → terug naar project-root en dan /admin/views
const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');

// === GET: Media manager (met picker-modus) ===
router.get(
  '/cms/media',
  isAuthenticated,
  query('dir').optional().isString().trim(),
  query('picker').optional().isIn(['0','1']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send('Invalid query parameters');
      }

      const relDir = req.query.dir || '';
      const absDir = safeJoinBase(relDir);
      const pickerMode = req.query.picker === '1';

      const entries = await fs.readdir(absDir, { withFileTypes: true });

      const folders = [];
      const files = [];
      await Promise.all(entries.map(async (ent) => {
        const full = path.join(absDir, ent.name);
        const rel = path.posix.join(relDir.replaceAll('\\','/'), ent.name);
        const stat = await fs.stat(full);

        if (ent.isDirectory()) {
          folders.push({
            name: ent.name,
            url: `/cms/media?dir=${encodeURIComponent(rel)}${pickerMode ? '&picker=1' : ''}`,
            modified: stat.mtime
          });
        } else {
          const ext = path.extname(ent.name);
          const isImg = isImage(ext);
          const sizeKB = Math.max(1, Math.round(stat.size / 1024));
          files.push({
            name: ent.name,
            ext,
            icon: fileIconByExt(ext),
            sizeKB,
            modified: stat.mtime,
            isImage: isImg,
            publicUrl: path.posix.join(PUBLIC_URL_MEDIA, rel.replaceAll('\\','/'))
          });
        }
      }));

      const crumbs = [];
      const parts = relDir.split('/').filter(Boolean);
      let build = '';
      crumbs.push({ name: 'media', url: `/cms/media${pickerMode ? '?picker=1' : ''}` });
      parts.forEach((p) => {
        build = path.posix.join(build, p);
        crumbs.push({ name: p, url: `/cms/media?dir=${encodeURIComponent(build)}${pickerMode ? '&picker=1' : ''}` });
      });

      req.app.set('views', ADMIN_VIEWS);
      res.render('media', {
        page_title: 'Media',
        page_url: req.protocol + '://' + req.get('host') + req.originalUrl,
        dir: relDir,
        crumbs,
        folders: folders.sort((a,b)=> a.name.localeCompare(b.name)),
        files: files.sort((a,b)=> a.name.localeCompare(b.name)),
        uploadAction: '/cms/media/upload',
        csrfToken: req.csrfToken ? req.csrfToken() : null,
        pickerMode,
        maxUploadSize: MAX_SIZE_LABEL,
        session: req.session
      });
    } catch (err) {
      console.error('Media manager error:', err);
      res.status(500).send('Interne fout bij het laden van bestanden');
    }
  }
);

// === POST: Upload ===
router.post(
  '/cms/media/upload',
  isAuthenticated,
  uploadFilesMiddleware,
  body('dir').optional().isString().trim(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send('Invalid form data');
      }
      const relDir = req.body.dir || '';
      const picker = req.query.picker === '1' ? '&picker=1' : '';
      safeJoinBase(relDir);

      req.session.flash_success = `${req.files.length} bestand(en) geüpload.`;
      return res.redirect(`/cms/media?dir=${encodeURIComponent(relDir)}${picker}`);
    } catch (err) {
      console.error('Upload error:', err);
      req.session.flash_error = err.message || 'Upload mislukt';
      return res.redirect(`/cms/media?dir=${encodeURIComponent(req.body.dir || '')}`);
    }
  }
);

// (Optioneel) map-aanmaak
router.post(
  '/cms/media/mkdir',
  isAuthenticated,
  body('dir').optional().isString().trim(),
  body('name').isString().trim().isLength({ min:1, max:64 }).escape(),
  async (req, res) => {
    try {
      const relDir = req.body.dir || '';
      const name = req.body.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      if (!name) throw new Error('Ongeldige mapnaam');
      const target = safeJoinBase(path.posix.join(relDir, name));
      if (!fssync.existsSync(target)) fssync.mkdirSync(target, { recursive: true });
      req.session.flash_success = `Map "${name}" aangemaakt.`;
      res.redirect(`/cms/media?dir=${encodeURIComponent(relDir)}`);
    } catch (err) {
      console.error('mkdir error:', err);
      req.session.flash_error = err.message || 'Map aanmaken mislukt';
      res.redirect(`/cms/media?dir=${encodeURIComponent(req.body.dir || '')}`);
    }
  }
);

// === POST: Delete file ===
router.post(
  '/cms/media/delete',
  isAuthenticated,
  body('dir').optional().isString().trim(),
  body('filename').isString().trim().notEmpty().withMessage('Bestandsnaam is verplicht.'),
  async (req, res) => {
    const relDir = req.body.dir || '';
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.session.flash_error = errors.array().map(e => e.msg).join(', ');
        return res.redirect(`/cms/media?dir=${encodeURIComponent(relDir)}`);
      }

      const filename = req.body.filename;

      // Prevent directory traversal
      if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        throw new Error('Ongeldige bestandsnaam.');
      }

      const filePath = safeJoinBase(path.join(relDir, filename));
      await fs.unlink(filePath);

      req.session.flash_success = `Bestand "${filename}" is verwijderd.`;
      return res.redirect(`/cms/media?dir=${encodeURIComponent(relDir)}`);
    } catch (err) {
      console.error('Delete file error:', err);
      req.session.flash_error = err.message || 'Bestand verwijderen mislukt.';
      return res.redirect(`/cms/media?dir=${encodeURIComponent(relDir)}`);
    }
  }
);

module.exports = router;
