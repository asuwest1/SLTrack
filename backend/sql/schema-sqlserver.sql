-- =============================================================================
-- SLTrack - Software License Management System
-- SQL Server 2019+ Database Schema
-- =============================================================================
-- Run this script against a new database to create all required tables.
-- Requires: SQL Server 2017+ (for STRING_AGG support in application queries)
-- =============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Manufacturers')
CREATE TABLE Manufacturers (
    ManufacturerID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL UNIQUE,
    Website NVARCHAR(500) NULL,
    ContactEmail NVARCHAR(255) NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Resellers')
CREATE TABLE Resellers (
    ResellerID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL UNIQUE,
    ContactName NVARCHAR(255) NULL,
    ContactEmail NVARCHAR(255) NULL,
    Phone NVARCHAR(50) NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SoftwareTitles')
CREATE TABLE SoftwareTitles (
    TitleID INT IDENTITY(1,1) PRIMARY KEY,
    TitleName NVARCHAR(255) NOT NULL,
    ManufacturerID INT NULL,
    ResellerID INT NULL,
    Category NVARCHAR(100) NULL,
    Notes NVARCHAR(MAX) NULL,
    IsDecommissioned BIT NOT NULL DEFAULT 0,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_SoftwareTitles_Manufacturer FOREIGN KEY (ManufacturerID) REFERENCES Manufacturers(ManufacturerID),
    CONSTRAINT FK_SoftwareTitles_Reseller FOREIGN KEY (ResellerID) REFERENCES Resellers(ResellerID)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Licenses')
CREATE TABLE Licenses (
    LicenseID INT IDENTITY(1,1) PRIMARY KEY,
    TitleID INT NOT NULL,
    PONumber NVARCHAR(100) NOT NULL,
    LicenseType NVARCHAR(50) NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    CurrencyCode CHAR(3) DEFAULT 'USD',
    Cost DECIMAL(18,2) NULL,
    CostCenter NVARCHAR(100) NULL,
    LicenseKey NVARCHAR(MAX) NULL,
    PurchaseDate DATETIME2 NULL,
    ExpirationDate DATETIME2 NULL,
    AssetMapping NVARCHAR(MAX) NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Licenses_Title FOREIGN KEY (TitleID) REFERENCES SoftwareTitles(TitleID),
    CONSTRAINT CK_Licenses_LicenseType CHECK (LicenseType IN ('Perpetual', 'Subscription'))
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SupportContracts')
CREATE TABLE SupportContracts (
    SupportID INT IDENTITY(1,1) PRIMARY KEY,
    LicenseID INT NOT NULL UNIQUE,
    PONumber NVARCHAR(100) NOT NULL,
    VendorName NVARCHAR(255) NULL,
    StartDate DATETIME2 NULL,
    EndDate DATETIME2 NOT NULL,
    Cost DECIMAL(18,2) NULL,
    CurrencyCode CHAR(3) DEFAULT 'USD',
    CostCenter NVARCHAR(100) NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_SupportContracts_License FOREIGN KEY (LicenseID) REFERENCES Licenses(LicenseID)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Attachments')
CREATE TABLE Attachments (
    AttachmentID INT IDENTITY(1,1) PRIMARY KEY,
    TitleID INT NULL,
    LicenseID INT NULL,
    SupportID INT NULL,
    FileName NVARCHAR(500) NOT NULL,
    OriginalName NVARCHAR(500) NOT NULL,
    FilePath NVARCHAR(1000) NOT NULL,
    FileSize INT NULL,
    MimeType NVARCHAR(100) NULL,
    UploadDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Attachments_Title FOREIGN KEY (TitleID) REFERENCES SoftwareTitles(TitleID),
    CONSTRAINT FK_Attachments_License FOREIGN KEY (LicenseID) REFERENCES Licenses(LicenseID),
    CONSTRAINT FK_Attachments_Support FOREIGN KEY (SupportID) REFERENCES SupportContracts(SupportID)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    DisplayName NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NULL,
    Role NVARCHAR(50) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_Users_Role CHECK (Role IN ('SystemAdmin', 'SoftwareAdmin', 'LicenseViewer'))
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AppSettings')
CREATE TABLE AppSettings (
    SettingKey NVARCHAR(100) PRIMARY KEY,
    SettingValue NVARCHAR(MAX) NULL,
    Description NVARCHAR(500) NULL,
    UpdatedDate DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CostCenters')
CREATE TABLE CostCenters (
    CostCenterID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Department NVARCHAR(100) NULL,
    IsActive BIT NOT NULL DEFAULT 1
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Currencies')
CREATE TABLE Currencies (
    CurrencyCode CHAR(3) PRIMARY KEY,
    CurrencyName NVARCHAR(100) NOT NULL
);
GO

-- =============================================================================
-- Indexes for common query patterns
-- =============================================================================
CREATE NONCLUSTERED INDEX IX_SoftwareTitles_Manufacturer ON SoftwareTitles(ManufacturerID) WHERE ManufacturerID IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_SoftwareTitles_Reseller ON SoftwareTitles(ResellerID) WHERE ResellerID IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_SoftwareTitles_IsDecommissioned ON SoftwareTitles(IsDecommissioned);
GO
CREATE NONCLUSTERED INDEX IX_Licenses_TitleID ON Licenses(TitleID);
GO
CREATE NONCLUSTERED INDEX IX_Licenses_ExpirationDate ON Licenses(ExpirationDate) WHERE ExpirationDate IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_Licenses_CostCenter ON Licenses(CostCenter) WHERE CostCenter IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_SupportContracts_EndDate ON SupportContracts(EndDate);
GO
CREATE NONCLUSTERED INDEX IX_Attachments_TitleID ON Attachments(TitleID) WHERE TitleID IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_Attachments_LicenseID ON Attachments(LicenseID) WHERE LicenseID IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_Attachments_SupportID ON Attachments(SupportID) WHERE SupportID IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_Users_Username ON Users(Username);
GO
