const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const turso = require('./turso');

dotenv.config({ path: path.join(__dirname, '.env') });

function transformMySQLtoSQLite(sql) {
  // Remove backticks
  let s = sql.replace(/`/g, '');

  // Remove explicit database qualifiers like mydb.
  s = s.replace(/\bmydb\./gi, '');

  // Remove SET / USE / CREATE SCHEMA lines
  s = s.replace(/^SET .*$/gim, '');
  s = s.replace(/^CREATE SCHEMA .*$/gim, '');
  s = s.replace(/^USE .*$/gim, '');

  // Convert common types
  s = s.replace(/\bTINYINT\b/gi, 'INTEGER');
  s = s.replace(/\bDATETIME\b/gi, 'TEXT');
  s = s.replace(/\bDECIMAL\([^\)]+\)/gi, 'NUMERIC');
  s = s.replace(/\bENUM\([^\)]+\)/gi, 'TEXT');

  // Convert AUTO_INCREMENT id definitions to SQLite style
  s = s.replace(/(\b\w+\b)\s+INT\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, '$1 INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');

  // Remove ENGINE=... lines
  s = s.replace(/ENGINE\s*=\s*[^;]+;?/gi, '');

  // Remove foreign keys, indexes and constraint lines inside CREATE TABLE
  s = s.split('\n').filter(line => {
    const t = line.trim();
    if (/^(INDEX|UNIQUE INDEX|CONSTRAINT|FOREIGN KEY)\b/i.test(t)) return false;
    if (/^PRIMARY KEY\s*\(/i.test(t)) return false; // handled by id replacement
    return true;
  }).join('\n');

  // Clean up trailing commas before close paren
  s = s.replace(/,\s*\)/g, '\n)');

  // Remove multiple blank lines
  s = s.replace(/\n{2,}/g, '\n');

  return s.trim();
}

async function runMigration() {
  // Use the SQL dump file (underscore name in repo)
  const sqlPath = path.join(__dirname, '..', 'script_database.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(sqlPath, 'utf8');
  const cleaned = transformMySQLtoSQLite(raw);

  // Split statements by semicolon - basic split
  // Extract CREATE TABLE ... ); blocks to avoid executing comments/other statements
  // Match each CREATE TABLE block until the next comment or end of file
  const createTableRegex = /CREATE\s+TABLE[\s\S]*?(?=(?:\n--)|$)/gi;
  const stmts = [];
  let m;
  while ((m = createTableRegex.exec(cleaned)) !== null) stmts.push(m[0]);

  console.log('Found CREATE TABLE statements:', stmts.length);

  for (const stmt of stmts) {
    try {
      if (!stmt) continue;
      // remove any REFERENCES or FOREIGN KEY leftover lines
      let cleanedStmt = stmt.split('\n').filter(line => {
        const t = line.trim();
        if (/\bREFERENCES\b/i.test(t)) return false;
        if (/\bFOREIGN KEY\b/i.test(t)) return false;
        if (/^PRIMARY KEY\s*\(/i.test(t)) return false;
        if (/^ON DELETE\b/i.test(t)) return false;
        if (/^ON UPDATE\b/i.test(t)) return false;
        if (/^INDEX\b/i.test(t)) return false;
        if (/^UNIQUE INDEX\b/i.test(t)) return false;
        if (/^CONSTRAINT\b/i.test(t)) return false;
        return true;
      }).join('\n').replace(/,\s*\)/g, '\n)').replace(/\)\s*\)/g, ')');

      // Ensure statement is properly closed with a single closing paren
      if (!/\)\s*$/.test(cleanedStmt.trim())) {
        cleanedStmt = cleanedStmt.trim() + '\n)';
      }

      // Remove any trailing comma before the final closing paren
      cleanedStmt = cleanedStmt.replace(/,\s*\)\s*$/m, '\n)');

      console.log('Executing full statement:\n', cleanedStmt);
      await turso.execute(cleanedStmt + ';');
      console.log('OK');
    } catch (err) {
      console.error('Failed statement:', stmt.split('\n')[0]);
      console.error(err);
    }
  }
  console.log('Migration finished');
}

if (require.main === module) {
  runMigration().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { runMigration };
