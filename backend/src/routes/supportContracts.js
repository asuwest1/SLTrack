const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireWrite } = require('../middleware/auth');

// Enforce write access on POST/PUT/DELETE
router.use(requireWrite);

// GET /api/support-contracts
router.get('/', (req, res) => {
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
  if (licenseId) {
    query += ' AND sc.LicenseID = ?';
    params.push(licenseId);
  }
  query += ' ORDER BY sc.EndDate ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/support-contracts/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const contract = db.prepare(`
    SELECT sc.*, l.PONumber as LicensePONumber, l.LicenseType, t.TitleName
    FROM SupportContracts sc
    JOIN Licenses l ON sc.LicenseID = l.LicenseID
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE sc.SupportID = ?
  `).get(req.params.id);

  if (!contract) return res.status(404).json({ error: 'Support contract not found' });
  res.json(contract);
});

// POST /api/support-contracts
router.post('/', (req, res) => {
  const db = getDb();
  const { LicenseID, PONumber, VendorName, StartDate, EndDate, Cost, CurrencyCode, CostCenter, Notes } = req.body;

  if (!LicenseID) return res.status(400).json({ error: 'LicenseID is required' });
  if (!PONumber) return res.status(400).json({ error: 'PO Number is required' });
  if (!EndDate) return res.status(400).json({ error: 'End Date is required' });

  // Check 1:1 constraint
  const existing = db.prepare('SELECT * FROM SupportContracts WHERE LicenseID = ?').get(LicenseID);
  if (existing) return res.status(400).json({ error: 'A support contract already exists for this license. Each license can have only one support contract.' });

  const result = db.prepare(`
    INSERT INTO SupportContracts (LicenseID, PONumber, VendorName, StartDate, EndDate, Cost, CurrencyCode, CostCenter, Notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(LicenseID, PONumber, VendorName || null, StartDate || null, EndDate, Cost || null, CurrencyCode || 'USD', CostCenter || null, Notes || null);

  const newContract = db.prepare('SELECT * FROM SupportContracts WHERE SupportID = ?').get(result.lastInsertRowid);
  res.status(201).json(newContract);
});

// PUT /api/support-contracts/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM SupportContracts WHERE SupportID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Support contract not found' });

  const { PONumber, VendorName, StartDate, EndDate, Cost, CurrencyCode, CostCenter, Notes } = req.body;

  db.prepare(`
    UPDATE SupportContracts SET PONumber=?, VendorName=?, StartDate=?, EndDate=?, Cost=?, CurrencyCode=?, CostCenter=?, Notes=?
    WHERE SupportID = ?
  `).run(
    PONumber || existing.PONumber,
    VendorName !== undefined ? VendorName : existing.VendorName,
    StartDate !== undefined ? StartDate : existing.StartDate,
    EndDate || existing.EndDate,
    Cost !== undefined ? Cost : existing.Cost,
    CurrencyCode || existing.CurrencyCode,
    CostCenter !== undefined ? CostCenter : existing.CostCenter,
    Notes !== undefined ? Notes : existing.Notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM SupportContracts WHERE SupportID = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/support-contracts/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM SupportContracts WHERE SupportID = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Support contract not found' });

  db.prepare('DELETE FROM SupportContracts WHERE SupportID = ?').run(req.params.id);
  res.json({ message: 'Support contract deleted' });
});

module.exports = router;
