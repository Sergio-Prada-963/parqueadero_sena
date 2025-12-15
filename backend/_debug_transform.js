const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', 'script_database.sql'), 'utf8');
let s = raw.replace(/`/g, '');
s = s.replace(/^SET .*$/gim, '');
s = s.replace(/^CREATE SCHEMA .*$/gim, '');
s = s.replace(/^USE .*$/gim, '');
s = s.replace(/\bTINYINT\b/gi, 'INTEGER');
s = s.replace(/\bDATETIME\b/gi, 'TEXT');
s = s.replace(/\bDECIMAL\([^\)]+\)/gi, 'NUMERIC');
s = s.replace(/\bENUM\([^\)]+\)/gi, 'TEXT');
s = s.replace(/(\b\w+\b)\s+INT\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, '$1 INTEGER PRIMARY KEY AUTOINCREMENT');
s = s.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
s = s.replace(/ENGINE\s*=\s*[^;]+;?/gi, '');

const arr = s.match(/CREATE\s+TABLE[\s\S]*?\)\s*;/gi) || [];
console.log('matches:', arr.length);
if (arr.length) console.log('first:', arr[0].slice(0,400));
else console.log('cleaned preview:', s.slice(0,400));

console.log('raw contains CREATE TABLE:', /CREATE\s+TABLE/i.test(raw));
console.log('cleaned contains CREATE TABLE:', /CREATE\s+TABLE/i.test(s));

const idx = s.search(/CREATE\s+TABLE/i);
if (idx !== -1) console.log('snippet around CREATE TABLE:\n', s.slice(Math.max(0, idx-80), idx+400));
