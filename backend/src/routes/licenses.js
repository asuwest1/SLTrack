const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/licenses - List all licenses
router.get('/', (req, res) => {
  const db = getDb();
  const { titleId } = req.query;

  let query = `
    SELECT l.*, t.TitleName, m.Name as ManufacturerName,
      sc.SupportID, sc.EndDate as SupportEndDate, sc.PONumber as SupportPONumber
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    LEFT JOIN SupportContracts sc ON sc.LicenseID = l.LicenseID
    WHERE 1=1
  `;
  const params = [];

  if (titleId) {
    query += ' AND l.TitleID = ?';
    params.push(titleId);
  }

  query += ' ORDER BY l.PurchaseDate DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/licenses/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const license = db.prepare(`
    SELECT l.*, t.TitleName, m.Name as ManufacturerName
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    WHERE l.LicenseID = ?
  `).get(req.params.id);

  if (!license) return res.status(404).json({ error: 'License not found' });

  const supportContract = db.prepare(`
    SELECT * FROM SupportContracts WHERE LicenseID = ?
  `).get(req.params.id);

  const attachments = db.prepare(`
    SELECT * FROM Attachments WHERE LicenseID = ? ORDER BY UploadDate DESC
  `).all(req.params.id);

  res.json({ ...license, supportContract, attachments });
});

// POST /api/licenses - Create new license
router.post('/', (req, res) => {
  const db = getDb();
  const { TitleID, PONumber, LicenseType, Quantity, CurrencyCode, Cost, CostCenter, LicenseKey, PurchaseDate, ExpirationDate, AssetMapping, Notes } = req.body;

  if (!TitleID) return res.status(400).json({ error: 'TitleID is required' });
  if (!PONumber) return res.status(400).json({ error: 'PO Number is required' });
  if (!LicenseType) return res.status(400).json({ error: 'License Type is required' });

  const result = db.prepare(`
    INSERT INTO Licenses (TitleID, PONumber, LicenseType, Quantity, CurrencyCode, Cost, CostCenter, LicenseKey, PurchaseDate, ExpirationDate, AssetMapping, Notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(TitleID, PONumber, LicenseType, Quantity || 1, CurrencyCode || 'USD', Cost || null, CostCenter || null, LicenseKey || null, PurchaseDate || null, ExpirationDate || null, AssetMapping || null, Notes || null);

  const newLicense = db.prepare('SELECT * FROM Licenses WHERE LicenseID = ?').get(result.lastInsertRowid);
  res.status(201).json(newLicense);
});

// PUT /api/licenses/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM Licenses WHERE LicenseID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'License not found' });

  const { PONumber, LicenseType, Quantity, CurrencyCode, Cost, CostCenter, LicenseKey, PurchaseDate, ExpirationDate, AssetMapping, Notes } = req.body;

  if (PONumber !== undefined && !PONumber) return res.status(400).json({ error: 'PO Number is required' });

  db.prepare(`
    UPDATE Licenses SET PONumber=?, LicenseType=?, Quantity=?, CurrencyCode=?, Cost=?, CostCenter=?, LicenseKey=?, PurchaseDate=?, ExpirationDate=?, AssetMapping=?, Notes=?
    WHERE LicenseID = ?
  `).run(
    PONumber || existing.PONumber,
    LicenseType || existing.LicenseType,
    Quantity !== undefined ? Quantity : existing.Quantity,
    CurrencyCode || existing.CurrencyCode,
    Cost !== undefined ? Cost : existing.Cost,
    CostCenter !== undefined ? CostCenter : existing.CostCenter,
    LicenseKey !== undefined ? LicenseKey : existing.LicenseKey,
    PurchaseDate !== undefined ? PurchaseDate : existing.PurchaseDate,
    ExpirationDate !== undefined ? ExpirationDate : existing.ExpirationDate,
    AssetMapping !== undefined ? AssetMapping : existing.AssetMapping,
    Notes !== undefined ? Notes : existing.Notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM Licenses WHERE LicenseID = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/licenses/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM Licenses WHERE LicenseID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'License not found' });

  db.prepare('DELETE FROM SupportContracts WHERE LicenseID = ?').run(req.params.id);
  db.prepare('DELETE FROM Attachments WHERE LicenseID = ?').run(req.params.id);
  db.prepare('DELETE FROM Licenses WHERE LicenseID = ?').run(req.params.id);
  res.json({ message: 'License deleted' });
});

module.exports = router;
