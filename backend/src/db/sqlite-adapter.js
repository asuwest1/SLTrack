const Database = require('better-sqlite3');
const path = require('path');

class SqliteAdapter {
  constructor() {
    this.dialect = 'sqlite';
    this.db = null;
  }

  async connect() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'sltrack.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this._initSchema();
  }

  async query(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  async get(sql, params = []) {
    return this.db.prepare(sql).get(...params) || null;
  }

  async run(sql, params = []) {
    const result = this.db.prepare(sql).run(...params);
    return { lastId: Number(result.lastInsertRowid), changes: result.changes };
  }

  async exec(sql) {
    this.db.exec(sql);
  }

  async transaction(fn) {
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async close() {
    if (this.db) this.db.close();
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Manufacturers (
        ManufacturerID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name NVARCHAR(255) NOT NULL UNIQUE,
        Website NVARCHAR(500),
        ContactEmail NVARCHAR(255),
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Resellers (
        ResellerID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name NVARCHAR(255) NOT NULL UNIQUE,
        ContactName NVARCHAR(255),
        ContactEmail NVARCHAR(255),
        Phone NVARCHAR(50),
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS SoftwareTitles (
        TitleID INTEGER PRIMARY KEY AUTOINCREMENT,
        TitleName NVARCHAR(255) NOT NULL,
        ManufacturerID INTEGER,
        ResellerID INTEGER,
        Category NVARCHAR(100),
        Notes TEXT,
        IsDecommissioned INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ManufacturerID) REFERENCES Manufacturers(ManufacturerID),
        FOREIGN KEY (ResellerID) REFERENCES Resellers(ResellerID)
      );

      CREATE TABLE IF NOT EXISTS Licenses (
        LicenseID INTEGER PRIMARY KEY AUTOINCREMENT,
        TitleID INTEGER NOT NULL,
        PONumber NVARCHAR(100) NOT NULL,
        LicenseType NVARCHAR(50) NOT NULL CHECK(LicenseType IN ('Perpetual','Subscription')),
        Quantity INTEGER NOT NULL DEFAULT 1,
        CurrencyCode CHAR(3) DEFAULT 'USD',
        Cost DECIMAL(18,2),
        CostCenter NVARCHAR(100),
        LicenseKey TEXT,
        PurchaseDate DATETIME,
        ExpirationDate DATETIME,
        AssetMapping TEXT,
        Notes TEXT,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (TitleID) REFERENCES SoftwareTitles(TitleID)
      );

      CREATE TABLE IF NOT EXISTS SupportContracts (
        SupportID INTEGER PRIMARY KEY AUTOINCREMENT,
        LicenseID INTEGER UNIQUE NOT NULL,
        PONumber NVARCHAR(100) NOT NULL,
        VendorName NVARCHAR(255),
        StartDate DATETIME,
        EndDate DATETIME NOT NULL,
        Cost DECIMAL(18,2),
        CurrencyCode CHAR(3) DEFAULT 'USD',
        CostCenter NVARCHAR(100),
        Notes TEXT,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (LicenseID) REFERENCES Licenses(LicenseID)
      );

      CREATE TABLE IF NOT EXISTS Attachments (
        AttachmentID INTEGER PRIMARY KEY AUTOINCREMENT,
        TitleID INTEGER,
        LicenseID INTEGER,
        SupportID INTEGER,
        FileName NVARCHAR(500) NOT NULL,
        OriginalName NVARCHAR(500) NOT NULL,
        FilePath NVARCHAR(1000) NOT NULL,
        FileSize INTEGER,
        MimeType NVARCHAR(100),
        UploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (TitleID) REFERENCES SoftwareTitles(TitleID),
        FOREIGN KEY (LicenseID) REFERENCES Licenses(LicenseID),
        FOREIGN KEY (SupportID) REFERENCES SupportContracts(SupportID)
      );

      CREATE TABLE IF NOT EXISTS Users (
        UserID INTEGER PRIMARY KEY AUTOINCREMENT,
        Username NVARCHAR(100) NOT NULL UNIQUE,
        DisplayName NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255),
        Role NVARCHAR(50) NOT NULL CHECK(Role IN ('SystemAdmin','SoftwareAdmin','LicenseViewer')),
        IsActive INTEGER DEFAULT 1,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS AppSettings (
        SettingKey NVARCHAR(100) PRIMARY KEY,
        SettingValue TEXT,
        Description NVARCHAR(500),
        UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS CostCenters (
        CostCenterID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name NVARCHAR(100) NOT NULL UNIQUE,
        Department NVARCHAR(100),
        IsActive INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS Currencies (
        CurrencyCode CHAR(3) PRIMARY KEY,
        CurrencyName NVARCHAR(100) NOT NULL
      );
    `);
  }
}

module.exports = SqliteAdapter;
