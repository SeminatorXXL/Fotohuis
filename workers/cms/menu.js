const express = require('express');
const path = require('path');
const db = require('../../db');
const { body, param, validationResult } = require('express-validator');
const { isAuthenticated } = require('../auth');
const loginProcess = require('../loginprocess');
const { clean } = require('../sanitize');

const router = express.Router();
router.use(loginProcess);

const ADMIN_VIEWS = path.join(__dirname, '../../admin/views');
const SORT_ORDER_PATTERN = /^[1-9]\d*(\.[1-9]\d*)?$/;
const TARGETS = ['_self', '_blank'];

const menuRules = [
  body('name').trim().notEmpty().withMessage('Naam is verplicht.').isLength({ max: 255 }),
  body('title').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('path').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('target').isIn(TARGETS).withMessage('Ongeldig target.'),
  body('sort_order')
    .trim()
    .matches(SORT_ORDER_PATTERN)
    .withMessage('Positie is verplicht en moet bijvoorbeeld 1 of 1.2 zijn.')
];

const emptyForm = {
  id: null,
  name: '',
  title: '',
  path: '',
  target: '_self',
  sort_order: ''
};

async function getCompanyInfo() {
  const [rows] = await db.query('SELECT * FROM company_info WHERE id = 1 LIMIT 1');
  return rows?.[0] || {};
}

async function getMenuRows() {
  const [rows] = await db.query(
    'SELECT id, name, title, path, target, parent_id, position FROM menu ORDER BY parent_id IS NOT NULL, position ASC, id ASC'
  );
  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    parent_id: row.parent_id == null ? null : Number(row.parent_id),
    position: Number(row.position)
  }));
}

function buildMenuTree(rows) {
  const byId = new Map(
    rows.map((row) => [
      row.id,
      {
        ...row,
        children: []
      }
    ])
  );

  const roots = [];

  for (const item of byId.values()) {
    if (item.parent_id && byId.has(item.parent_id)) {
      byId.get(item.parent_id).children.push(item);
    } else {
      roots.push(item);
    }
  }

  const sortItems = (items) => {
    items.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.id - b.id;
    });

    items.forEach((item) => sortItems(item.children));
    return items;
  };

  return sortItems(roots);
}

function flattenMenu(rows) {
  const tree = buildMenuTree(rows);
  const items = [];

  tree.forEach((item) => {
    const topCode = String(item.position);
    items.push({ ...item, depth: 0, display_order: topCode });

    item.children.forEach((child) => {
      items.push({
        ...child,
        depth: 1,
        display_order: `${topCode}.${child.position}`
      });
    });
  });

  return items;
}

function getSortOrderForItem(item, rows) {
  if (!item || item.position == null) return '';
  if (item.parent_id == null) return String(item.position);

  const parent = rows.find((row) => row.id === item.parent_id);
  if (!parent) return String(item.position);

  return `${parent.position}.${item.position}`;
}

function parseSortOrder(sortOrder, rows, currentId = null) {
  const value = clean(sortOrder);

  if (!SORT_ORDER_PATTERN.test(value)) {
    throw new Error('Positie is ongeldig. Gebruik bijvoorbeeld 1 of 1.2.');
  }

  const [topLevelPosition, childPosition] = value.split('.').map(Number);

  if (!childPosition) {
    return { parent_id: null, position: topLevelPosition };
  }

  const parentCandidates = rows.filter(
    (row) =>
      row.parent_id == null &&
      row.position === topLevelPosition &&
      row.id !== Number(currentId)
  );

  if (!parentCandidates.length) {
    throw new Error(`Er bestaat geen hoofdmenu-item op positie ${topLevelPosition}.`);
  }

  if (parentCandidates.length > 1) {
    throw new Error(`Meerdere hoofdmenu-items gebruiken positie ${topLevelPosition}. Los dat eerst op.`);
  }

  return {
    parent_id: parentCandidates[0].id,
    position: childPosition
  };
}

function hasSiblingPositionConflict(rows, parentId, position, currentId = null) {
  return rows.some((row) => {
    if (row.id === Number(currentId)) return false;
    const sameParent = (row.parent_id ?? null) === (parentId ?? null);
    return sameParent && row.position === position;
  });
}

async function renderMenuPage(req, res, options = {}) {
  const {
    menuForm = emptyForm,
    editing = false,
    errors = [],
    statusCode = 200
  } = options;

  req.app.set('views', ADMIN_VIEWS);
  if (req.session?.cookie) req.session.cookie.maxAge = 60 * 60 * 1000;

  const [menuRows, companyInfo] = await Promise.all([
    getMenuRows(),
    getCompanyInfo()
  ]);

  const menuItems = flattenMenu(menuRows);
  const firstItem = menuItems[0] || emptyForm;
  const selectedForm = menuForm !== emptyForm || req.query.new === '1'
    ? menuForm
    : {
        ...firstItem,
        sort_order: getSortOrderForItem(firstItem, menuRows)
      };

  return res.status(statusCode).render('menu', {
    page_title: 'Menu',
    menuItems,
    menuForm: {
      ...selectedForm,
      sort_order: selectedForm.sort_order || getSortOrderForItem(selectedForm, menuRows)
    },
    editing: !!selectedForm.id && editing !== false,
    errors,
    saved: req.query.saved === '1',
    session: req.session,
    companyInfo
  });
}

