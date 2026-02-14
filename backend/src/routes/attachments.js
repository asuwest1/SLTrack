const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.png', '.jpg', '.jpeg', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

// GET /api/attachments?titleId=X or licenseId=X
router.get('/', (req, res) => {
  const db = getDb();
  const { titleId, licenseId, supportId } = req.query;

  let query = 'SELECT * FROM Attachments WHERE 1=1';
  const params = [];

  if (titleId) { query += ' AND TitleID = ?'; params.push(titleId); }
  if (licenseId) { query += ' AND LicenseID = ?'; params.push(licenseId); }
  if (supportId) { query += ' AND SupportID = ?'; params.push(supportId); }

  query += ' ORDER BY UploadDate DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/attachments - Upload file
router.post('/', upload.single('file'), (req, res) => {
  const db = getDb();
  const { titleId, licenseId, supportId } = req.body;

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const result = db.prepare(`
    INSERT INTO Attachments (TitleID, LicenseID, SupportID, FileName, OriginalName, FilePath, FileSize, MimeType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    titleId || null, licenseId || null, supportId || null,
    req.file.filename, req.file.originalname, req.file.path,
    req.file.size, req.file.mimetype
  );

  const attachment = db.prepare('SELECT * FROM Attachments WHERE AttachmentID = ?').get(result.lastInsertRowid);
  res.status(201).json(attachment);
});

// GET /api/attachments/:id/download
router.get('/:id/download', (req, res) => {
  const db = getDb();
  const attachment = db.prepare('SELECT * FROM Attachments WHERE AttachmentID = ?').get(req.params.id);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  res.download(attachment.FilePath, attachment.OriginalName);
});

// DELETE /api/attachments/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const attachment = db.prepare('SELECT * FROM Attachments WHERE AttachmentID = ?').get(req.params.id);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  // Delete file from disk
  if (fs.existsSync(attachment.FilePath)) {
    fs.unlinkSync(attachment.FilePath);
  }

  db.prepare('DELETE FROM Attachments WHERE AttachmentID = ?').run(req.params.id);
  res.json({ message: 'Attachment deleted' });
});

module.exports = router;
