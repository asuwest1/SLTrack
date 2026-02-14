const sql = require('mssql');

class MssqlAdapter {
  constructor(config) {
    this.dialect = 'mssql';
    this.pool = null;
    this.config = {
      server: config.server,
      database: config.database,
      port: config.port || 1433,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      options: {
        encrypt: config.encrypt !== false,
        trustServerCertificate: config.trustServerCertificate || false,
        enableArithAbort: true
      }
    };

    // Support both SQL auth and Windows Integrated Auth
    if (config.windowsAuth) {
      this.config.options.trustedConnection = true;
    } else {
      this.config.user = config.user;
      this.config.password = config.password;
    }
  }

  async connect() {
    this.pool = await new sql.ConnectionPool(this.config).connect();
    console.log('Connected to SQL Server');
  }

  /**
   * Convert positional ? params to @p1, @p2, ... named params for SQL Server.
   * Returns { sql, paramMap } where paramMap is { p1: val1, p2: val2, ... }
   */
  _convertParams(sqlStr, params = []) {
    let idx = 0;
    const paramMap = {};
    const converted = sqlStr.replace(/\?/g, () => {
      idx++;
      paramMap[`p${idx}`] = params[idx - 1];
      return `@p${idx}`;
    });
    return { sql: converted, paramMap };
  }

  _bindParams(request, paramMap) {
    for (const [name, value] of Object.entries(paramMap)) {
      if (value === null || value === undefined) {
        request.input(name, sql.NVarChar, null);
      } else if (typeof value === 'number' && Number.isInteger(value)) {
        request.input(name, sql.Int, value);
      } else if (typeof value === 'number') {
        request.input(name, sql.Decimal(18, 2), value);
      } else {
        request.input(name, sql.NVarChar, String(value));
      }
    }
  }

  async query(sqlStr, params = []) {
    const { sql: converted, paramMap } = this._convertParams(sqlStr, params);
    const request = this.pool.request();
    this._bindParams(request, paramMap);
    const result = await request.query(converted);
    return result.recordset;
  }

  async get(sqlStr, params = []) {
    const rows = await this.query(sqlStr, params);
    return rows[0] || null;
  }

  async run(sqlStr, params = []) {
    const { sql: converted, paramMap } = this._convertParams(sqlStr, params);
    // Append SCOPE_IDENTITY() for INSERT statements to get the last inserted ID
    const isInsert = /^\s*INSERT\s/i.test(converted);
    const finalSql = isInsert
      ? `${converted}; SELECT SCOPE_IDENTITY() AS lastId`
      : converted;

    const request = this.pool.request();
    this._bindParams(request, paramMap);
    const result = await request.query(finalSql);

    let lastId = 0;
    if (isInsert && result.recordset && result.recordset.length > 0) {
      lastId = result.recordset[0].lastId;
    }

    return {
      lastId,
      changes: result.rowsAffected ? result.rowsAffected[0] : 0
    };
  }

  async exec(sqlStr) {
    await this.pool.request().batch(sqlStr);
  }

  async transaction(fn) {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();
    const txAdapter = new MssqlTransactionAdapter(transaction, this);
    try {
      const result = await fn(txAdapter);
      await transaction.commit();
      return result;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async close() {
    if (this.pool) await this.pool.close();
  }
}

/**
 * Transaction-scoped adapter that routes queries through an active transaction.
 */
class MssqlTransactionAdapter {
  constructor(transaction, parent) {
    this.transaction = transaction;
    this.parent = parent;
    this.dialect = 'mssql';
  }

  async query(sqlStr, params = []) {
    const { sql: converted, paramMap } = this.parent._convertParams(sqlStr, params);
    const request = new sql.Request(this.transaction);
    this.parent._bindParams(request, paramMap);
    const result = await request.query(converted);
    return result.recordset;
  }

  async get(sqlStr, params = []) {
    const rows = await this.query(sqlStr, params);
    return rows[0] || null;
  }

  async run(sqlStr, params = []) {
    const { sql: converted, paramMap } = this.parent._convertParams(sqlStr, params);
    const isInsert = /^\s*INSERT\s/i.test(converted);
    const finalSql = isInsert
      ? `${converted}; SELECT SCOPE_IDENTITY() AS lastId`
      : converted;

    const request = new sql.Request(this.transaction);
    this.parent._bindParams(request, paramMap);
    const result = await request.query(finalSql);

    let lastId = 0;
    if (isInsert && result.recordset && result.recordset.length > 0) {
      lastId = result.recordset[0].lastId;
    }
    return {
      lastId,
      changes: result.rowsAffected ? result.rowsAffected[0] : 0
    };
  }
}

module.exports = MssqlAdapter;
