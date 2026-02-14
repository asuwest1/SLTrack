const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard - Main dashboard data
router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const isMssql = db.dialect === 'mssql';

  // Licensing overview (Perpetual vs Subscription counts)
  const licensingOverview = await db.query(`
    SELECT LicenseType, COUNT(*) as count, SUM(Quantity) as totalQuantity
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0
    GROUP BY LicenseType
  `);

  // Cost by department/cost center
  const costByDepartment = await db.query(`
    SELECT CostCenter, SUM(Cost) as totalCost
    FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0 AND l.Cost IS NOT NULL
    GROUP BY CostCenter
    ORDER BY totalCost DESC
  `);

  // 30-day expirations count
  const exp30 = isMssql
    ? await db.get(`
        SELECT COUNT(*) as count FROM (
          SELECT LicenseID AS id FROM Licenses l
          JOIN SoftwareTitles t ON l.TitleID = t.TitleID
          WHERE t.IsDecommissioned = 0
            AND l.ExpirationDate IS NOT NULL
            AND l.ExpirationDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
          UNION ALL
          SELECT sc.SupportID AS id FROM SupportContracts sc
          JOIN Licenses l ON sc.LicenseID = l.LicenseID
          JOIN SoftwareTitles t ON l.TitleID = t.TitleID
          WHERE t.IsDecommissioned = 0
            AND sc.EndDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
        ) sub
      `)
    : await db.get(`
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
      `);

  // 60-day expirations count
  const exp60 = isMssql
    ? await db.get(`
        SELECT COUNT(*) as count FROM (
          SELECT LicenseID AS id FROM Licenses l
          JOIN SoftwareTitles t ON l.TitleID = t.TitleID
          WHERE t.IsDecommissioned = 0
            AND l.ExpirationDate IS NOT NULL
            AND l.ExpirationDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
          UNION ALL
          SELECT sc.SupportID AS id FROM SupportContracts sc
          JOIN Licenses l ON sc.LicenseID = l.LicenseID
          JOIN SoftwareTitles t ON l.TitleID = t.TitleID
          WHERE t.IsDecommissioned = 0
            AND sc.EndDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
        ) sub
      `)
    : await db.get(`
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
      `);

  // Upcoming expirations list (next 60 days)
  const upcomingExpirations = isMssql
    ? await db.query(`
        SELECT
          t.TitleName as softwareTitle,
          'License' as itemType,
          l.LicenseType as type,
          l.ExpirationDate as expirationDate,
          l.PONumber as poNumber,
          l.CostCenter as costCenter,
          DATEDIFF(DAY, GETDATE(), l.ExpirationDate) as daysRemaining
        FROM Licenses l
        JOIN SoftwareTitles t ON l.TitleID = t.TitleID
        WHERE t.IsDecommissioned = 0
          AND l.ExpirationDate IS NOT NULL
          AND l.ExpirationDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
        UNION ALL
        SELECT
          t.TitleName as softwareTitle,
          'Support Contract' as itemType,
          'Support Contract' as type,
          sc.EndDate as expirationDate,
          sc.PONumber as poNumber,
          sc.CostCenter as costCenter,
          DATEDIFF(DAY, GETDATE(), sc.EndDate) as daysRemaining
        FROM SupportContracts sc
        JOIN Licenses l ON sc.LicenseID = l.LicenseID
        JOIN SoftwareTitles t ON l.TitleID = t.TitleID
        WHERE t.IsDecommissioned = 0
          AND sc.EndDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
        ORDER BY expirationDate ASC
      `)
    : await db.query(`
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
      `);

  // Total active titles
  const totalTitles = await db.get(`
    SELECT COUNT(*) as count FROM SoftwareTitles WHERE IsDecommissioned = 0
  `);

  // Total spend
  const totalSpend = await db.get(`
    SELECT SUM(l.Cost) as total FROM Licenses l
    JOIN SoftwareTitles t ON l.TitleID = t.TitleID
    WHERE t.IsDecommissioned = 0
  `);

  res.json({
    licensingOverview,
    costByDepartment,
    expirations30Days: exp30.count,
    expirations60Days: exp60.count,
    upcomingExpirations,
    totalActiveTitles: totalTitles.count,
    totalSpend: totalSpend.total || 0
  });
}));

module.exports = router;
