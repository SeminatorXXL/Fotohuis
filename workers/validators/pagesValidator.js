const { body } = require('express-validator');

exports.updateRules = [

  body('page_title').optional({ checkFalsy: true }).isLength({ max: 512 }).withMessage('Page title max 512 tekens.'),
  body('page_description').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('Page description max 255 tekens.'),

  body('main_title').trim().notEmpty().withMessage('Main title is verplicht.').isLength({ max: 255 }).withMessage('Main title max 255 tekens.'),

  body('banner').optional({ checkFalsy: true }).trim().isLength({ max: 65535 }),
  body('banner_alt').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),

  body('seo_image_1').optional({ checkFalsy: true }).trim().isLength({ max: 65535 }),
  body('seo_image_alt_1').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('seo_title_1').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),

  body('seo_image_2').optional({ checkFalsy: true }).trim().isLength({ max: 65535 }),
  body('seo_image_alt_2').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('seo_title_2').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),

  body('seo_image_3').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('seo_image_alt_3').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('seo_title_3').optional({ checkFalsy: true }).trim().isLength({ max: 1024 }),

  body('quote').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('quote_image').optional({ checkFalsy: true }).trim().isLength({ max: 65535 }),
  // HTML-velden (banner_text, seo_text_1..3) worden gesanitized in sanitize.js
];
