const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));

// Initialize database
getDb();

// Routes
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/titles', require('./routes/titles'));
app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/support-contracts', require('./routes/supportContracts'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/resellers', require('./routes/resellers'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/cost-centers', require('./routes/costCenters'));
app.use('/api/currencies', require('./routes/currencies'));
app.use('/api/reports', require('./routes/reports'));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`SLMS Backend running on http://localhost:${PORT}`);
});
