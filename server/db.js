import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, 'rooms.db');

// 全局数据库实例
let db = null;

// 初始化数据库
async function initDatabase() {
  const SQL = await initSqlJs();

  // 加载现有数据库或创建新的
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
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
      quote TEXT,
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

    -- 玩家特效表
    CREATE TABLE IF NOT EXISTS player_effects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_identifier TEXT NOT NULL,
      effect_id TEXT NOT NULL,
      acquired_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(player_identifier, effect_id)
    );

    -- 玩家档案表（永久保存玩家数据）
    CREATE TABLE IF NOT EXISTS player_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_identifier TEXT UNIQUE NOT NULL,  -- 保留字段，兼容旧数据
      player_code TEXT UNIQUE,                  -- 6-8 位自定义档案码（新）
      password_hash TEXT,                       -- 密码哈希（新）
      nickname TEXT DEFAULT '玩家',

      -- 身体数据
      height_cm INTEGER,                        -- 身高 (cm)
      weight_kg REAL,                           -- 体重 (kg)
      birthday TEXT,                            -- 生日 YYYY-MM-DD

      -- 个人信息
      avatar_url TEXT,                          -- 头像 URL
      fullbody_image_url TEXT,                  -- 全身像 URL
      bio TEXT,                                 -- 个人签名

      -- 爱好（JSON 数组）
      hobbies TEXT DEFAULT '[]',                -- ["🎮", "🎵", "📖"]

      -- 展示配置
      displayed_effect_id TEXT,                 -- 展示的特效 ID
      displayed_gun_id TEXT,                    -- 展示的枪械 ID
      equipped_clothes_id TEXT,                 -- 装备的衣服
      equipped_headwear_id TEXT,                -- 装备的头饰
      equipped_accessory_id TEXT,               -- 装备的装饰品
      equipped_shoes_id TEXT,                   -- 装备的鞋子

      -- 统计
      total_games INTEGER DEFAULT 0,
      win_games INTEGER DEFAULT 0,
      carrot_count INTEGER DEFAULT 0,
      vip_level INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_login INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- 玩家物品背包表
    CREATE TABLE IF NOT EXISTS player_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,  -- 'EFFECT' | 'GUN' | 'CLOTHES' | 'HEADWEAR' | 'ACCESSORY' | 'SHOES'
      acquired_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(player_code, item_id, item_type)
    );

    -- 游戏历史记录表
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      is_winner INTEGER DEFAULT 0,
      game_date INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    -- VIP 房间表
    CREATE TABLE IF NOT EXISTS vip_rooms (
      id TEXT PRIMARY KEY,
      owner_player_code TEXT NOT NULL,
      password TEXT,
      bg_image TEXT DEFAULT '',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      expires_at INTEGER,  -- 可选的过期时间

      -- 房间游戏状态扩展字段
      fox_player_code TEXT,           -- 狐狸角色玩家档案码
      bunny_player_code TEXT,         -- 兔子角色玩家档案码
      fox_nickname TEXT,              -- 狐狸玩家昵称（用于显示）
      bunny_nickname TEXT,            -- 兔子玩家昵称（用于显示）
      current_word TEXT,              -- 当前词汇（JSON 字符串）
      punishment_banks TEXT,          -- 惩罚库（JSON 字符串）
      fox_ready INTEGER DEFAULT 0,    -- 狐狸准备状态
      bunny_ready INTEGER DEFAULT 0,  -- 兔子准备状态
      game_state TEXT DEFAULT 'setup' -- 游戏状态：setup/playing/settled

      -- FOREIGN KEY (owner_player_code) REFERENCES player_profiles(player_code) ON DELETE CASCADE
      -- 注释掉外键约束，SQLite 不支持在 CREATE TABLE 中间插入 FOREIGN KEY
    );

    -- 为 vip_rooms 表添加扩展字段（如果不存在）
    -- 注意：这些 ALTER TABLE 语句在表已存在且字段已存在时会失败，需要手动处理
    -- 首次初始化时会直接创建包含所有字段的表
  `);

  // 插入默认背景
  const bgCount = db.exec('SELECT COUNT(*) FROM backgrounds');
  if (bgCount[0][0] === 0) {
    db.run(`INSERT INTO backgrounds (name, url, is_preset) VALUES
      ('默认背景', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920', 1),
      ('樱花树下', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920', 1),
      ('海边沙滩', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920', 1),
      ('城市夜景', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920', 1),
      ('森林小屋', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920', 1),
      ('雪山风景', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920', 1),
      ('星空背景', 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?w=1920', 1),
      ('春日草原', 'https://images.unsplash.com/photo-1490750967868-58cb75063ed4?w=1920', 1)
    `);
  }

  saveDatabase();
  console.log('[DB] 数据库初始化成功');
  return db;
}

// 保存数据库到文件
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// 等待数据库初始化完成的 Promise
let dbReady = null;

export const waitForDb = () => {
  if (!dbReady) {
    dbReady = initDatabase();
  }
  return dbReady;
};

// 获取数据库实例（需要先调用 waitForDb）
export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call waitForDb() first.');
  }
  return db;
};

// 房间操作
export const roomOps = {
  create: (roomId, password = null) => {
    if (!db) return;
    const stmt = db.prepare('INSERT OR REPLACE INTO rooms (id, password, updated_at) VALUES (?, ?, strftime("%s", "now"))');
    stmt.run([roomId, password]);
    saveDatabase();
  },

  get: (roomId) => {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    stmt.bind([roomId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  delete: (roomId) => {
    if (!db) return;
    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    stmt.run([roomId]);
    saveDatabase();
  },

  exists: (roomId) => {
    if (!db) return false;
    const stmt = db.prepare('SELECT 1 FROM rooms WHERE id = ? LIMIT 1');
    stmt.bind([roomId]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  },

  // 验证房间密码
  verifyPassword: (roomId, password) => {
    if (!db) return { exists: false, valid: false };
    const room = roomOps.get(roomId);
    if (!room) {
      return { exists: false, valid: false };
    }
    // 如果房间没有密码，验证通过
    if (!room.password) {
      return { exists: true, valid: true };
    }
    // 验证密码
    return { exists: true, valid: room.password === password };
  },

  update: (roomId, updates) => {
    if (!db) return;
    const allowed = ['password', 'bg_image'];
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return;
    fields.push('updated_at = strftime("%s", "now")');
    values.push(roomId);
    const stmt = db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(values);
    saveDatabase();
  },

  updateBackground: (roomId, bgImage) => {
    if (!db) return;
    const stmt = db.prepare('UPDATE rooms SET bg_image = ?, updated_at = strftime("%s", "now") WHERE id = ?');
    stmt.run([bgImage, roomId]);
    saveDatabase();
  },

  updatePassword: (roomId, password) => {
    if (!db) return;
    const stmt = db.prepare('UPDATE rooms SET password = ?, updated_at = strftime("%s", "now") WHERE id = ?');
    stmt.run([password || '', roomId]);
    saveDatabase();
  },
};

// 消息操作
export const messageOps = {
  add: (roomId, senderId, senderName, senderRole, content, type = 'text', quote = null) => {
    if (!db) return;

    // 检查 messages 表是否有 quote 列
    let hasQuoteColumn = false;
    try {
      const result = db.exec('PRAGMA table_info(messages)');
      if (result && result[0] && result[0].values) {
        hasQuoteColumn = result[0].values.some(row => row[1] === 'quote');
      }
    } catch (e) {
      console.error('[MESSAGE] 检查 quote 列失败:', e);
    }

    // 如果有引用对象，序列化为 JSON 字符串存储
    let quoteJson = null;
    if (quote && typeof quote === 'object') {
      try {
        quoteJson = JSON.stringify(quote);
      } catch (e) {
        console.error('[MESSAGE] 序列化引用失败:', e);
      }
    }

    if (hasQuoteColumn) {
      const stmt = db.prepare('INSERT INTO messages (room_id, sender_id, sender_name, sender_role, content, type, quote) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run([roomId, senderId, senderName, senderRole, content, type, quoteJson]);
    } else {
      // 旧数据库，不存储 quote
      const stmt = db.prepare('INSERT INTO messages (room_id, sender_id, sender_name, sender_role, content, type) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run([roomId, senderId, senderName, senderRole, content, type]);
    }
    saveDatabase();
  },

  getByRoom: (roomId) => {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC LIMIT 100');
    stmt.bind([roomId]);
    const messages = [];
    while (stmt.step()) {
      messages.push(stmt.getAsObject());
    }
    stmt.free();
    return messages;
  },

  getHistory: (roomId, limit = 100) => {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC LIMIT ?');
    stmt.bind([roomId, limit]);
    const messages = [];
    while (stmt.step()) {
      messages.push(stmt.getAsObject());
    }
    stmt.free();
    return messages;
  },
};

// 背景操作
export const backgroundOps = {
  getAll: () => {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM backgrounds');
    stmt.bind();
    const backgrounds = [];
    while (stmt.step()) {
      backgrounds.push(stmt.getAsObject());
    }
    stmt.free();
    return backgrounds;
  },

  add: (name, url, isPreset = 0) => {
    if (!db) return;
    const stmt = db.prepare('INSERT INTO backgrounds (name, url, is_preset) VALUES (?, ?, ?)');
    stmt.run([name, url, isPreset]);
    saveDatabase();
  },

  delete: (id) => {
    if (!db) return;
    const stmt = db.prepare('DELETE FROM backgrounds WHERE id = ? AND is_preset = 0');
    stmt.run([id]);
    saveDatabase();
  },
};

// 胡萝卜操作
export const carrotOps = {
  get: (playerIdentifier) => {
    if (!db) return 0;
    const stmt = db.prepare('SELECT carrot_count FROM player_carrots WHERE player_identifier = ?');
    stmt.bind([playerIdentifier]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row.carrot_count;
    }
    stmt.free();
    return 0;
  },

  // 别名，兼容旧代码
  getCount: (playerIdentifier) => carrotOps.get(playerIdentifier),

  upsert: (playerIdentifier, delta) => {
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
      VALUES (?, COALESCE((SELECT carrot_count FROM player_carrots WHERE player_identifier = ?), 0) + ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET carrot_count = carrot_count + ?, last_updated = strftime('%s', 'now')
    `);
    stmt.run([playerIdentifier, playerIdentifier, delta, delta]);
    saveDatabase();
  },

  set: (playerIdentifier, count) => {
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET carrot_count = ?, last_updated = strftime('%s', 'now')
    `);
    stmt.run([playerIdentifier, count, count]);
    saveDatabase();
  },

  // 添加胡萝卜（增加指定数量）
  addCarrot: (playerIdentifier, delta) => {
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
      VALUES (?, COALESCE((SELECT carrot_count FROM player_carrots WHERE player_identifier = ?), 0) + ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET carrot_count = carrot_count + ?, last_updated = strftime('%s', 'now')
    `);
    stmt.run([playerIdentifier, playerIdentifier, delta, delta]);
    saveDatabase();
  },
};

// 玩家特效操作
export const effectOps = {
  getPlayerEffects: (playerIdentifier) => {
    if (!db) return [];
    const stmt = db.prepare('SELECT effect_id FROM player_effects WHERE player_identifier = ?');
    stmt.bind([playerIdentifier]);
    const effects = [];
    while (stmt.step()) {
      effects.push(stmt.getAsObject().effect_id);
    }
    stmt.free();
    return effects;
  },

  // 获取玩家已解锁的特效（别名）
  getUnlocked: (playerIdentifier) => effectOps.getPlayerEffects(playerIdentifier),

  addEffect: (playerIdentifier, effectId) => {
    if (!db) return;
    const stmt = db.prepare('INSERT OR IGNORE INTO player_effects (player_identifier, effect_id) VALUES (?, ?)');
    stmt.run([playerIdentifier, effectId]);
    saveDatabase();
  },

  hasEffect: (playerIdentifier, effectId) => {
    if (!db) return false;
    const stmt = db.prepare('SELECT 1 FROM player_effects WHERE player_identifier = ? AND effect_id = ? LIMIT 1');
    stmt.bind([playerIdentifier, effectId]);
    const has = stmt.step();
    stmt.free();
    return has;
  },

  // 解锁特效（别名，用于兼容服务器调用）
  unlock: (playerIdentifier, effectId) => {
    effectOps.addEffect(playerIdentifier, effectId);
  },
};

// 玩家档案操作
export const playerOps = {
  // 检查档案码是否可用
  isCodeAvailable: (playerCode) => {
    if (!db) return false;
    const stmt = db.prepare('SELECT 1 FROM player_profiles WHERE player_code = ? LIMIT 1');
    stmt.bind([playerCode]);
    const exists = stmt.step();
    stmt.free();
    return !exists;
  },

  // 通过档案码 + 密码获取玩家（登录用）
  getByCodeAndPassword: (playerCode, passwordHash) => {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM player_profiles WHERE player_code = ? AND password_hash = ?');
    stmt.bind([playerCode, passwordHash]);
    if (stmt.step()) {
      const player = stmt.getAsObject();
      stmt.free();
      return player;
    }
    stmt.free();
    return null;
  },

  // 通过档案码获取玩家
  getByCode: (playerCode) => {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM player_profiles WHERE player_code = ?');
    stmt.bind([playerCode]);
    if (stmt.step()) {
      const player = stmt.getAsObject();
      stmt.free();
      return player;
    }
    stmt.free();
    return null;
  },

  // 创建玩家档案（带密码）
  create: (playerCode, passwordHash, nickname = '玩家') => {
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO player_profiles (player_identifier, player_code, password_hash, nickname, last_login)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `);
    stmt.run([playerCode, playerCode, passwordHash, nickname]);
    saveDatabase();
  },

  // 创建或更新玩家档案（兼容旧版，使用 player_identifier）
  upsert: (playerIdentifier, data = {}) => {
    if (!db) return;
    const existing = playerOps.getByIdentifier(playerIdentifier);
    if (existing) {
      playerOps.update(playerIdentifier, data);
    } else {
      const stmt = db.prepare(`
        INSERT INTO player_profiles (player_identifier, nickname, carrot_count, last_login)
        VALUES (?, ?, ?, strftime('%s', 'now'))
      `);
      stmt.run([playerIdentifier, data.nickname || '玩家', data.carrot_count || 0]);
      saveDatabase();
    }
  },

  // 通过 player_identifier 获取玩家（旧版兼容）
  getByIdentifier: (playerIdentifier) => {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM player_profiles WHERE player_identifier = ?');
    stmt.bind([playerIdentifier]);
    if (stmt.step()) {
      const player = stmt.getAsObject();
      stmt.free();
      return player;
    }
    stmt.free();
    return null;
  },

  // 获取玩家档案（支持 player_identifier 或 player_code）
  get: (playerIdentifier) => {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM player_profiles WHERE player_identifier = ? OR player_code = ?');
    stmt.bind([playerIdentifier, playerIdentifier]);
    if (stmt.step()) {
      const player = stmt.getAsObject();
      stmt.free();
      return player;
    }
    stmt.free();
    return null;
  },

  // 更新玩家数据
  // 更新玩家资料
  update: (playerCode, updates) => {
    if (!db) return;

    // 字段名映射（前端驼峰 -> 数据库下划线）
    const fieldMap = {
      'heightCm': 'height_cm',
      'weightKg': 'weight_kg',
      'birthday': 'birthday',
      'avatarUrl': 'avatar_url',
      'fullbodyImageUrl': 'fullbody_image_url',
      'bio': 'bio',
      'hobbies': 'hobbies',
      'displayedEffectId': 'displayed_effect_id',
      'displayedGunId': 'displayed_gun_id',
      'equippedClothesId': 'equipped_clothes_id',
      'equippedHeadwearId': 'equipped_headwear_id',
      'equippedAccessoryId': 'equipped_accessory_id',
      'equippedShoesId': 'equipped_shoes_id',
      'nickname': 'nickname',
      'totalGames': 'total_games',
      'winGames': 'win_games',
      'carrotCount': 'carrot_count',
      'vipLevel': 'vip_level'
    };

    const allowed = ['nickname', 'total_games', 'win_games', 'carrot_count', 'vip_level',
                     'height_cm', 'weight_kg', 'birthday', 'avatar_url', 'fullbody_image_url',
                     'bio', 'hobbies', 'displayed_effect_id', 'displayed_gun_id',
                     'equipped_clothes_id', 'equipped_headwear_id', 'equipped_accessory_id', 'equipped_shoes_id'];
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      const dbKey = fieldMap[key] || key;
      if (allowed.includes(dbKey)) {
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return;
    values.push(playerCode);
    const stmt = db.prepare(`UPDATE player_profiles SET ${fields.join(', ')} WHERE player_code = ?`);
    stmt.run(values);
    saveDatabase();
  },

  // 修改玩家昵称（仅改名，不改变档案码）
  changeNickname: (playerCode, newNickname) => {
    if (!db) return { success: false, error: '数据库未初始化' };

    // 检查新昵称是否合法（1-20 字符）
    if (!newNickname || newNickname.length < 1 || newNickname.length > 20) {
      return { success: false, error: '昵称长度 1-20 个字符' };
    }

    const stmt = db.prepare('UPDATE player_profiles SET nickname = ? WHERE player_code = ?');
    stmt.run([newNickname, playerCode]);
    saveDatabase();
    return { success: true };
  },

  // 获取排行榜（按胡萝卜数量排序）
  getLeaderboard: (limit = 10, orderBy = 'carrot_count') => {
    if (!db) return [];
    const allowedOrders = ['carrot_count', 'total_games', 'win_games'];
    const orderCol = allowedOrders.includes(orderBy) ? orderBy : 'carrot_count';
    const stmt = db.prepare(`
      SELECT player_code, nickname, carrot_count, total_games, win_games, vip_level, created_at, last_login
      FROM player_profiles
      ORDER BY ${orderCol} DESC
      LIMIT ?
    `);
    stmt.bind([limit]);
    const players = [];
    while (stmt.step()) {
      players.push(stmt.getAsObject());
    }
    stmt.free();
    return players;
  },
};

// 玩家物品背包操作
export const inventoryOps = {
  // 获取玩家所有物品
  getAll: (playerCode) => {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM player_inventory WHERE player_code = ?');
    stmt.bind([playerCode]);
    const inventory = [];
    while (stmt.step()) {
      inventory.push(stmt.getAsObject());
    }
    stmt.free();
    return inventory;
  },

  // 添加物品
  add: (playerCode, itemId, itemType) => {
    if (!db) return;
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO player_inventory (player_code, item_id, item_type, acquired_at)
      VALUES (?, ?, ?, strftime('%s', 'now'))
    `);
    stmt.run([playerCode, itemId, itemType]);
    saveDatabase();
  },

  // 检查玩家是否拥有某物品
  has: (playerCode, itemId) => {
    if (!db) return false;
    const stmt = db.prepare('SELECT 1 FROM player_inventory WHERE player_code = ? AND item_id = ? LIMIT 1');
    stmt.bind([playerCode, itemId]);
    const has = stmt.step();
    stmt.free();
    return has;
  },
};

// VIP 房间操作
export const vipRoomOps = {
  create: (roomId, ownerPlayerCode, password = null) => {
    if (!db) return;
    const stmt = db.prepare('INSERT INTO vip_rooms (id, owner_player_code, password) VALUES (?, ?, ?)');
    stmt.run([roomId, ownerPlayerCode, password]);
    saveDatabase();
  },

  get: (roomId) => {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM vip_rooms WHERE id = ?');
    stmt.bind([roomId]);
    if (stmt.step()) {
      const room = stmt.getAsObject();
      stmt.free();
      return room;
    }
    stmt.free();
    return null;
  },

  // 获取完整房间状态（含玩家和游戏状态）
  getFullRoomState: (roomId) => {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM vip_rooms WHERE id = ?');
    stmt.bind([roomId]);
    if (stmt.step()) {
      const room = stmt.getAsObject();
      stmt.free();
      return room;
    }
    stmt.free();
    return null;
  },

  delete: (roomId) => {
    if (!db) return;
    const stmt = db.prepare('DELETE FROM vip_rooms WHERE id = ?');
    stmt.run([roomId]);
    saveDatabase();
  },

  exists: (roomId) => {
    if (!db) return false;
    const stmt = db.prepare('SELECT 1 FROM vip_rooms WHERE id = ? LIMIT 1');
    stmt.bind([roomId]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  },

  getByOwner: (ownerPlayerCode) => {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM vip_rooms WHERE owner_player_code = ?');
    stmt.bind([ownerPlayerCode]);
    const rooms = [];
    while (stmt.step()) {
      rooms.push(stmt.getAsObject());
    }
    stmt.free();
    return rooms;
  },

  // 根据档案码查找玩家所在的房间
  findRoomByPlayerCode: (playerCode) => {
    if (!db) return null;
    const stmt = db.prepare(`
      SELECT * FROM vip_rooms
      WHERE fox_player_code = ? OR bunny_player_code = ?
      LIMIT 1
    `);
    stmt.bind([playerCode, playerCode]);
    if (stmt.step()) {
      const room = stmt.getAsObject();
      stmt.free();
      return room;
    }
    stmt.free();
    return null;
  },

  // 更新房间玩家状态
  updatePlayers: (roomId, foxPlayerCode, bunnyPlayerCode, foxNickname, bunnyNickname) => {
    if (!db) return;
    const stmt = db.prepare(`
      UPDATE vip_rooms
      SET fox_player_code = ?, bunny_player_code = ?,
          fox_nickname = ?, bunny_nickname = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([foxPlayerCode, bunnyPlayerCode, foxNickname, bunnyNickname, roomId]);
    saveDatabase();
  },

  // 更新房间玩家角色绑定（单个玩家）
  updatePlayerRole: (roomId, role, playerCode, nickname) => {
    if (!db) return;
    const roleColumn = role === 'fox' ? 'fox_player_code' : 'bunny_player_code';
    const nicknameColumn = role === 'fox' ? 'fox_nickname' : 'bunny_nickname';
    const stmt = db.prepare(`
      UPDATE vip_rooms
      SET ${roleColumn} = ?, ${nicknameColumn} = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([playerCode, nickname, roomId]);
    saveDatabase();
  },

  // 更新游戏状态
  updateGameState: (roomId, gameState) => {
    if (!db) return;
    const updates = [];
    const values = [];

    if (gameState.word !== undefined) {
      updates.push('current_word = ?');
      values.push(typeof gameState.word === 'string' ? gameState.word : JSON.stringify(gameState.word));
    }
    if (gameState.punishments !== undefined) {
      updates.push('punishment_banks = ?');
      values.push(typeof gameState.punishments === 'string' ? gameState.punishments : JSON.stringify(gameState.punishments));
    }
    if (gameState.game_state !== undefined) {
      updates.push('game_state = ?');
      values.push(gameState.game_state);
    }

    if (updates.length > 0) {
      updates.push('updated_at = strftime("%s", "now")');
      values.push(roomId);
      const stmt = db.prepare(`UPDATE vip_rooms SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(values);
      saveDatabase();
    }
  },

  // 更新准备状态
  updateReadyState: (roomId, role, isReady) => {
    if (!db) return;
    const column = role === 'fox' ? 'fox_ready' : 'bunny_ready';
    const stmt = db.prepare(`
      UPDATE vip_rooms
      SET ${column} = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([isReady ? 1 : 0, roomId]);
    saveDatabase();
  },

  // 清除房间玩家状态（游戏重置时）
  clearGame: (roomId) => {
    if (!db) return;
    const stmt = db.prepare(`
      UPDATE vip_rooms
      SET current_word = NULL, punishment_banks = NULL,
          fox_ready = 0, bunny_ready = 0, game_state = 'setup',
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([roomId]);
    saveDatabase();
  },
};

// 游戏历史操作
export const gameHistoryOps = {
  add: (roomId, playerName, isWinner) => {
    if (!db) return;
    const stmt = db.prepare('INSERT INTO game_history (room_id, player_name, is_winner) VALUES (?, ?, ?)');
    stmt.run([roomId, playerName, isWinner ? 1 : 0]);
    saveDatabase();
  },

  getByRoom: (roomId) => {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM game_history WHERE room_id = ? ORDER BY game_date DESC LIMIT 50');
    stmt.bind([roomId]);
    const history = [];
    while (stmt.step()) {
      history.push(stmt.getAsObject());
    }
    stmt.free();
    return history;
  },

  getHonorHall: () => {
    if (!db) return [];
    const stmt = db.prepare(`
      SELECT player_name, COUNT(*) as win_count
      FROM game_history
      WHERE is_winner = 1
      GROUP BY player_name
      ORDER BY win_count DESC
      LIMIT 50
    `);
    stmt.bind();
    const honorRoll = [];
    while (stmt.step()) {
      honorRoll.push(stmt.getAsObject());
    }
    stmt.free();
    return honorRoll;
  },
};

// 排行榜操作
export const leaderboardOps = {
  // 获取所有玩家数据（用于排行榜）
  getAllPlayers: () => {
    if (!db) return [];
    const stmt = db.prepare(`
      SELECT player_code, nickname, carrot_count, total_games, win_games, vip_level
      FROM player_profiles
      ORDER BY carrot_count DESC
      LIMIT 100
    `);
    stmt.bind();
    const players = [];
    while (stmt.step()) {
      players.push(stmt.getAsObject());
    }
    stmt.free();
    return players;
  },
};

export default getDb;
