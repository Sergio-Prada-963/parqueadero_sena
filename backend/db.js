const path = require('path');
const dotenv = require('dotenv');
const turso = require('./turso');

dotenv.config({ path: path.join(__dirname, '.env') });

function escapeVal(v) {
  if (v === null || typeof v === 'undefined') return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function query(sql, params = []) {
  // basic placeholder replacement for ? -> escaped values
  let finalSql = String(sql);
  for (const p of params) {
    finalSql = finalSql.replace('?', escapeVal(p));
  }

  // remove database qualifiers like mydb.
  finalSql = finalSql.replace(/\bmydb\./gi, '');

  // Normalize some MySQL functions to SQLite equivalents
  finalSql = finalSql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
  finalSql = finalSql.replace(/\bCURDATE\(\)/gi, "DATE('now')");

  // execute on Turso (libsql)
  const res = await turso.execute(finalSql);

  // normalize result to mysql2-like: return [rows]
  let rows = [];
  if (res && Array.isArray(res.rows)) {
    rows = res.rows;
  } else if (res && res.columns && res.values) {
    const cols = res.columns.map(c => (c && c.name) ? c.name : c);
    rows = res.values.map(r => {
      const obj = {};
      for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i];
      return obj;
    });
  }

  // For INSERT statements, attempt to return insertId similar to mysql2
  if (/^\s*INSERT\s+/i.test(finalSql)) {
    try {
      const last = await turso.execute('SELECT last_insert_rowid() as id;');
      let lastRows = [];
      if (last && last.columns && last.values) {
        const cols = last.columns.map(c => (c && c.name) ? c.name : c);
        lastRows = last.values.map(r => { const o = {}; for (let i=0;i<cols.length;i++) o[cols[i]] = r[i]; return o; });
      } else if (last && Array.isArray(last.rows)) lastRows = last.rows;
      const insertId = (lastRows && lastRows[0] && (lastRows[0].id !== undefined)) ? lastRows[0].id : null;
      return [{ insertId }];
    } catch (e) {
      return [{ insertId: null }];
    }
  }

  return [rows];
}

module.exports = { query };
