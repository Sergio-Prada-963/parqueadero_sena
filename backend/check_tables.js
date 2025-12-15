const turso = require('./turso');
const run = async () => {
  try {
    const res = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    if (res && res.columns && res.values) {
      const cols = res.columns.map(c => (c && c.name) ? c.name : c);
      const rows = res.values.map(r => { const o = {}; for (let i=0;i<cols.length;i++) o[cols[i]] = r[i]; return o; });
      console.log('Tables:', rows.map(r => r.name).join(', '));
    } else if (res && Array.isArray(res.rows)) {
      console.log('Tables:', res.rows.map(r => r.name).join(', '));
    } else {
      console.log('No result for table list');
    }
  } catch (err) { console.error(err); }
};
run();
