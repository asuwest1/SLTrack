const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/users - List all users
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM Users ORDER BY DisplayName ASC').all());
});

// GET /api/users/current - Get current user (simulates Windows Auth)
router.get('/current', (req, res) => {
  const db = getDb();
  // In production, this would read from Windows Authentication headers
  // For development, default to System Admin
  const user = db.prepare('SELECT * FROM Users WHERE Username = ?').get('jdoe');
  if (!user) return res.status(404).json({ error: 'No user found' });
  res.json(user);
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM Users WHERE UserID = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users
router.post('/', (req, res) => {
  const db = getDb();
  const { Username, DisplayName, Email, Role } = req.body;
  if (!Username || !DisplayName || !Role) return res.status(400).json({ error: 'Username, DisplayName, and Role are required' });

  const result = db.prepare('INSERT INTO Users (Username, DisplayName, Email, Role) VALUES (?, ?, ?, ?)').run(Username, DisplayName, Email || null, Role);
  const user = db.prepare('SELECT * FROM Users WHERE UserID = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM Users WHERE UserID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { DisplayName, Email, Role, IsActive } = req.body;
  db.prepare('UPDATE Users SET DisplayName=?, Email=?, Role=?, IsActive=? WHERE UserID=?').run(
    DisplayName || existing.DisplayName, Email !== undefined ? Email : existing.Email,
    Role || existing.Role, IsActive !== undefined ? IsActive : existing.IsActive, req.params.id
  );
  const updated = db.prepare('SELECT * FROM Users WHERE UserID = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
