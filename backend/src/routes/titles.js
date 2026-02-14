const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireWrite } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireWrite);

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { vendor, status, search } = req.query;
  const isMssql = db.dialect === 'mssql';

  const licenseTypesSubquery = isMssql
    ? `(SELECT STRING_AGG(sub.LicenseType, ',') FROM (SELECT DISTINCT l.LicenseType FROM Licenses l WHERE l.TitleID = t.TitleID) sub)`
    : `(SELECT GROUP_CONCAT(DISTINCT l.LicenseType) FROM Licenses l WHERE l.TitleID = t.TitleID)`;

  let query = `
    SELECT t.*, m.Name as ManufacturerName, r.Name as ResellerName,
      (SELECT SUM(l.Quantity) FROM Licenses l WHERE l.TitleID = t.TitleID) as TotalLicenses,
      (SELECT CASE WHEN t.IsDecommissioned = 1 THEN 'Decommissioned' ELSE 'Active' END) as Status,
      ${licenseTypesSubquery} as LicenseTypes
    FROM SoftwareTitles t
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    LEFT JOIN Resellers r ON t.ResellerID = r.ResellerID
    WHERE 1=1
  `;
  const params = [];

  if (vendor && vendor !== 'all') { query += ' AND m.ManufacturerID = ?'; params.push(vendor); }
  if (status === 'active') { query += ' AND t.IsDecommissioned = 0'; }
  else if (status === 'decommissioned') { query += ' AND t.IsDecommissioned = 1'; }
  if (search) { query += ' AND (t.TitleName LIKE ? OR m.Name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY t.IsDecommissioned ASC, t.TitleName ASC';
  const titles = await db.query(query, params);
  res.json(titles);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const title = await db.get(`
    SELECT t.*, m.Name as ManufacturerName, r.Name as ResellerName
    FROM SoftwareTitles t
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    LEFT JOIN Resellers r ON t.ResellerID = r.ResellerID
    WHERE t.TitleID = ?
  `, [req.params.id]);
  if (!title) return res.status(404).json({ error: 'Title not found' });

  const licenses = await db.query(`
    SELECT l.*,
      (SELECT sc.SupportID FROM SupportContracts sc WHERE sc.LicenseID = l.LicenseID) as SupportID,
      (SELECT sc.EndDate FROM SupportContracts sc WHERE sc.LicenseID = l.LicenseID) as SupportEndDate,
      (SELECT sc.PONumber FROM SupportContracts sc WHERE sc.LicenseID = l.LicenseID) as SupportPONumber
    FROM Licenses l WHERE l.TitleID = ? ORDER BY l.PurchaseDate ASC
  `, [req.params.id]);

  const attachments = await db.query('SELECT * FROM Attachments WHERE TitleID = ? ORDER BY UploadDate DESC', [req.params.id]);
  res.json({ ...title, licenses, attachments });
}));

router.post('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { TitleName, ManufacturerID, ResellerID, Category, Notes } = req.body;
  if (!TitleName) return res.status(400).json({ error: 'TitleName is required' });

  const result = await db.run('INSERT INTO SoftwareTitles (TitleName, ManufacturerID, ResellerID, Category, Notes) VALUES (?, ?, ?, ?, ?)',
    [TitleName, ManufacturerID || null, ResellerID || null, Category || null, Notes || null]);
  const newTitle = await db.get('SELECT * FROM SoftwareTitles WHERE TitleID = ?', [result.lastId]);
  res.status(201).json(newTitle);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const { TitleName, ManufacturerID, ResellerID, Category, Notes, IsDecommissioned } = req.body;
  const existing = await db.get('SELECT * FROM SoftwareTitles WHERE TitleID = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Title not found' });

  await db.run('UPDATE SoftwareTitles SET TitleName = ?, ManufacturerID = ?, ResellerID = ?, Category = ?, Notes = ?, IsDecommissioned = ? WHERE TitleID = ?', [
    TitleName || existing.TitleName,
    ManufacturerID !== undefined ? ManufacturerID : existing.ManufacturerID,
    ResellerID !== undefined ? ResellerID : existing.ResellerID,
    Category !== undefined ? Category : existing.Category,
    Notes !== undefined ? Notes : existing.Notes,
    IsDecommissioned !== undefined ? IsDecommissioned : existing.IsDecommissioned,
    req.params.id
  ]);
  const updated = await db.get('SELECT * FROM SoftwareTitles WHERE TitleID = ?', [req.params.id]);
  res.json(updated);
}));

module.exports = router;
