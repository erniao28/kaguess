import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化数据库
const db = new Database(path.resolve(__dirname, 'rooms.db'));

// 创建表
db.exec(`
  -- 房间表
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    password TEXT,
    bg_image TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  -- 聊天消息表
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  -- 预设背景表
  CREATE TABLE IF NOT EXISTS backgrounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_preset INTEGER DEFAULT 1
  );

  -- 玩家胡萝卜记录表（按玩家标识记录）
  CREATE TABLE IF NOT EXISTS player_carrots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_identifier TEXT UNIQUE NOT NULL,
    carrot_count INTEGER DEFAULT 0,
    last_updated INTEGER DEFAULT (strftime('%s', 'now'))
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
  CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  CREATE INDEX IF NOT EXISTS idx_player_carrots_identifier ON player_carrots(player_identifier);
`);

// 插入预设背景（如果不存在）
const presetBackgrounds = [
  { name: '默认', url: '' },
  { name: '樱花', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920' },
  { name: '星空', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?w=1920' },
  { name: '海滩', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920' },
  { name: '森林', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920' },
  { name: '雪山', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920' },
  { name: '城市', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920' },
  { name: '温馨', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1920' },
];

const existingCount = db.prepare('SELECT COUNT(*) as count FROM backgrounds').get();
if (existingCount.count === 0) {
  const insert = db.prepare('INSERT INTO backgrounds (name, url, is_preset) VALUES (?, ?, 1)');
  const transaction = db.transaction((backgrounds) => {
    backgrounds.forEach(bg => insert.run(bg.name, bg.url));
  });
  transaction(presetBackgrounds);
}

// 房间操作
export const roomOps = {
  // 创建房间
  create: (id, password) => {
    const stmt = db.prepare(`
      INSERT INTO rooms (id, password, created_at, updated_at)
      VALUES (?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
    `);
    return stmt.run(id, password);
  },

  // 获取房间
  get: (id) => {
    const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    return stmt.get(id);
  },

  // 验证密码
  verifyPassword: (id, password) => {
    const room = roomOps.get(id);
    if (!room) return { exists: false, valid: false };
    if (!room.password) return { exists: true, valid: true };
    return { exists: true, valid: room.password === password };
  },

  // 更新背景
  updateBackground: (id, bgImage) => {
    const stmt = db.prepare(`
      UPDATE rooms SET bg_image = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `);
    return stmt.run(bgImage, id);
  },

  // 更新密码
  updatePassword: (id, password) => {
    const stmt = db.prepare(`
      UPDATE rooms SET password = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `);
    return stmt.run(password, id);
  },

  // 删除房间
  delete: (id) => {
    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    return stmt.run(id);
  },
};

// 消息操作
export const messageOps = {
  // 添加消息
  add: (roomId, message) => {
    const stmt = db.prepare(`
      INSERT INTO messages (room_id, sender_id, sender_name, sender_role, content, type, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      roomId,
      message.senderId,
      message.senderName,
      message.senderRole || null,
      message.content,
      message.type,
      message.timestamp
    );
  },

  // 获取历史消息
  getHistory: (roomId, limit = 100) => {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE room_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `);
    return stmt.all(roomId, limit).map(row => ({
      id: `msg-${row.id}`,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      content: row.content,
      type: row.type,
      timestamp: row.timestamp
    }));
  },

  // 删除房间所有消息
  deleteByRoom: (roomId) => {
    const stmt = db.prepare('DELETE FROM messages WHERE room_id = ?');
    return stmt.run(roomId);
  },
};

// 背景操作
export const backgroundOps = {
  // 获取所有背景
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM backgrounds ORDER BY id');
    return stmt.all();
  },

  // 添加自定义背景
  addCustom: (name, url) => {
    const stmt = db.prepare('INSERT INTO backgrounds (name, url, is_preset) VALUES (?, ?, 0)');
    return stmt.run(name, url);
  },

  // 删除自定义背景
  deleteCustom: (id) => {
    const stmt = db.prepare('DELETE FROM backgrounds WHERE id = ? AND is_preset = 0');
    return stmt.run(id);
  },
};

// 胡萝卜操作
export const carrotOps = {
  // 获取玩家胡萝卜数量
  getCount: (playerIdentifier) => {
    const stmt = db.prepare('SELECT carrot_count FROM player_carrots WHERE player_identifier = ?');
    const result = stmt.get(playerIdentifier);
    return result ? result.carrot_count : 0;
  },

  // 增加胡萝卜
  addCarrot: (playerIdentifier, count = 1) => {
    const stmt = db.prepare(`
      INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET
        carrot_count = carrot_count + ?,
        last_updated = strftime('%s', 'now')
    `);
    return stmt.run(playerIdentifier, count, count);
  },

  // 获取所有玩家排名
  getLeaderboard: (limit = 10) => {
    const stmt = db.prepare(`
      SELECT player_identifier, carrot_count, last_updated
      FROM player_carrots
      ORDER BY carrot_count DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },
};

export default db;
