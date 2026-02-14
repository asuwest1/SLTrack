const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const { authenticate, authorize } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Security: restrict CORS to known origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Security: limit JSON body size
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));

// Authentication middleware on all /api routes
app.use('/api', authenticate);

// Current user route (any authenticated user, no role restriction)
app.get('/api/users/current', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});

// Read-only routes: any authenticated user
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/currencies', require('./routes/currencies'));
app.use('/api/cost-centers', require('./routes/costCenters'));
app.use('/api/reports', require('./routes/reports'));

// Title/license/contract/vendor routes: read for all, write requires SoftwareAdmin+
app.use('/api/titles', require('./routes/titles'));
app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/support-contracts', require('./routes/supportContracts'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/resellers', require('./routes/resellers'));
app.use('/api/attachments', require('./routes/attachments'));

// Admin-only routes
app.use('/api/settings', authorize('SystemAdmin'), require('./routes/settings'));
app.use('/api/users', authorize('SystemAdmin'), require('./routes/users'));

// SPA fallback - serve index.html for all non-API, non-upload routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
  }
});

// Global error handler - never leak internals
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - Error:`, err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

// Initialize database then start server
async function start() {
  try {
    await initDb();
    console.log(`Database initialized (${(process.env.DB_TYPE || 'sqlite').toUpperCase()})`);

    app.listen(PORT, () => {
      console.log(`SLMS Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }
}

start();
