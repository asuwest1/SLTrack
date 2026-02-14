const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireWrite } = require('../middleware/auth');

// Enforce write access on POST/PUT/DELETE
router.use(requireWrite);

// GET /api/titles - List all software titles
router.get('/', (req, res) => {
  const db = getDb();
  const { vendor, status, search } = req.query;

  let query = `
    SELECT t.*, m.Name as ManufacturerName, r.Name as ResellerName,
      (SELECT SUM(l.Quantity) FROM Licenses l WHERE l.TitleID = t.TitleID) as TotalLicenses,
      (SELECT CASE
        WHEN t.IsDecommissioned = 1 THEN 'Decommissioned'
        ELSE 'Active'
      END) as Status,
      (SELECT GROUP_CONCAT(DISTINCT l.LicenseType) FROM Licenses l WHERE l.TitleID = t.TitleID) as LicenseTypes
    FROM SoftwareTitles t
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    LEFT JOIN Resellers r ON t.ResellerID = r.ResellerID
    WHERE 1=1
  `;
  const params = [];

  if (vendor && vendor !== 'all') {
    query += ' AND m.ManufacturerID = ?';
    params.push(vendor);
  }
  if (status === 'active') {
    query += ' AND t.IsDecommissioned = 0';
  } else if (status === 'decommissioned') {
    query += ' AND t.IsDecommissioned = 1';
  }
  if (search) {
    query += ' AND (t.TitleName LIKE ? OR m.Name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.IsDecommissioned ASC, t.TitleName ASC';

  const titles = db.prepare(query).all(...params);
  res.json(titles);
});

// GET /api/titles/:id - Get single title with details
router.get('/:id', (req, res) => {
  const db = getDb();
  const title = db.prepare(`
    SELECT t.*, m.Name as ManufacturerName, r.Name as ResellerName
    FROM SoftwareTitles t
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    LEFT JOIN Resellers r ON t.ResellerID = r.ResellerID
    WHERE t.TitleID = ?
  `).get(req.params.id);

  if (!title) return res.status(404).json({ error: 'Title not found' });

  const licenses = db.prepare(`
    SELECT l.*,
      (SELECT sc.SupportID FROM SupportContracts sc WHERE sc.LicenseID = l.LicenseID) as SupportID,
      (SELECT sc.EndDate FROM SupportContracts sc WHERE sc.LicenseID = l.LicenseID) as SupportEndDate,
      (SELECT sc.PONumber FROM SupportContracts sc WHERE sc.LicenseID = l.LicenseID) as SupportPONumber
    FROM Licenses l
    WHERE l.TitleID = ?
    ORDER BY l.PurchaseDate ASC
  `).all(req.params.id);

  const attachments = db.prepare(`
    SELECT * FROM Attachments WHERE TitleID = ? ORDER BY UploadDate DESC
  `).all(req.params.id);

  res.json({ ...title, licenses, attachments });
});

// POST /api/titles - Create new title
router.post('/', (req, res) => {
  const db = getDb();
  const { TitleName, ManufacturerID, ResellerID, Category, Notes } = req.body;

  if (!TitleName) return res.status(400).json({ error: 'TitleName is required' });

  const result = db.prepare(`
    INSERT INTO SoftwareTitles (TitleName, ManufacturerID, ResellerID, Category, Notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(TitleName, ManufacturerID || null, ResellerID || null, Category || null, Notes || null);

  const newTitle = db.prepare('SELECT * FROM SoftwareTitles WHERE TitleID = ?').get(result.lastInsertRowid);
  res.status(201).json(newTitle);
});

// PUT /api/titles/:id - Update title
router.put('/:id', (req, res) => {
  const db = getDb();
  const { TitleName, ManufacturerID, ResellerID, Category, Notes, IsDecommissioned } = req.body;

  const existing = db.prepare('SELECT * FROM SoftwareTitles WHERE TitleID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Title not found' });

  db.prepare(`
    UPDATE SoftwareTitles
    SET TitleName = ?, ManufacturerID = ?, ResellerID = ?, Category = ?, Notes = ?, IsDecommissioned = ?
    WHERE TitleID = ?
  `).run(
    TitleName || existing.TitleName,
    ManufacturerID !== undefined ? ManufacturerID : existing.ManufacturerID,
    ResellerID !== undefined ? ResellerID : existing.ResellerID,
    Category !== undefined ? Category : existing.Category,
    Notes !== undefined ? Notes : existing.Notes,
    IsDecommissioned !== undefined ? IsDecommissioned : existing.IsDecommissioned,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM SoftwareTitles WHERE TitleID = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
