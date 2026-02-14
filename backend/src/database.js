// Backward compatibility: re-export from new db module
const { getDb } = require('./db');
module.exports = { getDb };
