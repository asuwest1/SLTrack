// Safety: prevent accidental execution in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed script cannot run in production. This would destroy all data.');
  process.exit(1);
}

const { initDb, getDb } = require('./db');

async function seed() {
  await initDb();
  const db = getDb();

  // Clear existing data
  await db.exec(`
    DELETE FROM Attachments;
    DELETE FROM SupportContracts;
    DELETE FROM Licenses;
    DELETE FROM SoftwareTitles;
    DELETE FROM Manufacturers;
    DELETE FROM Resellers;
    DELETE FROM Users;
    DELETE FROM AppSettings;
    DELETE FROM CostCenters;
    DELETE FROM Currencies;
  `);

  // Currencies
  const currencies = [
    ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'],
    ['CAD', 'Canadian Dollar'], ['AUD', 'Australian Dollar'], ['JPY', 'Japanese Yen']
  ];
  for (const c of currencies) {
    await db.run('INSERT INTO Currencies (CurrencyCode, CurrencyName) VALUES (?, ?)', c);
  }

  // Cost Centers
  const costCenters = [
    ['Marketing', 'Marketing'], ['IT-Dev', 'IT Development'], ['IT-Security', 'IT Security'],
    ['IT-Ops', 'IT Operations'], ['Finance', 'Finance'], ['HR', 'Human Resources'],
    ['Engineering', 'Engineering'], ['Sales', 'Sales']
  ];
  for (const c of costCenters) {
    await db.run('INSERT INTO CostCenters (Name, Department) VALUES (?, ?)', c);
  }

  // Manufacturers
  const manufacturers = [
    ['Adobe', 'https://www.adobe.com', 'licensing@adobe.com'],
    ['Microsoft', 'https://www.microsoft.com', 'licensing@microsoft.com'],
    ['Sophos', 'https://www.sophos.com', 'sales@sophos.com'],
    ['Atlassian', 'https://www.atlassian.com', 'sales@atlassian.com'],
    ['Oracle', 'https://www.oracle.com', 'licensing@oracle.com'],
    ['Salesforce', 'https://www.salesforce.com', 'sales@salesforce.com'],
    ['Legacy Systems Inc.', null, null],
    ['JetBrains', 'https://www.jetbrains.com', 'sales@jetbrains.com']
  ];
  for (const m of manufacturers) {
    await db.run('INSERT INTO Manufacturers (Name, Website, ContactEmail) VALUES (?, ?, ?)', m);
  }

  // Resellers
  const resellers = [
    ['SHI International', 'Mike Johnson', 'mjohnson@shi.com', '800-555-0100'],
    ['CDW', 'Sarah Williams', 'swilliams@cdw.com', '800-555-0200'],
    ['Insight Direct', 'Tom Brown', 'tbrown@insight.com', '800-555-0300'],
    ['Connection', 'Lisa Davis', 'ldavis@connection.com', '800-555-0400']
  ];
  for (const r of resellers) {
    await db.run('INSERT INTO Resellers (Name, ContactName, ContactEmail, Phone) VALUES (?, ?, ?, ?)', r);
  }

  // Software Titles
  const titles = [
    ['Adobe Creative Cloud', 1, 1, 'Creative/Design', 0],
    ['Microsoft 365 E3', 2, 2, 'Productivity', 0],
    ['Sophos Antivirus', 3, 1, 'Security', 0],
    ['Visual Studio Enterprise', 2, 2, 'Development', 0],
    ['Jira Software', 4, null, 'Project Management', 0],
    ['Oracle Database SE', 5, 3, 'Database', 0],
    ['Salesforce CRM', 6, null, 'CRM', 0],
    ['Old Accounting Software v2', 7, 3, 'Finance/Accounting', 1],
    ['JetBrains IntelliJ IDEA', 8, null, 'Development', 0],
    ['Microsoft Windows Server 2019', 2, 2, 'Infrastructure', 0]
  ];
  for (const t of titles) {
    await db.run('INSERT INTO SoftwareTitles (TitleName, ManufacturerID, ResellerID, Category, IsDecommissioned) VALUES (?, ?, ?, ?, ?)', t);
  }

  // Licenses
  const licenses = [
    [1, 'PO-12345', 'Subscription', 100, 'USD', 53988.00, 'Marketing', null, '2025-03-15', '2026-03-15', 'Workstations: Design-WS-01 through Design-WS-100'],
    [1, 'PO-14500', 'Subscription', 50, 'USD', 26994.00, 'Marketing', null, '2025-06-01', '2026-06-01', 'Workstations: Mktg-WS-01 through Mktg-WS-50'],
    [2, 'PO-22000', 'Subscription', 500, 'USD', 198000.00, 'IT-Ops', null, '2025-01-01', '2026-01-01', 'All corporate users'],
    [2, 'PO-22500', 'Subscription', 200, 'USD', 79200.00, 'IT-Ops', null, '2025-07-01', '2026-07-01', 'Remote workers expansion'],
    [3, 'PO-67890', 'Subscription', 750, 'USD', 37500.00, 'IT-Security', null, '2025-04-01', '2026-04-01', 'All endpoints'],
    [4, 'PO-98765', 'Perpetual', 50, 'USD', 25000.00, 'IT-Dev', 'VS-ENT-XXXX-XXXX-XXXX', '2023-01-15', null, 'Server Name 1\nServer Name 2\nServer Name 3\nServer Name 4\nServer Name 5'],
    [4, 'PO-11223', 'Perpetual', 10, 'USD', 5000.00, 'IT-Dev', 'VS-ENT-YYYY-YYYY-YYYY', '2024-01-15', null, 'Dev-WS-51 through Dev-WS-60'],
    [5, 'PO-33000', 'Subscription', 200, 'USD', 28000.00, 'IT-Dev', null, '2025-02-01', '2026-02-01', 'Cloud hosted - all dev teams'],
    [6, 'PO-44000', 'Perpetual', 2, 'USD', 95000.00, 'IT-Ops', 'ORA-DB-SE-XXXX-XXXX', '2022-06-15', null, 'DB-PROD-01, DB-PROD-02'],
    [7, 'PO-55000', 'Subscription', 75, 'USD', 112500.00, 'Sales', null, '2025-03-01', '2026-03-01', 'Sales team + management'],
    [8, 'PO-00100', 'Perpetual', 10, 'USD', 15000.00, 'Finance', 'ACCT-OLD-XXXX', '2018-01-01', null, 'Finance servers (decommissioned)'],
    [9, 'PO-66000', 'Subscription', 30, 'USD', 14970.00, 'Engineering', null, '2025-05-01', '2026-05-01', 'Engineering team workstations'],
    [10, 'PO-77000', 'Perpetual', 20, 'USD', 60000.00, 'IT-Ops', 'WIN-SVR-XXXX-XXXX', '2021-08-01', null, 'All on-prem servers']
  ];
  for (const l of licenses) {
    await db.run('INSERT INTO Licenses (TitleID, PONumber, LicenseType, Quantity, CurrencyCode, Cost, CostCenter, LicenseKey, PurchaseDate, ExpirationDate, AssetMapping) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', l);
  }

  // Support Contracts (for Perpetual licenses)
  const supportContracts = [
    [6, 'PO-98766', 'Microsoft', '2024-01-15', '2026-01-15', 8500.00, 'USD', 'IT-Dev'],
    [7, 'PO-11224', 'Microsoft', '2024-01-15', '2026-01-15', 1700.00, 'USD', 'IT-Dev'],
    [9, 'PO-44001', 'Oracle', '2025-06-15', '2026-06-15', 22000.00, 'USD', 'IT-Ops'],
    [11, 'PO-00101', 'Legacy Systems Inc.', '2019-01-01', '2020-01-01', 3000.00, 'USD', 'Finance'],
    [13, 'PO-77001', 'Microsoft', '2025-08-01', '2026-08-01', 12000.00, 'USD', 'IT-Ops']
  ];
  for (const s of supportContracts) {
    await db.run('INSERT INTO SupportContracts (LicenseID, PONumber, VendorName, StartDate, EndDate, Cost, CurrencyCode, CostCenter) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', s);
  }

  // Users
  const users = [
    ['jdoe', 'John Doe', 'jdoe@company.com', 'SystemAdmin'],
    ['asmith', 'Alice Smith', 'asmith@company.com', 'SoftwareAdmin'],
    ['bwilson', 'Bob Wilson', 'bwilson@company.com', 'LicenseViewer'],
    ['cjones', 'Carol Jones', 'cjones@company.com', 'SoftwareAdmin']
  ];
  for (const u of users) {
    await db.run('INSERT INTO Users (Username, DisplayName, Email, Role) VALUES (?, ?, ?, ?)', u);
  }

  // App Settings
  const settings = [
    ['smtp_server', 'smtp.company.com', 'SMTP server hostname'],
    ['smtp_port', '587', 'SMTP server port'],
    ['smtp_from', 'sltrack@company.com', 'From address for notifications'],
    ['smtp_use_tls', 'true', 'Use TLS for SMTP'],
    ['alert_distribution_list', 'it-licensing@company.com', 'Distribution list for expiration alerts'],
    ['file_storage_path', '\\\\fileserver\\sltrack\\attachments', 'UNC path for file storage'],
    ['alert_intervals', '45,28,14,7', 'Days before expiration to send alerts'],
    ['app_name', 'Software License Management System', 'Application display name']
  ];
  for (const s of settings) {
    await db.run('INSERT INTO AppSettings (SettingKey, SettingValue, Description) VALUES (?, ?, ?)', s);
  }

  console.log('Database seeded successfully!');
  console.log('  - 6 currencies');
  console.log('  - 8 cost centers');
  console.log('  - 8 manufacturers');
  console.log('  - 4 resellers');
  console.log('  - 10 software titles');
  console.log('  - 13 licenses');
  console.log('  - 5 support contracts');
  console.log('  - 4 users');
  console.log('  - 8 app settings');

  await db.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
