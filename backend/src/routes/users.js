const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/users - List all users
router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  res.json(await db.query('SELECT * FROM Users ORDER BY DisplayName ASC'));
}));

// GET /api/users/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const user = await db.get('SELECT * FROM Users WHERE UserID = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}));

// POST /api/users
router.post('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { Username, DisplayName, Email, Role } = req.body;
  if (!Username || !DisplayName || !Role) return res.status(400).json({ error: 'Username, DisplayName, and Role are required' });

  const result = await db.run('INSERT INTO Users (Username, DisplayName, Email, Role) VALUES (?, ?, ?, ?)', [Username, DisplayName, Email || null, Role]);
  const user = await db.get('SELECT * FROM Users WHERE UserID = ?', [result.lastId]);
  res.status(201).json(user);
}));

// PUT /api/users/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM Users WHERE UserID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { DisplayName, Email, Role, IsActive } = req.body;
  await db.run('UPDATE Users SET DisplayName=?, Email=?, Role=?, IsActive=? WHERE UserID=?', [
    DisplayName || existing.DisplayName, Email !== undefined ? Email : existing.Email,
    Role || existing.Role, IsActive !== undefined ? IsActive : existing.IsActive, req.params.id
  ]);
  const updated = await db.get('SELECT * FROM Users WHERE UserID = ?', [req.params.id]);
  res.json(updated);
}));

module.exports = router;
