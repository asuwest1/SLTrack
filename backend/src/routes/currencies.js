const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  res.json(await db.query('SELECT * FROM Currencies ORDER BY CurrencyCode ASC'));
}));

module.exports = router;