router.get('/cms/menu', isAuthenticated, async (req, res) => {
  try {
    const menuRows = await getMenuRows();
    const firstItem = flattenMenu(menuRows)[0];

    const menuForm = req.query.new === '1' || !firstItem
      ? emptyForm
      : {
          ...firstItem,
          sort_order: getSortOrderForItem(firstItem, menuRows)
        };

    return renderMenuPage(req, res, {
      menuForm,
      editing: !!menuForm.id
    });
  } catch (err) {
    console.error('Error loading menu:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.get(
  '/cms/menu/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig menu id.')],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid menu id');

      const menuRows = await getMenuRows();
      const selectedItem = menuRows.find((row) => row.id === Number(req.params.id));
      if (!selectedItem) return res.status(404).send('Menu item not found');

      return renderMenuPage(req, res, {
        menuForm: {
          ...selectedItem,
          sort_order: getSortOrderForItem(selectedItem, menuRows)
        },
        editing: true
      });
    } catch (err) {
      console.error('Error loading menu item:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post('/cms/menu/create', isAuthenticated, menuRules, async (req, res) => {
  try {
    const result = validationResult(req);
    const existingRows = await getMenuRows();
    const payload = {
      id: null,
      name: clean(req.body.name),
      title: clean(req.body.title),
      path: clean(req.body.path),
      target: TARGETS.includes(req.body.target) ? req.body.target : '_self',
      sort_order: clean(req.body.sort_order)
    };

    if (!result.isEmpty()) {
      return renderMenuPage(req, res, {
        menuForm: payload,
        editing: false,
        errors: result.array(),
        statusCode: 422
      });
    }

    let placement;
    try {
      placement = parseSortOrder(payload.sort_order, existingRows);
    } catch (err) {
      return renderMenuPage(req, res, {
        menuForm: payload,
        editing: false,
        errors: [{ msg: err.message }],
        statusCode: 422
      });
    }

    if (hasSiblingPositionConflict(existingRows, placement.parent_id, placement.position)) {
      return renderMenuPage(req, res, {
        menuForm: payload,
        editing: false,
        errors: [{ msg: 'Deze positie is al in gebruik binnen hetzelfde menu-niveau.' }],
        statusCode: 422
      });
    }

    const pathValue = payload.path || '#';

    const [insertResult] = await db.query(
      `INSERT INTO menu (name, title, path, target, parent_id, position)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.name,
        payload.title || null,
        pathValue,
        payload.target,
        placement.parent_id,
        placement.position
      ]
    );

    res.redirect(`/cms/menu/${insertResult.insertId}?saved=1`);
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.post(
  '/cms/menu/update/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig menu id.'), ...menuRules],
  async (req, res) => {
    try {
      const result = validationResult(req);
      const existingRows = await getMenuRows();
      const payload = {
        id: Number(req.params.id),
        name: clean(req.body.name),
        title: clean(req.body.title),
        path: clean(req.body.path),
        target: TARGETS.includes(req.body.target) ? req.body.target : '_self',
        sort_order: clean(req.body.sort_order)
      };

      if (!result.isEmpty()) {
        return renderMenuPage(req, res, {
          menuForm: payload,
          editing: true,
          errors: result.array(),
          statusCode: 422
        });
      }

      const currentItem = existingRows.find((row) => row.id === payload.id);
      if (!currentItem) return res.status(404).send('Menu item not found');

      let placement;
      try {
        placement = parseSortOrder(payload.sort_order, existingRows, payload.id);
      } catch (err) {
        return renderMenuPage(req, res, {
          menuForm: payload,
          editing: true,
          errors: [{ msg: err.message }],
          statusCode: 422
        });
      }

      if (hasSiblingPositionConflict(existingRows, placement.parent_id, placement.position, payload.id)) {
        return renderMenuPage(req, res, {
          menuForm: payload,
          editing: true,
          errors: [{ msg: 'Deze positie is al in gebruik binnen hetzelfde menu-niveau.' }],
          statusCode: 422
        });
      }

      const hasChildren = existingRows.some((row) => row.parent_id === payload.id);
      if (hasChildren && placement.parent_id != null) {
        return renderMenuPage(req, res, {
          menuForm: payload,
          editing: true,
          errors: [{ msg: 'Een menu-item met dropdown-items kan niet zelf in een dropdown worden geplaatst.' }],
          statusCode: 422
        });
      }

      const pathValue = payload.path || '#';

      await db.query(
        `UPDATE menu
         SET name = ?, title = ?, path = ?, target = ?, parent_id = ?, position = ?
         WHERE id = ?`,
        [
          payload.name,
          payload.title || null,
          pathValue,
          payload.target,
          placement.parent_id,
          placement.position,
          payload.id
        ]
      );

      res.redirect(`/cms/menu/${payload.id}?saved=1`);
    } catch (err) {
      console.error('Error updating menu item:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

router.post(
  '/cms/menu/delete/:id',
  isAuthenticated,
  [param('id').isInt().toInt().withMessage('Ongeldig menu id.')],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (!result.isEmpty()) return res.status(400).send('Invalid menu id');

      await db.query('DELETE FROM menu WHERE id = ?', [req.params.id]);
      res.redirect('/cms/menu?saved=1');
    } catch (err) {
      console.error('Error deleting menu item:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);

module.exports = router;
