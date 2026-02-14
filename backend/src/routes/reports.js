const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reports/expirations?days=60
router.get('/expirations', asyncHandler(async (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days) || 60;
  const isMssql = db.dialect === 'mssql';

  let query;
  if (isMssql) {
    query = `
      SELECT
        t.TitleName as softwareTitle,
        m.Name as vendor,
        l.LicenseType as licenseType,
        l.ExpirationDate as expirationDate,
        DATEDIFF(day, GETDATE(), l.ExpirationDate) as daysRemaining,
        l.PONumber as poNumber,
        l.CostCenter as costCenter,
        l.Quantity as quantity,
        l.Cost as cost
      FROM Licenses l
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
      WHERE t.IsDecommissioned = 0
        AND l.ExpirationDate IS NOT NULL
        AND l.ExpirationDate BETWEEN GETDATE() AND DATEADD(day, ?, GETDATE())
      UNION ALL
      SELECT
        t.TitleName as softwareTitle,
        m.Name as vendor,
        'Support Contract' as licenseType,
        sc.EndDate as expirationDate,
        DATEDIFF(day, GETDATE(), sc.EndDate) as daysRemaining,
        sc.PONumber as poNumber,
        sc.CostCenter as costCenter,
        l.Quantity as quantity,
        sc.Cost as cost
      FROM SupportContracts sc
      JOIN Licenses l ON sc.LicenseID = l.LicenseID
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
      WHERE t.IsDecommissioned = 0
        AND sc.EndDate BETWEEN GETDATE() AND DATEADD(day, ?, GETDATE())
      ORDER BY expirationDate ASC
    `;
  } else {
    query = `
      SELECT
        t.TitleName as softwareTitle,
        m.Name as vendor,
        l.LicenseType as licenseType,
        l.ExpirationDate as expirationDate,
        CAST(julianday(l.ExpirationDate) - julianday('now') AS INTEGER) as daysRemaining,
        l.PONumber as poNumber,
        l.CostCenter as costCenter,
        l.Quantity as quantity,
        l.Cost as cost
      FROM Licenses l
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
      WHERE t.IsDecommissioned = 0
        AND l.ExpirationDate IS NOT NULL
        AND l.ExpirationDate BETWEEN date('now') AND date('now', '+' || ? || ' days')
      UNION ALL
      SELECT
        t.TitleName as softwareTitle,
        m.Name as vendor,
        'Support Contract' as licenseType,
        sc.EndDate as expirationDate,
        CAST(julianday(sc.EndDate) - julianday('now') AS INTEGER) as daysRemaining,
        sc.PONumber as poNumber,
        sc.CostCenter as costCenter,
        l.Quantity as quantity,
        sc.Cost as cost
      FROM SupportContracts sc
      JOIN Licenses l ON sc.LicenseID = l.LicenseID
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
      WHERE t.IsDecommissioned = 0
        AND sc.EndDate BETWEEN date('now') AND date('now', '+' || ? || ' days')
      ORDER BY expirationDate ASC
    `;
  }

  const results = await db.query(query, [days, days]);
  res.json(results);
}));

// GET /api/reports/inventory - Full inventory report
router.get('/inventory', asyncHandler(async (req, res) => {
  const db = getDb();
  const isMssql = db.dialect === 'mssql';

  const licenseTypesAgg = isMssql
    ? `(SELECT STRING_AGG(sub.LicenseType, ',') FROM (SELECT DISTINCT l2.LicenseType FROM Licenses l2 WHERE l2.TitleID = t.TitleID) sub)`
    : `GROUP_CONCAT(DISTINCT l.LicenseType)`;

  const costCentersAgg = isMssql
    ? `(SELECT STRING_AGG(sub.CostCenter, ',') FROM (SELECT DISTINCT l2.CostCenter FROM Licenses l2 WHERE l2.TitleID = t.TitleID) sub)`
    : `GROUP_CONCAT(DISTINCT l.CostCenter)`;

  const query = `
    SELECT
      t.TitleName,
      m.Name as Manufacturer,
      r.Name as Reseller,
      t.Category,
      CASE WHEN t.IsDecommissioned = 1 THEN 'Decommissioned' ELSE 'Active' END as Status,
      COUNT(l.LicenseID) as LicenseCount,
      SUM(l.Quantity) as TotalQuantity,
      SUM(l.Cost) as TotalCost,
      ${licenseTypesAgg} as LicenseTypes,
      ${costCentersAgg} as CostCenters
    FROM SoftwareTitles t
    LEFT JOIN Manufacturers m ON t.ManufacturerID = m.ManufacturerID
    LEFT JOIN Resellers r ON t.ResellerID = r.ResellerID
    LEFT JOIN Licenses l ON l.TitleID = t.TitleID
    GROUP BY t.TitleID, t.TitleName, m.Name, r.Name, t.Category, t.IsDecommissioned
    ORDER BY t.IsDecommissioned ASC, t.TitleName ASC
  `;

  const results = await db.query(query);
  res.json(results);
}));

// GET /api/reports/spend-by-cost-center
router.get('/spend-by-cost-center', asyncHandler(async (req, res) => {
  const db = getDb();

  const results = await db.query(`
    SELECT
      l.CostCenter,
      COUNT(DISTINCT t.TitleID) as TitleCount,
      SUM(l.Quantity) as TotalLicenses,
      SUM(l.Cost) as LicenseCost,
      COALESCE(SUM(sc.Cost), 0) as SupportCost,
      SUM(l.Cost) + COALESCE(SUM(sc.Cost), 0) as TotalCost
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    LEFT JOIN SupportContracts sc ON sc.LicenseID = l.LicenseID
    WHERE t.IsDecommissioned = 0
    GROUP BY l.CostCenter
    ORDER BY TotalCost DESC
  `);

  res.json(results);
}));

module.exports = router;
