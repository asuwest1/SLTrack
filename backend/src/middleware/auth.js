const { getDb } = require('../database');

// Role hierarchy: SystemAdmin > SoftwareAdmin > LicenseViewer
const ROLE_HIERARCHY = {
  'SystemAdmin': 3,
  'SoftwareAdmin': 2,
  'LicenseViewer': 1,
};

/**
 * Authentication middleware.
 * In production, reads from Windows Integrated Auth headers (REMOTE_USER).
 * In development only, falls back to X-User-Name header or 'jdoe'.
 */
function authenticate(req, res, next) {
  const db = getDb();
  const isProduction = process.env.NODE_ENV === 'production';

  // Production: Windows Integrated Auth sets REMOTE_USER or X-MS-CLIENT-PRINCIPAL-NAME
  const username =
    req.headers['x-remote-user'] ||
    req.headers['x-ms-client-principal-name'] ||
    (isProduction ? null : (req.headers['x-user-name'] || 'jdoe'));

  if (!username) {
    return res.status(401).json({ error: 'Authentication required. No identity headers present.' });
  }

  const user = db.prepare('SELECT * FROM Users WHERE Username = ? AND IsActive = 1').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Authentication required. User not found or inactive.' });
  }

  req.user = user;
  next();
}

/**
 * Authorization middleware factory.
 * Checks that the authenticated user's role meets the minimum required level.
 */
function authorize(minimumRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.Role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: `Access denied. Requires ${minimumRole} role or higher.` });
    }

    next();
  };
}

/**
 * Write-access middleware for data modification routes.
 * Requires SoftwareAdmin or SystemAdmin.
 */
function requireWrite(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    return next(); // Read access for all authenticated users
  }

  const userLevel = ROLE_HIERARCHY[req.user.Role] || 0;
  if (userLevel < ROLE_HIERARCHY['SoftwareAdmin']) {
    return res.status(403).json({ error: 'Access denied. Write access requires Software Admin or higher.' });
  }

  next();
}

module.exports = { authenticate, authorize, requireWrite };
