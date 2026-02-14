const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireWrite } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireWrite);

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const manufacturers = await db.query(`
    SELECT m.*,
      (SELECT COUNT(*) FROM SoftwareTitles t WHERE t.ManufacturerID = m.ManufacturerID) as TitleCount
    FROM Manufacturers m
    ORDER BY m.Name ASC
  `);
  res.json(manufacturers);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const mfg = await db.get('SELECT * FROM Manufacturers WHERE ManufacturerID = ?', [req.params.id]);
  if (!mfg) return res.status(404).json({ error: 'Manufacturer not found' });
  res.json(mfg);
}));

router.post('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { Name, Website, ContactEmail } = req.body;
  if (!Name) return res.status(400).json({ error: 'Name is required' });

  const result = await db.run('INSERT INTO Manufacturers (Name, Website, ContactEmail) VALUES (?, ?, ?)', [Name, Website || null, ContactEmail || null]);
  const mfg = await db.get('SELECT * FROM Manufacturers WHERE ManufacturerID = ?', [result.lastId]);
  res.status(201).json(mfg);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM Manufacturers WHERE ManufacturerID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Manufacturer not found' });

  const { Name, Website, ContactEmail } = req.body;
  await db.run('UPDATE Manufacturers SET Name=?, Website=?, ContactEmail=? WHERE ManufacturerID=?', [
    Name || existing.Name, Website !== undefined ? Website : existing.Website, ContactEmail !== undefined ? ContactEmail : existing.ContactEmail, req.params.id
  ]);
  const updated = await db.get('SELECT * FROM Manufacturers WHERE ManufacturerID = ?', [req.params.id]);
  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM Manufacturers WHERE ManufacturerID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Manufacturer not found' });

  const titles = await db.get('SELECT COUNT(*) as count FROM SoftwareTitles WHERE ManufacturerID = ?', [req.params.id]);
  if (titles.count > 0) return res.status(400).json({ error: 'Cannot delete manufacturer with associated software titles' });

  await db.run('DELETE FROM Manufacturers WHERE ManufacturerID = ?', [req.params.id]);
  res.json({ message: 'Manufacturer deleted' });
}));

module.exports = router;
