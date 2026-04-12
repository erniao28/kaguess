// 迁移脚本：为 vip_rooms 表添加 fox_score 和 bunny_score 字段
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQL = await initSqlJs();
const dbPath = path.resolve(__dirname, 'rooms.db');

const db = new SQL.Database(fs.readFileSync(dbPath));

// 添加分数字段
try {
  db.run('ALTER TABLE vip_rooms ADD COLUMN fox_score INTEGER DEFAULT 0');
  console.log('Added: fox_score');
} catch(e) {
  if (e.message.includes('duplicate') || e.message.includes('already exists')) {
    console.log('Exists: fox_score');
  } else {
    console.log('Error: fox_score', e.message);
  }
}

try {
  db.run('ALTER TABLE vip_rooms ADD COLUMN bunny_score INTEGER DEFAULT 0');
  console.log('Added: bunny_score');
} catch(e) {
  if (e.message.includes('duplicate') || e.message.includes('already exists')) {
    console.log('Exists: bunny_score');
  } else {
    console.log('Error: bunny_score', e.message);
  }
}

// 保存数据库
const data = db.export();
const buffer = Buffer.from(data);
fs.writeFileSync(dbPath, buffer);
console.log('Database saved successfully');
