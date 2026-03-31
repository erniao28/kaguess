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

  -- 玩家特效解锁表
  CREATE TABLE IF NOT EXISTS player_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_identifier TEXT NOT NULL,
    effect_id TEXT NOT NULL,
    unlocked_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(player_identifier, effect_id)
  );

  -- 玩家档案表（永久保存玩家数据）
  CREATE TABLE IF NOT EXISTS player_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_identifier TEXT UNIQUE NOT NULL,
    nickname TEXT DEFAULT '玩家',
    total_games INTEGER DEFAULT 0,
    win_games INTEGER DEFAULT 0,
    carrot_count INTEGER DEFAULT 0,
    vip_level INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    last_login INTEGER DEFAULT (strftime('%s', 'now'))
  );

  -- 游戏历史记录表
  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    fox_player TEXT,
    bunny_player TEXT,
    winner TEXT,
    fox_score INTEGER DEFAULT 0,
    bunny_score INTEGER DEFAULT 0,
    word_used TEXT,
    duration INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  -- VIP 房间扩展表（保存房间详细配置）
  CREATE TABLE IF NOT EXISTS vip_rooms (
    id TEXT PRIMARY KEY,
    owner_identifier TEXT NOT NULL,
    room_name TEXT DEFAULT 'VIP 房间',
    is_vip INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 2,
    bg_image TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER,
    FOREIGN KEY (id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_player_profiles_identifier ON player_profiles(player_identifier);
  CREATE INDEX IF NOT EXISTS idx_game_history_room_id ON game_history(room_id);
  CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);
  CREATE INDEX IF NOT EXISTS idx_vip_rooms_owner ON vip_rooms(owner_identifier);
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

// 特效操作
export const effectOps = {
  // 获取玩家解锁的特效
  getUnlocked: (playerIdentifier) => {
    const stmt = db.prepare('SELECT effect_id FROM player_effects WHERE player_identifier = ?');
    return stmt.all(playerIdentifier).map(row => row.effect_id);
  },

  // 解锁特效
  unlock: (playerIdentifier, effectId) => {
    const stmt = db.prepare(`
      INSERT INTO player_effects (player_identifier, effect_id, unlocked_at)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier, effect_id) DO NOTHING
    `);
    return stmt.run(playerIdentifier, effectId);
  },

  // 批量解锁特效
  unlockMany: (playerIdentifier, effectIds) => {
    const stmt = db.prepare(`
      INSERT INTO player_effects (player_identifier, effect_id, unlocked_at)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier, effect_id) DO NOTHING
    `);
    const transaction = db.transaction((ids) => {
      ids.forEach(id => stmt.run(playerIdentifier, id));
    });
    transaction(effectIds);
  },
};

// 玩家档案操作
export const playerOps = {
  // 创建或更新玩家档案
  upsert: (playerIdentifier, data = {}) => {
    const stmt = db.prepare(`
      INSERT INTO player_profiles (player_identifier, nickname, carrot_count, last_login)
      VALUES (?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET
        nickname = excluded.nickname,
        carrot_count = excluded.carrot_count,
        last_login = strftime('%s', 'now')
    `);
    return stmt.run(playerIdentifier, data.nickname || '玩家', data.carrot_count || 0);
  },

  // 获取玩家档案
  get: (playerIdentifier) => {
    const stmt = db.prepare('SELECT * FROM player_profiles WHERE player_identifier = ?');
    return stmt.get(playerIdentifier);
  },

  // 更新玩家数据
  update: (playerIdentifier, updates) => {
    const allowed = ['nickname', 'total_games', 'win_games', 'carrot_count', 'vip_level', 'last_login'];
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return;
    const stmt = db.prepare(`UPDATE player_profiles SET ${fields.join(', ')} WHERE player_identifier = ?`);
    values.push(playerIdentifier);
    return stmt.run(...values);
  },

  // 获取玩家排名
  getLeaderboard: (limit = 10, orderBy = 'carrot_count') => {
    const validOrders = ['carrot_count', 'win_games', 'total_games', 'vip_level'];
    const order = validOrders.includes(orderBy) ? orderBy : 'carrot_count';
    const stmt = db.prepare(`SELECT * FROM player_profiles ORDER BY ${order} DESC LIMIT ?`);
    return stmt.all(limit);
  },
};

// 游戏历史操作
export const gameHistoryOps = {
  // 记录游戏
  add: (gameData) => {
    const stmt = db.prepare(`
      INSERT INTO game_history (room_id, fox_player, bunny_player, winner, fox_score, bunny_score, word_used, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      gameData.roomId,
      gameData.foxPlayer,
      gameData.bunnyPlayer,
      gameData.winner,
      gameData.foxScore,
      gameData.bunnyScore,
      gameData.wordUsed,
      gameData.duration
    );
  },

  // 获取玩家历史
  getPlayerHistory: (playerIdentifier, limit = 20) => {
    const stmt = db.prepare(`
      SELECT * FROM game_history
      WHERE fox_player = ? OR bunny_player = ?
      ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(playerIdentifier, playerIdentifier, limit);
  },

  // 获取房间历史
  getRoomHistory: (roomId, limit = 10) => {
    const stmt = db.prepare(`
      SELECT * FROM game_history WHERE room_id = ? ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(roomId, limit);
  },
};

// VIP 房间操作
export const vipRoomOps = {
  // 创建 VIP 房间
  create: (roomId, ownerIdentifier, options = {}) => {
    const stmt = db.prepare(`
      INSERT INTO vip_rooms (id, owner_identifier, room_name, is_vip, bg_image, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const expiresAt = options.expiresAt || null;
    return stmt.run(roomId, ownerIdentifier, options.name || 'VIP 房间', 1, options.bgImage || '', expiresAt);
  },

  // 获取 VIP 房间
  get: (roomId) => {
    const stmt = db.prepare('SELECT * FROM vip_rooms WHERE id = ?');
    return stmt.get(roomId);
  },

  // 获取玩家的所有 VIP 房间
  getPlayerRooms: (playerIdentifier) => {
    const stmt = db.prepare('SELECT * FROM vip_rooms WHERE owner_identifier = ? ORDER BY created_at DESC');
    return stmt.all(playerIdentifier);
  },

  // 更新 VIP 房间
  update: (roomId, updates) => {
    const allowed = ['room_name', 'is_vip', 'bg_image', 'expires_at'];
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return;
    const stmt = db.prepare(`UPDATE vip_rooms SET ${fields.join(', ')} WHERE id = ?`);
    values.push(roomId);
    return stmt.run(...values);
  },

  // 删除 VIP 房间
  delete: (roomId) => {
    const stmt = db.prepare('DELETE FROM vip_rooms WHERE id = ?');
    return stmt.run(roomId);
  },
};

export default db;
