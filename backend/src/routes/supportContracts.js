const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireWrite } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireWrite);

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { licenseId } = req.query;
  let query = `
    SELECT sc.*, l.PONumber as LicensePONumber, l.LicenseType, t.TitleName, m.Name as ManufacturerName
    FROM SupportContracts sc
    JOIN Licenses l ON sc.LicenseID = l.LicenseID
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    WHERE 1=1
  `;
  const params = [];
  if (licenseId) { query += ' AND sc.LicenseID = ?'; params.push(licenseId); }
  query += ' ORDER BY sc.EndDate ASC';
  res.json(await db.query(query, params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const contract = await db.get(`
    SELECT sc.*, l.PONumber as LicensePONumber, l.LicenseType, t.TitleName
    FROM SupportContracts sc
    JOIN Licenses l ON sc.LicenseID = l.LicenseID
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE sc.SupportID = ?
  `, [req.params.id]);
  if (!contract) return res.status(404).json({ error: 'Support contract not found' });
  res.json(contract);
}));

router.post('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { LicenseID, PONumber, VendorName, StartDate, EndDate, Cost, CurrencyCode, CostCenter, Notes } = req.body;
  if (!LicenseID) return res.status(400).json({ error: 'LicenseID is required' });
  if (!PONumber) return res.status(400).json({ error: 'PO Number is required' });
  if (!EndDate) return res.status(400).json({ error: 'End Date is required' });
  const existing = await db.get('SELECT * FROM SupportContracts WHERE LicenseID = ?', [LicenseID]);
  if (existing) return res.status(400).json({ error: 'A support contract already exists for this license. Each license can have only one support contract.' });
  const result = await db.run('INSERT INTO SupportContracts (LicenseID, PONumber, VendorName, StartDate, EndDate, Cost, CurrencyCode, CostCenter, Notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [LicenseID, PONumber, VendorName || null, StartDate || null, EndDate, Cost || null, CurrencyCode || 'USD', CostCenter || null, Notes || null]);
  const newContract = await db.get('SELECT * FROM SupportContracts WHERE SupportID = ?', [result.lastId]);
  res.status(201).json(newContract);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM SupportContracts WHERE SupportID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Support contract not found' });
  const { PONumber, VendorName, StartDate, EndDate, Cost, CurrencyCode, CostCenter, Notes } = req.body;
  await db.run('UPDATE SupportContracts SET PONumber=?, VendorName=?, StartDate=?, EndDate=?, Cost=?, CurrencyCode=?, CostCenter=?, Notes=? WHERE SupportID = ?', [
    PONumber || existing.PONumber, VendorName !== undefined ? VendorName : existing.VendorName,
    StartDate !== undefined ? StartDate : existing.StartDate, EndDate || existing.EndDate,
    Cost !== undefined ? Cost : existing.Cost, CurrencyCode || existing.CurrencyCode,
    CostCenter !== undefined ? CostCenter : existing.CostCenter, Notes !== undefined ? Notes : existing.Notes, req.params.id
  ]);
  const updated = await db.get('SELECT * FROM SupportContracts WHERE SupportID = ?', [req.params.id]);
  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await db.get('SELECT * FROM SupportContracts WHERE SupportID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Support contract not found' });
  await db.run('DELETE FROM SupportContracts WHERE SupportID = ?', [req.params.id]);
  res.json({ message: 'Support contract deleted' });
}));

module.exports = router;
