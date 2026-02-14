const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/manufacturers
router.get('/', (req, res) => {
  const db = getDb();
  const manufacturers = db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM SoftwareTitles t WHERE t.ManufacturerID = m.ManufacturerID) as TitleCount
    FROM Manufacturers m
    ORDER BY m.Name ASC
  `).all();
  res.json(manufacturers);
});

// GET /api/manufacturers/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const mfg = db.prepare('SELECT * FROM Manufacturers WHERE ManufacturerID = ?').get(req.params.id);
  if (!mfg) return res.status(404).json({ error: 'Manufacturer not found' });
  res.json(mfg);
});

// POST /api/manufacturers
router.post('/', (req, res) => {
  const db = getDb();
  const { Name, Website, ContactEmail } = req.body;
  if (!Name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare('INSERT INTO Manufacturers (Name, Website, ContactEmail) VALUES (?, ?, ?)').run(Name, Website || null, ContactEmail || null);
  const mfg = db.prepare('SELECT * FROM Manufacturers WHERE ManufacturerID = ?').get(result.lastInsertRowid);
  res.status(201).json(mfg);
});

// PUT /api/manufacturers/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM Manufacturers WHERE ManufacturerID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Manufacturer not found' });

  const { Name, Website, ContactEmail } = req.body;
  db.prepare('UPDATE Manufacturers SET Name=?, Website=?, ContactEmail=? WHERE ManufacturerID=?').run(
    Name || existing.Name, Website !== undefined ? Website : existing.Website, ContactEmail !== undefined ? ContactEmail : existing.ContactEmail, req.params.id
  );
  const updated = db.prepare('SELECT * FROM Manufacturers WHERE ManufacturerID = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/manufacturers/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM Manufacturers WHERE ManufacturerID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Manufacturer not found' });

  const titles = db.prepare('SELECT COUNT(*) as count FROM SoftwareTitles WHERE ManufacturerID = ?').get(req.params.id);
  if (titles.count > 0) return res.status(400).json({ error: 'Cannot delete manufacturer with associated software titles' });

  db.prepare('DELETE FROM Manufacturers WHERE ManufacturerID = ?').run(req.params.id);
  res.json({ message: 'Manufacturer deleted' });
});

module.exports = router;
