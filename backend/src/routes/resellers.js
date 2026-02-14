const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireWrite } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireWrite);

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const resellers = await db.query(`
    SELECT r.*,
      (SELECT COUNT(*) FROM SoftwareTitles t WHERE t.ResellerID = r.ResellerID) as TitleCount
    FROM Resellers r
    ORDER BY r.Name ASC
  `);
  res.json(resellers);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const reseller = await db.get('SELECT * FROM Resellers WHERE ResellerID = ?', [req.params.id]);
  if (!reseller) return res.status(404).json({ error: 'Reseller not found' });
  res.json(reseller);
}));

router.post('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { Name, ContactName, ContactEmail, Phone } = req.body;
  if (!Name) return res.status(400).json({ error: 'Name is required' });

  const result = await db.run('INSERT INTO Resellers (Name, ContactName, ContactEmail, Phone) VALUES (?, ?, ?, ?)', [Name, ContactName || null, ContactEmail || null, Phone || null]);
  const reseller = await db.get('SELECT * FROM Resellers WHERE ResellerID = ?', [result.lastId]);
  res.status(201).json(reseller);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM Resellers WHERE ResellerID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Reseller not found' });

  const { Name, ContactName, ContactEmail, Phone } = req.body;
  await db.run('UPDATE Resellers SET Name=?, ContactName=?, ContactEmail=?, Phone=? WHERE ResellerID=?', [
    Name || existing.Name, ContactName !== undefined ? ContactName : existing.ContactName,
    ContactEmail !== undefined ? ContactEmail : existing.ContactEmail, Phone !== undefined ? Phone : existing.Phone, req.params.id
  ]);
  const updated = await db.get('SELECT * FROM Resellers WHERE ResellerID = ?', [req.params.id]);
  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM Resellers WHERE ResellerID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Reseller not found' });

  const titles = await db.get('SELECT COUNT(*) as count FROM SoftwareTitles WHERE ResellerID = ?', [req.params.id]);
  if (titles.count > 0) return res.status(400).json({ error: 'Cannot delete reseller with associated software titles' });

  await db.run('DELETE FROM Resellers WHERE ResellerID = ?', [req.params.id]);
  res.json({ message: 'Reseller deleted' });
}));

module.exports = router;
