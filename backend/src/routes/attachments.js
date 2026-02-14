const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { requireWrite } = require('../middleware/auth');

// Enforce write access on POST/DELETE
router.use(requireWrite);

const uploadDir = path.resolve(path.join(__dirname, '..', '..', 'uploads'));
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Sanitize original filename to remove path traversal characters
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\- ]/g, '_');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.png', '.jpg', '.jpeg', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('File type not allowed'));
    }
    // Also check MIME type for common types
    const allowedMimes = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'image/png', 'image/jpeg',
      'application/zip', 'application/x-zip-compressed',
      'application/octet-stream' // Some browsers send this for unknown types
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('File MIME type not allowed'));
    }
    cb(null, true);
  }
});

// GET /api/attachments?titleId=X or licenseId=X
router.get('/', (req, res) => {
  const db = getDb();
  const { titleId, licenseId, supportId } = req.query;

  let query = 'SELECT AttachmentID, TitleID, LicenseID, SupportID, OriginalName, FileSize, MimeType, UploadDate FROM Attachments WHERE 1=1';
  const params = [];

  if (titleId) { query += ' AND TitleID = ?'; params.push(parseInt(titleId)); }
  if (licenseId) { query += ' AND LicenseID = ?'; params.push(parseInt(licenseId)); }
  if (supportId) { query += ' AND SupportID = ?'; params.push(parseInt(supportId)); }

  query += ' ORDER BY UploadDate DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/attachments - Upload file
router.post('/', upload.single('file'), (req, res) => {
  const db = getDb();
  const { titleId, licenseId, supportId } = req.body;

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Validate that at least one entity reference is provided
  if (!titleId && !licenseId && !supportId) {
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Attachment must be linked to a title, license, or support contract' });
  }

  // Validate that referenced entities exist
  if (titleId && !db.prepare('SELECT TitleID FROM SoftwareTitles WHERE TitleID = ?').get(parseInt(titleId))) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Referenced title does not exist' });
  }
  if (licenseId && !db.prepare('SELECT LicenseID FROM Licenses WHERE LicenseID = ?').get(parseInt(licenseId))) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Referenced license does not exist' });
  }

  const safeName = sanitizeFilename(req.file.originalname);

  const result = db.prepare(`
    INSERT INTO Attachments (TitleID, LicenseID, SupportID, FileName, OriginalName, FilePath, FileSize, MimeType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    titleId ? parseInt(titleId) : null,
    licenseId ? parseInt(licenseId) : null,
    supportId ? parseInt(supportId) : null,
    req.file.filename, safeName, req.file.path,
    req.file.size, req.file.mimetype
  );

  const attachment = db.prepare('SELECT AttachmentID, TitleID, LicenseID, SupportID, OriginalName, FileSize, MimeType, UploadDate FROM Attachments WHERE AttachmentID = ?').get(result.lastInsertRowid);
  res.status(201).json(attachment);
});

// GET /api/attachments/:id/download
router.get('/:id/download', (req, res) => {
  const db = getDb();
  const attachment = db.prepare('SELECT * FROM Attachments WHERE AttachmentID = ?').get(parseInt(req.params.id));
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  // Security: validate the file path is within the uploads directory
  const resolvedPath = path.resolve(attachment.FilePath);
  if (!resolvedPath.startsWith(uploadDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  const safeName = sanitizeFilename(attachment.OriginalName);
  res.download(resolvedPath, safeName);
});

// DELETE /api/attachments/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const attachment = db.prepare('SELECT * FROM Attachments WHERE AttachmentID = ?').get(parseInt(req.params.id));
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  // Delete file from disk
  const resolvedPath = path.resolve(attachment.FilePath);
  if (resolvedPath.startsWith(uploadDir) && fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
  }

  db.prepare('DELETE FROM Attachments WHERE AttachmentID = ?').run(parseInt(req.params.id));
  res.json({ message: 'Attachment deleted' });
});

module.exports = router;
