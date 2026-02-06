const sanitizeHtml = require('sanitize-html');

const RICH_TAGS = [
  'p','br','ul','ol','li','strong','b','em','i','u','blockquote',
  'a','h1','h2','h3','h4','h5','h6',
  'table','thead','tbody','tr','td','th',
  'span'
];

const RICH_ATTRS = {
  a: ['href','title','target','rel','class']
};

const RICH_CLASSES = {
  a: ['btn','btn-primary','btn-secondary']
};

const RICH_SCHEMES = ['http','https','mailto','tel'];

function sanitizeRich(input = '') {
  return sanitizeHtml(input, {
    allowedTags: RICH_TAGS,
    allowedAttributes: RICH_ATTRS,
    allowedClasses: RICH_CLASSES,
    allowedSchemes: RICH_SCHEMES,
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === '_blank') {
          const rel = attribs.rel ? attribs.rel.split(' ').map(s => s.trim()).filter(Boolean) : [];
          ['noopener','noreferrer'].forEach(flag => { if (!rel.includes(flag)) rel.push(flag); });
          attribs.rel = rel.join(' ');
        }
        return { tagName, attribs };
      }
    }
  });
}

function clean(text = '') {
  return String(text ?? '').trim();
}

module.exports = { sanitizeRich, clean };
