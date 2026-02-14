const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/settings
router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  res.json(await db.query('SELECT * FROM AppSettings ORDER BY SettingKey ASC'));
}));

// GET /api/settings/:key
router.get('/:key', asyncHandler(async (req, res) => {
  const db = getDb();
  const setting = await db.get('SELECT * FROM AppSettings WHERE SettingKey = ?', [req.params.key]);
  if (!setting) return res.status(404).json({ error: 'Setting not found' });
  res.json(setting);
}));

// PUT /api/settings/:key
router.put('/:key', asyncHandler(async (req, res) => {
  const db = getDb();
  const { SettingValue } = req.body;

  const existing = await db.get('SELECT * FROM AppSettings WHERE SettingKey = ?', [req.params.key]);
  if (existing) {
    await db.run('UPDATE AppSettings SET SettingValue = ?, UpdatedDate = CURRENT_TIMESTAMP WHERE SettingKey = ?', [SettingValue, req.params.key]);
  } else {
    await db.run('INSERT INTO AppSettings (SettingKey, SettingValue) VALUES (?, ?)', [req.params.key, SettingValue]);
  }

  const setting = await db.get('SELECT * FROM AppSettings WHERE SettingKey = ?', [req.params.key]);
  res.json(setting);
}));

// PUT /api/settings - Bulk update
router.put('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const settings = req.body;
  const items = Array.isArray(settings) ? settings : [settings];

  await db.transaction(async (tx) => {
    for (const item of items) {
      const existing = await tx.get('SELECT * FROM AppSettings WHERE SettingKey = ?', [item.SettingKey]);
      if (existing) {
        await tx.run('UPDATE AppSettings SET SettingValue = ?, UpdatedDate = CURRENT_TIMESTAMP WHERE SettingKey = ?', [item.SettingValue, item.SettingKey]);
      } else {
        await tx.run('INSERT INTO AppSettings (SettingKey, SettingValue) VALUES (?, ?)', [item.SettingKey, item.SettingValue]);
      }
    }
  });

  res.json(await db.query('SELECT * FROM AppSettings ORDER BY SettingKey ASC'));
}));

module.exports = router;
