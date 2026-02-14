const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM Currencies ORDER BY CurrencyCode ASC').all());
});

module.exports = router;
