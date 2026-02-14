# SLTrack - Software License Management System (SLMS)

A centralized internal web application for managing the lifecycle, financial tracking, and compliance of corporate software assets. Eliminates "shelfware," prevents service interruptions from expired support, and provides a clear audit trail of software spend via Purchase Order (PO) association.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [User Guide](#user-guide)
  - [Dashboard](#dashboard)
  - [Software Inventory](#software-inventory)
  - [License Details & History](#license-details--history)
  - [Vendors](#vendors)
  - [Reports](#reports)
  - [Admin Settings](#admin-settings)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
- [Production Deployment](#production-deployment)

---

## Installation

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A modern web browser (optimized for Microsoft Edge)

### Step-by-Step Install

1. **Clone the repository**

   ```bash
   git clone https://github.com/asuwest1/SLTrack.git
   cd SLTrack
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Seed the database with sample data**

   ```bash
   cd ../backend
   node src/seed.js
   ```

   This creates an SQLite database (`backend/sltrack.db`) with sample manufacturers, resellers, software titles, licenses, support contracts, and users.

5. **Build the frontend for production**

   ```bash
   cd ../frontend
   npm run build
   ```

### One-Command Setup (from project root)

```bash
npm run setup
```

This runs install, seed, and build in sequence.

---

## Quick Start

### Production Mode (single server)

```bash
cd backend
npm start
```

Open **http://localhost:3001** in your browser. The backend serves the built frontend assets.

### Development Mode (hot-reload)

Open two terminal windows:

**Terminal 1 - Backend API (port 3001):**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend Dev Server (port 3000):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser. Changes to frontend code will hot-reload. The dev server proxies API requests to the backend.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3001`  | Backend server port |

### Database

The application uses SQLite by default. The database file is created at `backend/sltrack.db`. For production deployment with SQL Server, see the [Production Deployment](#production-deployment) section.

### File Storage

Uploaded attachments are stored in `backend/uploads/` by default. In production, configure the UNC network share path in **Admin Settings > General > File Storage Path**.

---

## User Guide

### Logging In

The system is designed for Windows Integrated Authentication (SSO via Active Directory). In the development environment, you are automatically logged in as **John Doe (System Admin)**.

The current user and role are displayed in the top-right corner of the header bar.

---

### Dashboard

**URL:** `/` (Home)

The Dashboard is the landing page and provides an at-a-glance view of your software estate.

#### Licensing Overview (Pie Chart)
- Shows the breakdown of **Perpetual vs. Subscription** licenses across all active software titles.
- Hover over a segment to see the exact count.

#### Cost by Department (Bar Chart)
- Displays total software spend grouped by **Cost Center** (e.g., Marketing, IT-Dev, IT-Security).
- Hover over a bar to see the dollar amount.

#### Expiration Counters
- **30-Day Expirations** — Count of licenses and support contracts expiring within 30 days (displayed in red).
- **60-Day Expirations** — Count of items expiring within 60 days (displayed in amber).

#### Upcoming Expirations Table
Lists all items expiring within 60 days, showing:
- Software Title
- Type (Subscription / Perpetual / Support Contract)
- Expiration Date
- PO Number
- Cost Center

---

### Software Inventory

**URL:** `/software-inventory`

The central repository for all software titles in your organization.

#### Filtering
- **Vendor** dropdown — Filter by manufacturer (e.g., Adobe, Microsoft, Sophos).
- **Status** dropdown — Show All, Active only, or Decommissioned only.
- **Search** box — Free-text search across title names and vendor names.

#### Grid Columns
| Column | Description |
|--------|-------------|
| Title Name | Name of the software product |
| Vendor | Manufacturer name |
| License Type | Perpetual, Subscription, or both |
| Status | Active (green badge) or Decommissioned (grey badge) |
| Total Licenses | Sum of all license quantities for this title |
| Actions | View Details, Edit buttons |

#### Key Actions
- **Export to Excel** — Downloads the current filtered view as a CSV file.
- **Add New Title** — Opens a form to create a new software title (Admin/Software Admin only).
- **Edit** — Modify title name, vendor, reseller, category, notes, or decommission status.
- **View Details** — Navigate to the full License Details screen.

#### Decommissioned Titles
Decommissioned titles appear with a grey background and grey text. They remain visible for historical reporting but are excluded from dashboard alerts.

---

### License Details & History

**URL:** `/license-details/:id`

Accessed by clicking **View Details** on any software title. Provides a complete record of all purchases, renewals, and contracts.

#### Tabs

**Overview Tab**
- Displays manufacturer, reseller, category, status, total license records, and total quantity.
- Shows any notes associated with the title.

**License History Tab**
- A **visual timeline** showing each license purchase in chronological order.
- Each timeline entry shows:
  - Purchase type (Initial Purchase / True-Up Purchase)
  - Date, PO Number, Quantity, Cost Center, Cost
  - License Type badge (Perpetual / Subscription)
  - Expiration date (for subscriptions)
- **Current Assignments** box shows servers, workstations, or users mapped to the licenses.
- Click **Add License** to record a new purchase (creates a unique record linked to the parent title).

**Support Contracts Tab**
- Table of all support/maintenance contracts linked to this title's licenses.
- Shows License PO, Support PO, Start/End dates, Cost, and Status (Active/Expired).
- Click **Add Contract** to create a new support contract linked to a specific license.
- Enforces the **1:1 rule**: each license can have only one support contract.

**Attachments Tab**
- Upload and manage documents (PDFs, invoices, license keys, quotes).
- Supported file types: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG, ZIP.
- Maximum file size: 50 MB.
- Click **Download** to retrieve a file or **Delete** to remove it.

#### Right Sidebar
A quick-access Attachments panel is always visible on the right side, showing all files attached to this title with Download/Delete actions.

---

### Vendors

**URL:** `/vendors`

Manage the manufacturers and resellers associated with your software titles.

#### Manufacturers Tab
- Card layout showing each manufacturer with website, contact email, and count of associated software titles.
- **Add Manufacturer** — Create a new manufacturer record.
- **Edit** — Update name, website, or contact email.
- **Delete** — Remove a manufacturer (blocked if software titles are associated).

#### Resellers Tab
- Card layout showing each reseller with contact name, email, phone, and title count.
- **Add Reseller** — Create a new reseller record.
- **Edit** / **Delete** — Same protections as manufacturers.

---

### Reports

**URL:** `/reports`

Generate and export reports for procurement, finance, and compliance teams.

#### Report Types

**Upcoming Expirations**
- Select time range: 30, 60, 90, 180, or 365 days.
- Columns: Software Title, Vendor, License Type, Expiration Date, Days Remaining, PO Number, Cost Center.
- Days Remaining shows color-coded badges (red for ≤14 days, amber for ≤30 days).

**Full Inventory**
- Complete listing of all software titles with manufacturer, category, status, license types, total quantity, and total cost.
- Decommissioned titles appear with grey styling.

**Spend by Cost Center**
- Aggregated view showing per-cost-center breakdown: title count, total licenses, license cost, support cost, and total cost.

#### Exporting
Click **Export to Excel** to download any report as a CSV file. The filename includes the report type and current date (e.g., `Upcoming_Expirations_60days_2026-02-14.csv`).

---

### Admin Settings

**URL:** `/admin-settings` (System Admin only)

#### General Tab
- **Application Name** — Display name shown in the header.
- **File Storage Path (UNC)** — Network share path for file attachments (e.g., `\\fileserver\sltrack\attachments`).

#### SMTP / Notifications Tab
- **SMTP Server** — Hostname of your mail server.
- **SMTP Port** — Default 587.
- **From Address** — Sender address for notification emails.
- **Use TLS** — Enable/disable TLS encryption.
- **Distribution List** — Email address or AD group for expiration alerts.
- **Alert Intervals** — Comma-separated days before expiration to send alerts (default: `45,28,14,7`).

#### Users & Roles Tab
- View all users with their username, display name, email, role, and status.
- **Add User** — Create a new user with username, display name, email, and role assignment.
- **Edit** — Change display name, email, role, or active/inactive status.

#### Reference Data Tab
- **Cost Centers** — View all cost centers and their departments.
- **Currencies** — View supported currencies (USD, EUR, GBP, CAD, AUD, JPY).

---

## Roles & Permissions

| Role | Data Access | Create/Edit/Delete | Admin Settings |
|------|-------------|-------------------|----------------|
| **System Admin** | Full read access | Full CRUD on all records | Full access (SMTP, UNC paths, currencies, users) |
| **Software Admin** | Full read access | Full CRUD on software, licenses, contracts | No access |
| **License Viewer** | Full read access (dashboards, records, history) | No create/edit/delete | No access |

### Default Users (after seeding)

| Username | Name | Role |
|----------|------|------|
| `jdoe` | John Doe | System Admin |
| `asmith` | Alice Smith | Software Admin |
| `bwilson` | Bob Wilson | License Viewer |
| `cjones` | Carol Jones | Software Admin |

---

## API Reference

All endpoints are prefixed with `/api`.

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard summary data |

### Software Titles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/titles` | List titles (query: `vendor`, `status`, `search`) |
| GET | `/api/titles/:id` | Get title with licenses and attachments |
| POST | `/api/titles` | Create title |
| PUT | `/api/titles/:id` | Update title |

### Licenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/licenses` | List licenses (query: `titleId`) |
| GET | `/api/licenses/:id` | Get license with contract and attachments |
| POST | `/api/licenses` | Create license |
| PUT | `/api/licenses/:id` | Update license |
| DELETE | `/api/licenses/:id` | Delete license |

### Support Contracts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/support-contracts` | List contracts (query: `licenseId`) |
| POST | `/api/support-contracts` | Create contract (enforces 1:1) |
| PUT | `/api/support-contracts/:id` | Update contract |
| DELETE | `/api/support-contracts/:id` | Delete contract |

### Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manufacturers` | List manufacturers |
| POST | `/api/manufacturers` | Create manufacturer |
| PUT | `/api/manufacturers/:id` | Update manufacturer |
| DELETE | `/api/manufacturers/:id` | Delete (blocked if titles exist) |
| GET | `/api/resellers` | List resellers |
| POST | `/api/resellers` | Create reseller |
| PUT | `/api/resellers/:id` | Update reseller |
| DELETE | `/api/resellers/:id` | Delete (blocked if titles exist) |

### Attachments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attachments` | List (query: `titleId`, `licenseId`) |
| POST | `/api/attachments` | Upload file (multipart form) |
| GET | `/api/attachments/:id/download` | Download file |
| DELETE | `/api/attachments/:id` | Delete file |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/expirations?days=60` | Upcoming expirations |
| GET | `/api/reports/inventory` | Full inventory report |
| GET | `/api/reports/spend-by-cost-center` | Spend by cost center |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/current` | Current authenticated user |
| GET | `/api/settings` | App settings |
| PUT | `/api/settings` | Bulk update settings |
| GET | `/api/cost-centers` | List cost centers |
| GET | `/api/currencies` | List currencies |

---

## Production Deployment

### Migrating to SQL Server

The SQLite schema is designed for easy migration to SQL Server 2019:

1. Replace `better-sqlite3` with `mssql` or `tedious` in the backend.
2. Update `database.js` to use SQL Server connection strings.
3. Change `AUTOINCREMENT` to `IDENTITY(1,1)` (already compatible syntax in schema).
4. Change `INTEGER` to `INT`, `TEXT` to `NVARCHAR(MAX)`.
5. Run the schema creation scripts against your SQL Server instance.

### IIS Deployment

1. Install **iisnode** on Windows Server 2019.
2. Build the frontend: `cd frontend && npm run build`.
3. Configure IIS to point to the `backend/` directory with iisnode handler.
4. Set up Windows Integrated Authentication in IIS for SSO.
5. Update `backend/src/routes/users.js` to read from the `REMOTE_USER` or `X-MS-CLIENT-PRINCIPAL-NAME` header.

### SMTP Alerts

Configure SMTP settings in **Admin Settings > SMTP / Notifications**. The alert system sends emails to the configured distribution list at 45, 28, 14, and 7 days before license/contract expiration with the subject line:

```
ACTION REQUIRED: [Software Title] Renewal Due in [X] Days
```

To automate alerts, set up a scheduled task (Windows Task Scheduler or cron) to call the alert endpoint daily.
