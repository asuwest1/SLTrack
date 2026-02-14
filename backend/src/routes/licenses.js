const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireWrite } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireWrite);

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { titleId } = req.query;
  let query = `
    SELECT l.LicenseID, l.TitleID, l.PONumber, l.LicenseType, l.Quantity,
      l.CurrencyCode, l.Cost, l.CostCenter, l.PurchaseDate, l.ExpirationDate,
      l.AssetMapping, l.Notes, l.CreatedDate,
      t.TitleName, m.Name as ManufacturerName,
      sc.SupportID, sc.EndDate as SupportEndDate, sc.PONumber as SupportPONumber
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    LEFT JOIN SupportContracts sc ON sc.LicenseID = l.LicenseID
    WHERE 1=1
  `;
  const params = [];
  if (titleId) { query += ' AND l.TitleID = ?'; params.push(titleId); }
  query += ' ORDER BY l.PurchaseDate DESC';
  res.json(await db.query(query, params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const license = await db.get(`
    SELECT l.*, t.TitleName, m.Name as ManufacturerName
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    WHERE l.LicenseID = ?
  `, [req.params.id]);
  if (!license) return res.status(404).json({ error: 'License not found' });
  const supportContract = await db.get('SELECT * FROM SupportContracts WHERE LicenseID = ?', [req.params.id]);
  const attachments = await db.query('SELECT * FROM Attachments WHERE LicenseID = ? ORDER BY UploadDate DESC', [req.params.id]);
  res.json({ ...license, supportContract, attachments });
}));

router.post('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { TitleID, PONumber, LicenseType, Quantity, CurrencyCode, Cost, CostCenter, LicenseKey, PurchaseDate, ExpirationDate, AssetMapping, Notes } = req.body;
  if (!TitleID) return res.status(400).json({ error: 'TitleID is required' });
  if (!PONumber) return res.status(400).json({ error: 'PO Number is required' });
  if (!LicenseType) return res.status(400).json({ error: 'License Type is required' });
  const result = await db.run('INSERT INTO Licenses (TitleID, PONumber, LicenseType, Quantity, CurrencyCode, Cost, CostCenter, LicenseKey, PurchaseDate, ExpirationDate, AssetMapping, Notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [TitleID, PONumber, LicenseType, Quantity || 1, CurrencyCode || 'USD', Cost || null, CostCenter || null, LicenseKey || null, PurchaseDate || null, ExpirationDate || null, AssetMapping || null, Notes || null]);
  const newLicense = await db.get('SELECT * FROM Licenses WHERE LicenseID = ?', [result.lastId]);
  res.status(201).json(newLicense);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM Licenses WHERE LicenseID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'License not found' });
  const { PONumber, LicenseType, Quantity, CurrencyCode, Cost, CostCenter, LicenseKey, PurchaseDate, ExpirationDate, AssetMapping, Notes } = req.body;
  if (PONumber !== undefined && !PONumber) return res.status(400).json({ error: 'PO Number is required' });
  await db.run('UPDATE Licenses SET PONumber=?, LicenseType=?, Quantity=?, CurrencyCode=?, Cost=?, CostCenter=?, LicenseKey=?, PurchaseDate=?, ExpirationDate=?, AssetMapping=?, Notes=? WHERE LicenseID = ?', [
    PONumber || existing.PONumber, LicenseType || existing.LicenseType,
    Quantity !== undefined ? Quantity : existing.Quantity, CurrencyCode || existing.CurrencyCode,
    Cost !== undefined ? Cost : existing.Cost, CostCenter !== undefined ? CostCenter : existing.CostCenter,
    LicenseKey !== undefined ? LicenseKey : existing.LicenseKey, PurchaseDate !== undefined ? PurchaseDate : existing.PurchaseDate,
    ExpirationDate !== undefined ? ExpirationDate : existing.ExpirationDate, AssetMapping !== undefined ? AssetMapping : existing.AssetMapping,
    Notes !== undefined ? Notes : existing.Notes, req.params.id
  ]);
  const updated = await db.get('SELECT * FROM Licenses WHERE LicenseID = ?', [req.params.id]);
  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const fs = require('fs');
  const path = require('path');
  const existing = await db.get('SELECT * FROM Licenses WHERE LicenseID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'License not found' });
  const uploadDir = path.resolve(path.join(__dirname, '..', '..', 'uploads'));
  const attachments = await db.query('SELECT FilePath FROM Attachments WHERE LicenseID = ?', [req.params.id]);
  for (const att of attachments) {
    const resolved = path.resolve(att.FilePath);
    if (resolved.startsWith(uploadDir) && fs.existsSync(resolved)) { fs.unlinkSync(resolved); }
  }
  await db.run('DELETE FROM SupportContracts WHERE LicenseID = ?', [req.params.id]);
  await db.run('DELETE FROM Attachments WHERE LicenseID = ?', [req.params.id]);
  await db.run('DELETE FROM Licenses WHERE LicenseID = ?', [req.params.id]);
  res.json({ message: 'License deleted' });
}));

module.exports = router;
