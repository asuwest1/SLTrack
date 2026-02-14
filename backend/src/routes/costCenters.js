const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  res.json(await db.query('SELECT * FROM CostCenters WHERE IsActive = 1 ORDER BY Name ASC'));
}));

router.post('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { Name, Department } = req.body;
  if (!Name) return res.status(400).json({ error: 'Name is required' });

  const result = await db.run('INSERT INTO CostCenters (Name, Department) VALUES (?, ?)', [Name, Department || null]);
  res.status(201).json(await db.get('SELECT * FROM CostCenters WHERE CostCenterID = ?', [result.lastId]));
}));

module.exports = router;
