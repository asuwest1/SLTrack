const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM CostCenters WHERE IsActive = 1 ORDER BY Name ASC').all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { Name, Department } = req.body;
  if (!Name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare('INSERT INTO CostCenters (Name, Department) VALUES (?, ?)').run(Name, Department || null);
  res.status(201).json(db.prepare('SELECT * FROM CostCenters WHERE CostCenterID = ?').get(result.lastInsertRowid));
});

module.exports = router;
