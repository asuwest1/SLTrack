const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/resellers
router.get('/', (req, res) => {
  const db = getDb();
  const resellers = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM SoftwareTitles t WHERE t.ResellerID = r.ResellerID) as TitleCount
    FROM Resellers r
    ORDER BY r.Name ASC
  `).all();
  res.json(resellers);
});

// GET /api/resellers/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const reseller = db.prepare('SELECT * FROM Resellers WHERE ResellerID = ?').get(req.params.id);
  if (!reseller) return res.status(404).json({ error: 'Reseller not found' });
  res.json(reseller);
});

// POST /api/resellers
router.post('/', (req, res) => {
  const db = getDb();
  const { Name, ContactName, ContactEmail, Phone } = req.body;
  if (!Name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare('INSERT INTO Resellers (Name, ContactName, ContactEmail, Phone) VALUES (?, ?, ?, ?)').run(Name, ContactName || null, ContactEmail || null, Phone || null);
  const reseller = db.prepare('SELECT * FROM Resellers WHERE ResellerID = ?').get(result.lastInsertRowid);
  res.status(201).json(reseller);
});

// PUT /api/resellers/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM Resellers WHERE ResellerID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reseller not found' });

  const { Name, ContactName, ContactEmail, Phone } = req.body;
  db.prepare('UPDATE Resellers SET Name=?, ContactName=?, ContactEmail=?, Phone=? WHERE ResellerID=?').run(
    Name || existing.Name, ContactName !== undefined ? ContactName : existing.ContactName,
    ContactEmail !== undefined ? ContactEmail : existing.ContactEmail, Phone !== undefined ? Phone : existing.Phone, req.params.id
  );
  const updated = db.prepare('SELECT * FROM Resellers WHERE ResellerID = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/resellers/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM Resellers WHERE ResellerID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reseller not found' });

  const titles = db.prepare('SELECT COUNT(*) as count FROM SoftwareTitles WHERE ResellerID = ?').get(req.params.id);
  if (titles.count > 0) return res.status(400).json({ error: 'Cannot delete reseller with associated software titles' });

  db.prepare('DELETE FROM Resellers WHERE ResellerID = ?').run(req.params.id);
  res.json({ message: 'Reseller deleted' });
});

module.exports = router;
