// 迁移脚本：为 vip_rooms 表添加缺失字段
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQL = await initSqlJs();
const dbPath = path.resolve(__dirname, 'rooms.db');

const db = new SQL.Database(fs.readFileSync(dbPath));

// 添加缺失的字段
const columnsToAdd = [
  'fox_player_code TEXT',
  'bunny_player_code TEXT',
  'fox_nickname TEXT',
  'bunny_nickname TEXT',
  'current_word TEXT',
  'punishment_banks TEXT',
  'fox_ready INTEGER DEFAULT 0',
  'bunny_ready INTEGER DEFAULT 0',
  'game_state TEXT DEFAULT \'setup\''
];

columnsToAdd.forEach(col => {
  try {
    db.run('ALTER TABLE vip_rooms ADD COLUMN ' + col);
    console.log('Added:', col);
  } catch(e) {
    if (e.message.includes('duplicate') || e.message.includes('already exists')) {
      console.log('Exists:', col);
    } else {
      console.log('Error:', col, e.message);
    }
  }
});

// 保存数据库
const data = db.export();
const buffer = Buffer.from(data);
fs.writeFileSync(dbPath, buffer);
console.log('Database saved successfully');
