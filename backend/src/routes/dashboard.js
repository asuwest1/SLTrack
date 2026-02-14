const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/dashboard - Main dashboard data
router.get('/', (req, res) => {
  const db = getDb();

  // Licensing overview (Perpetual vs Subscription counts)
  const licensingOverview = db.prepare(`
    SELECT LicenseType, COUNT(*) as count, SUM(Quantity) as totalQuantity
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0
    GROUP BY LicenseType
  `).all();

  // Cost by department/cost center
  const costByDepartment = db.prepare(`
    SELECT CostCenter, SUM(Cost) as totalCost
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0 AND l.Cost IS NOT NULL
    GROUP BY CostCenter
    ORDER BY totalCost DESC
  `).all();

  // 30-day expirations count
  const exp30 = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT LicenseID FROM Licenses l
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      WHERE t.IsDecommissioned = 0
        AND l.ExpirationDate IS NOT NULL
        AND l.ExpirationDate BETWEEN date('now') AND date('now', '+30 days')
      UNION ALL
      SELECT sc.SupportID FROM SupportContracts sc
      JOIN Licenses l ON sc.LicenseID = l.LicenseID
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      WHERE t.IsDecommissioned = 0
        AND sc.EndDate BETWEEN date('now') AND date('now', '+30 days')
    )
  `).get();

  // 60-day expirations count
  const exp60 = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT LicenseID FROM Licenses l
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      WHERE t.IsDecommissioned = 0
        AND l.ExpirationDate IS NOT NULL
        AND l.ExpirationDate BETWEEN date('now') AND date('now', '+60 days')
      UNION ALL
      SELECT sc.SupportID FROM SupportContracts sc
      JOIN Licenses l ON sc.LicenseID = l.LicenseID
      JOIN SoftwareTitles t ON l.TitleID = t.TitleID
      WHERE t.IsDecommissioned = 0
        AND sc.EndDate BETWEEN date('now') AND date('now', '+60 days')
    )
  `).get();

  // Upcoming expirations list (next 60 days)
  const upcomingExpirations = db.prepare(`
    SELECT
      t.TitleName as softwareTitle,
      'License' as itemType,
      l.LicenseType as type,
      l.ExpirationDate as expirationDate,
      l.PONumber as poNumber,
      l.CostCenter as costCenter,
      CAST(julianday(l.ExpirationDate) - julianday('now') AS INTEGER) as daysRemaining
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0
      AND l.ExpirationDate IS NOT NULL
      AND l.ExpirationDate BETWEEN date('now') AND date('now', '+60 days')
    UNION ALL
    SELECT
      t.TitleName as softwareTitle,
      'Support Contract' as itemType,
      'Support Contract' as type,
      sc.EndDate as expirationDate,
      sc.PONumber as poNumber,
      sc.CostCenter as costCenter,
      CAST(julianday(sc.EndDate) - julianday('now') AS INTEGER) as daysRemaining
    FROM SupportContracts sc
    JOIN Licenses l ON sc.LicenseID = l.LicenseID
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0
      AND sc.EndDate BETWEEN date('now') AND date('now', '+60 days')
    ORDER BY expirationDate ASC
  `).all();

  // Total active titles
  const totalTitles = db.prepare(`
    SELECT COUNT(*) as count FROM SoftwareTitles WHERE IsDecommissioned = 0
  `).get();

  // Total spend
  const totalSpend = db.prepare(`
    SELECT SUM(l.Cost) as total FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0
  `).get();

  res.json({
    licensingOverview,
    costByDepartment,
    expirations30Days: exp30.count,
    expirations60Days: exp60.count,
    upcomingExpirations,
    totalActiveTitles: totalTitles.count,
    totalSpend: totalSpend.total || 0
  });
});

module.exports = router;
