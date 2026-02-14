const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/settings
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM AppSettings ORDER BY SettingKey ASC').all());
});

// GET /api/settings/:key
router.get('/:key', (req, res) => {
  const db = getDb();
  const setting = db.prepare('SELECT * FROM AppSettings WHERE SettingKey = ?').get(req.params.key);
  if (!setting) return res.status(404).json({ error: 'Setting not found' });
  res.json(setting);
});

// PUT /api/settings/:key
router.put('/:key', (req, res) => {
  const db = getDb();
  const { SettingValue } = req.body;

  const existing = db.prepare('SELECT * FROM AppSettings WHERE SettingKey = ?').get(req.params.key);
  if (existing) {
    db.prepare('UPDATE AppSettings SET SettingValue = ?, UpdatedDate = CURRENT_TIMESTAMP WHERE SettingKey = ?').run(SettingValue, req.params.key);
  } else {
    db.prepare('INSERT INTO AppSettings (SettingKey, SettingValue) VALUES (?, ?)').run(req.params.key, SettingValue);
  }

  const setting = db.prepare('SELECT * FROM AppSettings WHERE SettingKey = ?').get(req.params.key);
  res.json(setting);
});

// PUT /api/settings - Bulk update
router.put('/', (req, res) => {
  const db = getDb();
  const settings = req.body;

  const update = db.prepare('UPDATE AppSettings SET SettingValue = ?, UpdatedDate = CURRENT_TIMESTAMP WHERE SettingKey = ?');
  const insert = db.prepare('INSERT OR REPLACE INTO AppSettings (SettingKey, SettingValue) VALUES (?, ?)');

  const transaction = db.transaction((items) => {
    for (const item of items) {
      const existing = db.prepare('SELECT * FROM AppSettings WHERE SettingKey = ?').get(item.SettingKey);
      if (existing) {
        update.run(item.SettingValue, item.SettingKey);
      } else {
        insert.run(item.SettingKey, item.SettingValue);
      }
    }
  });

  transaction(Array.isArray(settings) ? settings : [settings]);
  res.json(db.prepare('SELECT * FROM AppSettings ORDER BY SettingKey ASC').all());
});

module.exports = router;
