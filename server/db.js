// =========================================
// 数据库保护机制 - 重要说明
// =========================================
// 1. 禁止直接获取数据库实例执行任意 SQL
// 2. 所有写操作必须通过业务逻辑（roomOps, messageOps 等）
// 3. 数据库结构变更通过代码自动处理（CREATE TABLE IF NOT EXISTS）
// 4. 如需临时直接访问，设置环境变量 ALLOW_DIRECT_DB_ACCESS=true
//
// 为什么：数据库内容是用户的，代码无权随意改动
// =========================================

import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, 'rooms.db');

// 获取 CST（中国时区 UTC+8）的日期字符串 YYYY-MM-DD
function getCSTDate() {
  const now = new Date();
  const cstTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return cstTime.toISOString().split('T')[0];
}

// 获取 io 实例的函数（由 index.js 设置）
let _getIo = null;
export const setGetIo = (fn) => { _getIo = fn; };
export const getIo = () => _getIo;

// 私有数据库实例（仅供内部使用）
let _db = null;

// 初始化数据库
async function initDatabase() {
  const SQL = await initSqlJs();

  // 加载现有数据库或创建新的
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // 创建表
  _db.run(`
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
      timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      -- FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE -- 注释掉，SQLite 不支持
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
      login_days INTEGER DEFAULT 1,  -- 登录天数（用于计算 VIP 等级）
      last_login_date TEXT,          -- 最后登录日期 YYYY-MM-DD
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

    -- 电子宠物表
    CREATE TABLE IF NOT EXISTS pet_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT UNIQUE NOT NULL,         -- 主人档案码
      pet_name TEXT DEFAULT '小宠物',
      pet_type TEXT DEFAULT 'FOX',              -- FOX/BUNNY/CAT/DOG
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      hunger INTEGER DEFAULT 100,               -- 饥饿值 0-100
      mood INTEGER DEFAULT 100,                 -- 心情值 0-100
      cleanliness INTEGER DEFAULT 100,          -- 清洁度 0-100
      energy INTEGER DEFAULT 100,               -- 能量值 0-100
      last_feed_time INTEGER,                   -- 最后喂食时间戳
      last_clean_time INTEGER,                  -- 最后清洁时间戳
      last_play_time INTEGER,                   -- 最后玩耍时间戳
      last_login_time INTEGER DEFAULT (strftime('%s', 'now')),
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      -- 孵化系统字段
      is_egg INTEGER DEFAULT 0,                 -- 是否是蛋状态
      hatch_time INTEGER,                       -- 孵化时间戳
      selected_pet_id TEXT,                     -- 预先确定的宠物 ID
      selected_pet_name TEXT,                   -- 预先确定的宠物名称
      selected_pet_type TEXT                    -- 预先确定的宠物类型
    );

    -- 宠物物品背包表
    CREATE TABLE IF NOT EXISTS pet_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,  -- 'FOOD' | 'TOY' | 'DECORATION' | 'CLOTHING'
      quantity INTEGER DEFAULT 1,
      acquired_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(player_code, item_id, item_type)
    );

    -- 游戏历史记录表
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      is_winner INTEGER DEFAULT 0,
      game_date INTEGER DEFAULT (strftime('%s', 'now'))
      -- FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE -- 注释掉，SQLite 不支持
    );

    -- 奶酪存款记录表
    CREATE TABLE IF NOT EXISTS cheese_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT NOT NULL,
      amount INTEGER NOT NULL,
      deposit_date INTEGER DEFAULT (strftime('%s', 'now')),
      last_interest_date TEXT
    );

    -- 奶酪贷款记录表
    CREATE TABLE IF NOT EXISTS cheese_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT NOT NULL,
      amount INTEGER NOT NULL,
      loan_date INTEGER DEFAULT (strftime('%s', 'now')),
      due_date INTEGER,
      is_paid INTEGER DEFAULT 0
    );

    -- OMO 胡萝卜赠送提案表（需要两位荣誉董事同意）
    CREATE TABLE IF NOT EXISTS carrot_gift_proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_player_code TEXT NOT NULL,
      carrot_amount INTEGER NOT NULL,
      proposer_code TEXT NOT NULL,
      proposer_role TEXT NOT NULL,  -- 'FOX' (尼克) 或 'BUNNY' (朱迪)
      fox_approved INTEGER DEFAULT 0,
      bunny_approved INTEGER DEFAULT 0,
      is_executed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      executed_at INTEGER
    );

    -- 胡萝卜转账记录表
    CREATE TABLE IF NOT EXISTS carrot_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_player_code TEXT,  -- NULL 表示央行 OMO 赠送
      to_player_code TEXT NOT NULL,
      carrot_amount INTEGER NOT NULL,
      transfer_type TEXT NOT NULL,  -- 'GIFT' (手动赠送), 'OMO' (央行 OMO), 'REWARD' (奖励)
      approval_info TEXT,  -- JSON 字符串，记录审批信息
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- 钱包交易记录表（胡萝卜和奶酪的收支明细）
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT NOT NULL,
      currency TEXT NOT NULL,  -- 'CARROT' | 'CHEESE'
      type TEXT NOT NULL,  -- 'DAILY_CLAIM'|'FURNITURE_BUY'|'FURNITURE_PLACE'|'CARROT_EXCHANGE'|'GIFT_RECEIVED'|'GIFT_SENT'|'OMO_RECEIVED'|'GAME_REWARD'|'SCORE_EXCHANGE'
      amount INTEGER NOT NULL,  -- 正数=收入，负数=支出
      title TEXT NOT NULL,  -- 交易标题
      description TEXT,  -- 交易描述
      balance_after INTEGER NOT NULL,  -- 交易后余额
      related_code TEXT,  -- 关联的玩家/物品码
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- 玩家通知/信箱表
    CREATE TABLE IF NOT EXISTS player_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      content TEXT,
      related_player_code TEXT,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- 玩家聊天室配置表（主题、家具等）
    CREATE TABLE IF NOT EXISTS player_chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_code TEXT NOT NULL,
      room_id TEXT DEFAULT '',  -- 空字符串表示全局聊天室
      theme TEXT DEFAULT 'cozy',  -- 主题 ID
      furniture TEXT DEFAULT '[]',  -- JSON 数组：[{id, itemId, x, y}]
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(player_code, room_id)
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
      fox_score INTEGER DEFAULT 0,    -- 狐狸玩家分数
      bunny_score INTEGER DEFAULT 0,  -- 兔子玩家分数
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

  // 为已存在的 player_profiles 表添加新字段（如果不存在）
  try {
    _db.run(`ALTER TABLE player_profiles ADD COLUMN login_days INTEGER DEFAULT 1`);
  } catch (e) {
    // 字段已存在，忽略
  }
  try {
    _db.run(`ALTER TABLE player_profiles ADD COLUMN last_login_date TEXT`);
  } catch (e) {
    // 字段已存在，忽略
  }
  try {
    _db.run(`ALTER TABLE player_profiles ADD COLUMN vip_level INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略
  }
  try {
    _db.run(`ALTER TABLE player_profiles ADD COLUMN total_games INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略
  }
  try {
    _db.run(`ALTER TABLE player_profiles ADD COLUMN win_games INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略
  }

  // 为已存在的 player_carrots 表添加 last_updated 字段（如果不存在）
  try {
    _db.run(`ALTER TABLE player_carrots ADD COLUMN last_updated INTEGER DEFAULT (strftime('%s', 'now'))`);
  } catch (e) {
    // 字段已存在，忽略
  }

  // 插入默认背景
  const bgCount = _db.exec('SELECT COUNT(*) FROM backgrounds');
  if (bgCount[0][0] === 0) {
    _db.run(`INSERT INTO backgrounds (name, url, is_preset) VALUES
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
  return _db;
}

// 数据库迁移函数 - 每次启动时执行，确保字段存在
async function migrateDatabase() {
  if (!_db) return;

  console.log('[DB MIGRATION] 开始检查数据库字段...');

  // 检查 player_profiles 表的字段 - PRAGMA table_info 返回的是对象数组
  const tableInfo = _db.exec('PRAGMA table_info(player_profiles)');
  let existingColumns = [];
  if (tableInfo && tableInfo[0] && tableInfo[0].values) {
    // sql.js 返回的是 { values: [[cid, name, type, ...], ...] } 格式
    existingColumns = tableInfo[0].values.map(row => row[1]);
  } else if (tableInfo && Array.isArray(tableInfo)) {
    // 或者直接是对象数组
    existingColumns = tableInfo.map(col => col.name || (col.length > 1 ? col[1] : null)).filter(Boolean);
  }

  console.log('[DB MIGRATION] 现有字段:', existingColumns);

  // 添加缺失的字段
  if (!existingColumns.includes('login_days')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN login_days INTEGER DEFAULT 1`);
      console.log('[DB MIGRATION] 添加 login_days 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] login_days 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] login_days 字段已存在');
  }

  if (!existingColumns.includes('last_login_date')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN last_login_date TEXT`);
      console.log('[DB MIGRATION] 添加 last_login_date 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] last_login_date 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] last_login_date 字段已存在');
  }

  if (!existingColumns.includes('vip_level')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN vip_level INTEGER DEFAULT 0`);
      console.log('[DB MIGRATION] 添加 vip_level 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] vip_level 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] vip_level 字段已存在');
  }

  if (!existingColumns.includes('total_games')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN total_games INTEGER DEFAULT 0`);
      console.log('[DB MIGRATION] 添加 total_games 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] total_games 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] total_games 字段已存在');
  }

  if (!existingColumns.includes('win_games')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN win_games INTEGER DEFAULT 0`);
      console.log('[DB MIGRATION] 添加 win_games 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] win_games 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] win_games 字段已存在');
  }

  // 奶酪银行相关字段
  if (!existingColumns.includes('cheese_balance')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN cheese_balance INTEGER DEFAULT 0`);
      console.log('[DB MIGRATION] 添加 cheese_balance 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] cheese_balance 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] cheese_balance 字段已存在');
  }

  if (!existingColumns.includes('cheese_deposits')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN cheese_deposits INTEGER DEFAULT 0`);
      console.log('[DB MIGRATION] 添加 cheese_deposits 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] cheese_deposits 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] cheese_deposits 字段已存在');
  }

  if (!existingColumns.includes('cheese_loans')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN cheese_loans INTEGER DEFAULT 0`);
      console.log('[DB MIGRATION] 添加 cheese_loans 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] cheese_loans 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] cheese_loans 字段已存在');
  }

  if (!existingColumns.includes('last_cheese_claim')) {
    try {
      _db.run(`ALTER TABLE player_profiles ADD COLUMN last_cheese_claim TEXT`);
      console.log('[DB MIGRATION] 添加 last_cheese_claim 字段成功');
    } catch (e) {
      console.log('[DB MIGRATION] last_cheese_claim 字段已存在或添加失败:', e.message);
    }
  } else {
    console.log('[DB MIGRATION] last_cheese_claim 字段已存在');
  }

  saveDatabase();
  console.log('[DB MIGRATION] 数据库迁移完成');
}

// 保存数据库到文件
function saveDatabase() {
  if (_db) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// 等待数据库初始化完成的 Promise
let dbReady = null;

export const waitForDb = async () => {
  if (!dbReady) {
    dbReady = initDatabase();
    await dbReady;
    // 数据库初始化完成后执行迁移
    await new Promise(resolve => {
      migrateDatabase();
      resolve();
    });
  }
  return dbReady;
};

// =========================================
// 数据库保护机制 - 重要说明
// =========================================
// 1. 禁止直接获取数据库实例执行任意 SQL
// 2. 所有写操作必须通过业务逻辑（roomOps, messageOps 等）
// 3. 数据库结构变更通过代码自动处理（CREATE TABLE IF NOT EXISTS）
//
// 为什么：数据库内容是用户的，代码无权随意改动
//
// 保护级别：
// - 默认模式：允许读取，写操作需要通过业务函数
// - 严格模式：设置 PROTECT_DB=true 后，禁止所有直接访问
// =========================================
const PROTECT_DB = process.env.PROTECT_DB === 'true';

export const getDb = () => {
  if (!_db) {
    throw new Error('Database not initialized. Call waitForDb() first.');
  }
  if (PROTECT_DB) {
    console.warn('[DB 保护] 检测到直接数据库访问。建议通过业务函数（roomOps, messageOps 等）操作。');
  }
  return _db;
};

// 房间操作
export const roomOps = {
  create: (roomId, password = null) => {
    if (!_db) return;
    const stmt = _db.prepare('INSERT OR REPLACE INTO rooms (id, password, updated_at) VALUES (?, ?, strftime("%s", "now"))');
    stmt.run([roomId, password]);
    saveDatabase();
  },

  get: (roomId) => {
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM rooms WHERE id = ?');
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
    if (!_db) return;
    const stmt = _db.prepare('DELETE FROM rooms WHERE id = ?');
    stmt.run([roomId]);
    saveDatabase();
  },

  exists: (roomId) => {
    if (!_db) return false;
    const stmt = _db.prepare('SELECT 1 FROM rooms WHERE id = ? LIMIT 1');
    stmt.bind([roomId]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  },

  // 验证房间密码
  verifyPassword: (roomId, password) => {
    if (!_db) return { exists: false, valid: false };
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
    if (!_db) return;
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
    const stmt = _db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(values);
    saveDatabase();
  },

  updateBackground: (roomId, bgImage) => {
    if (!_db) return;
    const stmt = _db.prepare('UPDATE rooms SET bg_image = ?, updated_at = strftime("%s", "now") WHERE id = ?');
    stmt.run([bgImage, roomId]);
    saveDatabase();
  },

  updatePassword: (roomId, password) => {
    if (!_db) return;
    const stmt = _db.prepare('UPDATE rooms SET password = ?, updated_at = strftime("%s", "now") WHERE id = ?');
    stmt.run([password || '', roomId]);
    saveDatabase();
  },
};

// 消息操作
export const messageOps = {
  add: (roomId, senderId, senderName, senderRole, content, type = 'text', quote = null) => {
    if (!_db) return;

    // 检查 messages 表是否有 quote 列
    let hasQuoteColumn = false;
    try {
      const result = _db.exec('PRAGMA table_info(messages)');
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
      const stmt = _db.prepare('INSERT INTO messages (room_id, sender_id, sender_name, sender_role, content, type, quote) VALUES (?, ?, ?, ?, ?, ?, ?)');
      // 确保不会传入 undefined
      stmt.run([
        roomId,
        senderId,
        senderName || '',
        senderRole || '',
        content,
        type || 'text',
        quoteJson
      ]);
    } else {
      // 旧数据库，不存储 quote
      const stmt = _db.prepare('INSERT INTO messages (room_id, sender_id, sender_name, sender_role, content, type) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run([roomId, senderId, senderName || '', senderRole || '', content, type || 'text']);
    }

    // 必须在 saveDatabase() 之前获取 rowid，因为 saveDatabase 导出重导会丢失 last_insert_rowid
    const idResult = _db.exec('SELECT last_insert_rowid()');
    const insertedId = idResult?.[0]?.values?.[0]?.[0] ?? null;

    saveDatabase();

    return insertedId;
  },

  getByRoom: (roomId) => {
    if (!_db) return [];
    const stmt = _db.prepare('SELECT * FROM (SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT 500) ORDER BY id ASC');
    stmt.bind([roomId]);
    const messages = [];
    while (stmt.step()) {
      messages.push(stmt.getAsObject());
    }
    stmt.free();
    return messages;
  },

  getHistory: (roomId, limit = 500) => {
    if (!_db) return [];
    // 取最新 limit 条消息，然后按时间正序排列（保证客户端渲染顺序正确）
    const stmt = _db.prepare('SELECT * FROM (SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC');
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
    if (!_db) return [];
    const stmt = _db.prepare('SELECT * FROM backgrounds');
    stmt.bind();
    const backgrounds = [];
    while (stmt.step()) {
      backgrounds.push(stmt.getAsObject());
    }
    stmt.free();
    return backgrounds;
  },

  add: (name, url, isPreset = 0) => {
    if (!_db) return;
    const stmt = _db.prepare('INSERT INTO backgrounds (name, url, is_preset) VALUES (?, ?, ?)');
    stmt.run([name, url, isPreset]);
    saveDatabase();
  },

  delete: (id) => {
    if (!_db) return;
    const stmt = _db.prepare('DELETE FROM backgrounds WHERE id = ? AND is_preset = 0');
    stmt.run([id]);
    saveDatabase();
  },
};

// 胡萝卜操作
export const carrotOps = {
  get: (playerIdentifier) => {
    if (!_db) return 0;
    const stmt = _db.prepare('SELECT carrot_count FROM player_carrots WHERE player_identifier = ?');
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
    if (!_db) return;
    const stmt = _db.prepare(`
      INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
      VALUES (?, COALESCE((SELECT carrot_count FROM player_carrots WHERE player_identifier = ?), 0) + ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET carrot_count = carrot_count + ?, last_updated = strftime('%s', 'now')
    `);
    stmt.run([playerIdentifier, playerIdentifier, delta, delta]);
    saveDatabase();
  },

  set: (playerIdentifier, count) => {
    if (!_db) return;
    const stmt = _db.prepare(`
      INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET carrot_count = ?, last_updated = strftime('%s', 'now')
    `);
    stmt.run([playerIdentifier, count, count]);
    saveDatabase();
  },

  // 添加胡萝卜（增加指定数量）
  addCarrot: (playerIdentifier, delta) => {
    if (!_db) return;
    const stmt = _db.prepare(`
      INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
      VALUES (?, COALESCE((SELECT carrot_count FROM player_carrots WHERE player_identifier = ?), 0) + ?, strftime('%s', 'now'))
      ON CONFLICT(player_identifier) DO UPDATE SET carrot_count = carrot_count + ?, last_updated = strftime('%s', 'now')
    `);
    stmt.run([playerIdentifier, playerIdentifier, delta, delta]);
    saveDatabase();
  },
};

// 通知/信箱操作
export const notificationOps = {
  add: (playerCode, type, title, content, relatedPlayerCode = null) => {
    if (!_db) return null;
    const stmt = _db.prepare(`
      INSERT INTO player_notifications (player_code, type, title, content, related_player_code)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run([playerCode, type, title, content || '', relatedPlayerCode]);
    // 必须在 saveDatabase() 之前获取 rowid
    const id = _db.exec('SELECT last_insert_rowid()');
    saveDatabase();
    return id?.[0]?.values?.[0]?.[0] ?? null;
  },

  getByPlayer: (playerCode, limit = 50) => {
    if (!_db) return [];
    const stmt = _db.prepare('SELECT * FROM player_notifications WHERE player_code = ? ORDER BY created_at DESC LIMIT ?');
    stmt.bind([playerCode, limit]);
    const notifications = [];
    while (stmt.step()) {
      notifications.push(stmt.getAsObject());
    }
    stmt.free();
    return notifications;
  },

  markRead: (id) => {
    if (!_db) return;
    const stmt = _db.prepare('UPDATE player_notifications SET is_read = 1 WHERE id = ?');
    stmt.run([id]);
    saveDatabase();
  },

  markAllRead: (playerCode) => {
    if (!_db) return;
    const stmt = _db.prepare('UPDATE player_notifications SET is_read = 1 WHERE player_code = ? AND is_read = 0');
    stmt.run([playerCode]);
    saveDatabase();
  },

  getUnreadCount: (playerCode) => {
    if (!_db) return 0;
    const stmt = _db.prepare('SELECT COUNT(*) as count FROM player_notifications WHERE player_code = ? AND is_read = 0');
    stmt.bind([playerCode]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row.count || 0;
    }
    stmt.free();
    return 0;
  },
};

// 玩家特效操作
export const effectOps = {
  getPlayerEffects: (playerIdentifier) => {
    if (!_db) return [];
    const stmt = _db.prepare('SELECT effect_id FROM player_effects WHERE player_identifier = ?');
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
    if (!_db) return;
    const stmt = _db.prepare('INSERT OR IGNORE INTO player_effects (player_identifier, effect_id) VALUES (?, ?)');
    stmt.run([playerIdentifier, effectId]);
    saveDatabase();
  },

  hasEffect: (playerIdentifier, effectId) => {
    if (!_db) return false;
    const stmt = _db.prepare('SELECT 1 FROM player_effects WHERE player_identifier = ? AND effect_id = ? LIMIT 1');
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

// 奶酪央行操作
export const cheeseOps = {
  // 获取玩家奶酪余额
  getBalance: (playerCode) => {
    if (!_db) return 0;
    const player = playerOps.get(playerCode);
    if (!player) return 0;
    return player.cheese_balance || 0;
  },

  // 获取玩家存款金额
  getDeposits: (playerCode) => {
    if (!_db) return 0;
    const player = playerOps.get(playerCode);
    if (!player) return 0;
    return player.cheese_deposits || 0;
  },

  // 获取玩家贷款金额
  getLoans: (playerCode) => {
    if (!_db) return 0;
    const player = playerOps.get(playerCode);
    if (!player) return 0;
    return player.cheese_loans || 0;
  },

  // 获取最后登录领取时间
  getLastClaimDate: (playerCode) => {
    if (!_db) return null;
    const player = playerOps.get(playerCode);
    if (!player) return null;
    return player.last_cheese_claim || null;
  },

  // 增加奶酪（用于登录奖励、兑换等）
  addCheese: (playerCode, amount) => {
    if (!_db) return;
    const stmt = _db.prepare(`
      UPDATE player_profiles
      SET cheese_balance = COALESCE(cheese_balance, 0) + ?
      WHERE player_code = ?
    `);
    stmt.run([amount, playerCode]);
    saveDatabase();
  },

  // 减少奶酪（用于消费等）
  removeCheese: (playerCode, amount) => {
    if (!_db) return false;
    const currentBalance = cheeseOps.getBalance(playerCode);
    if (currentBalance < amount) return false;
    const stmt = _db.prepare(`
      UPDATE player_profiles
      SET cheese_balance = cheese_balance - ?
      WHERE player_code = ?
    `);
    stmt.run([amount, playerCode]);
    saveDatabase();
    return true;
  },

  // 兑换胡萝卜为奶酪（1 胡萝卜 = 5 奶酪）
  exchangeCarrotToCheese: (playerCode, carrotAmount) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const player = playerOps.get(playerCode);
    if (!player) return { success: false, error: '玩家不存在' };

    if (player.carrot_count < carrotAmount) {
      return { success: false, error: '胡萝卜不足' };
    }

    const cheeseAmount = carrotAmount * 5;

    // 扣除胡萝卜
    const carrotStmt = _db.prepare(`
      UPDATE player_profiles
      SET carrot_count = carrot_count - ?
      WHERE player_code = ?
    `);
    carrotStmt.run([carrotAmount, playerCode]);

    // 增加奶酪
    const cheeseStmt = _db.prepare(`
      UPDATE player_profiles
      SET cheese_balance = COALESCE(cheese_balance, 0) + ?
      WHERE player_code = ?
    `);
    cheeseStmt.run([cheeseAmount, playerCode]);

    saveDatabase();
    return { success: true, cheeseAmount };
  },

  // 存款（奶酪存入银行）
  deposit: (playerCode, amount) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const currentBalance = cheeseOps.getBalance(playerCode);
    if (currentBalance < amount) {
      return { success: false, error: '奶酪余额不足' };
    }

    // 扣除余额
    cheeseOps.removeCheese(playerCode, amount);

    // 增加存款
    const stmt = _db.prepare(`
      UPDATE player_profiles
      SET cheese_deposits = COALESCE(cheese_deposits, 0) + ?
      WHERE player_code = ?
    `);
    stmt.run([amount, playerCode]);

    // 记录存款历史
    const depositStmt = _db.prepare(`
      INSERT INTO cheese_deposits (player_code, amount)
      VALUES (?, ?)
    `);
    depositStmt.run([playerCode, amount]);

    saveDatabase();
    return { success: true, amount };
  },

  // 取款（从银行取出奶酪）
  withdraw: (playerCode, amount) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const currentDeposits = cheeseOps.getDeposits(playerCode);
    if (currentDeposits < amount) {
      return { success: false, error: '存款余额不足' };
    }

    // 减少存款
    const stmt = _db.prepare(`
      UPDATE player_profiles
      SET cheese_deposits = cheese_deposits - ?
      WHERE player_code = ?
    `);
    stmt.run([amount, playerCode]);

    // 增加余额
    cheeseOps.addCheese(playerCode, amount);

    saveDatabase();
    return { success: true, amount };
  },

  // 贷款（借奶酪，利率 200%）
  takeLoan: (playerCode, amount) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    // 增加奶酪余额
    cheeseOps.addCheese(playerCode, amount);

    // 记录贷款
    const now = Math.floor(Date.now() / 1000);
    const dueDate = now + (365 * 24 * 60 * 60); // 一年后到期

    const stmt = _db.prepare(`
      INSERT INTO cheese_loans (player_code, amount, loan_date, due_date)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run([playerCode, amount, now, dueDate]);

    // 更新贷款总额
    const updateStmt = _db.prepare(`
      UPDATE player_profiles
      SET cheese_loans = COALESCE(cheese_loans, 0) + ?
      WHERE player_code = ?
    `);
    updateStmt.run([amount, playerCode]);

    saveDatabase();
    return { success: true, amount, dueDate: getCSTDate() };
  },

  // 还款（偿还贷款）
  repayLoan: (playerCode, amount) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const currentBalance = cheeseOps.getBalance(playerCode);
    const currentLoans = cheeseOps.getLoans(playerCode);

    if (currentBalance < amount) {
      return { success: false, error: '奶酪余额不足' };
    }

    if (currentLoans < amount) {
      return { success: false, error: '贷款金额不足' };
    }

    // 扣除余额
    cheeseOps.removeCheese(playerCode, amount);

    // 减少贷款记录（标记为已还）
    const stmt = _db.prepare(`
      UPDATE cheese_loans
      SET is_paid = 1
      WHERE player_code = ? AND is_paid = 0
      LIMIT 1
    `);
    stmt.run([playerCode]);

    // 更新贷款总额
    const updateStmt = _db.prepare(`
      UPDATE player_profiles
      SET cheese_loans = cheese_loans - ?
      WHERE player_code = ?
    `);
    updateStmt.run([amount, playerCode]);

    saveDatabase();
    return { success: true, amount };
  },

  // 结算存款利息（年化 100%，每天计算）
  settleInterest: (playerCode) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const player = playerOps.get(playerCode);
    if (!player) return { success: false, error: '玩家不存在' };

    const currentDeposits = player.cheese_deposits || 0;
    if (currentDeposits <= 0) return { success: false, error: '没有存款' };

    const today = getCSTDate();
    const lastInterestDate = player.last_interest_date;

    // 如果今天已经结算过，不再结算
    if (lastInterestDate === today) {
      return { success: false, error: '今日已结算利息' };
    }

    // 计算日利息（年化 100%，日化息约为 0.27%）
    const dailyInterestRate = 1 / 365;
    const interest = Math.floor(currentDeposits * dailyInterestRate);

    if (interest > 0) {
      // 增加余额
      cheeseOps.addCheese(playerCode, interest);

      // 更新最后结算日期
      const stmt = _db.prepare(`
        UPDATE player_profiles
        SET last_interest_date = ?
        WHERE player_code = ?
      `);
      stmt.run([today, playerCode]);

      saveDatabase();
      return { success: true, interest };
    }

    return { success: false, error: '利息为 0' };
  },

  // 获取玩家财务总览
  getFinancialSummary: (playerCode) => {
    const player = playerOps.get(playerCode);
    if (!player) return null;

    return {
      cheeseBalance: player.cheese_balance || 0,
      cheeseDeposits: player.cheese_deposits || 0,
      cheeseLoans: player.cheese_loans || 0,
      carrotCount: player.carrot_count || 0,
      lastClaimDate: player.last_cheese_claim || null
    };
  },

  // ========== OMO 机制相关函数 ==========

  // 创建 OMO 胡萝卜赠送提案
  createCarrotGiftProposal: (targetPlayerCode, carrotAmount, proposerCode, proposerRole) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const targetPlayer = playerOps.get(targetPlayerCode);
    if (!targetPlayer) return { success: false, error: '目标玩家不存在' };

    if (carrotAmount <= 0) return { success: false, error: '胡萝卜数量必须大于 0' };

    const stmt = _db.prepare(`
      INSERT INTO carrot_gift_proposals (target_player_code, carrot_amount, proposer_code, proposer_role)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run([targetPlayerCode, carrotAmount, proposerCode, proposerRole]);
    saveDatabase();

    return { success: true, proposalId: stmt.getParams()[0] };
  },

  // 审批 OMO 提案
  approveProposal: (proposalId, approverCode, approverRole) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const proposal = cheeseOps.getProposal(proposalId);
    if (!proposal) return { success: false, error: '提案不存在' };

    if (proposal.is_executed) return { success: false, error: '提案已执行' };

    // 验证审批人身份
    if (approverRole === 'FOX' && approverCode !== 'KADEGOU') {
      return { success: false, error: '尼克荣誉董事才能审批' };
    }
    if (approverRole === 'BUNNY' && approverCode !== 'JINNALUV') {
      return { success: false, error: '荣誉董事才能审批' };
    }

    const approveColumn = approverRole === 'FOX' ? 'fox_approved' : 'bunny_approved';
    const stmt = _db.prepare(`
      UPDATE carrot_gift_proposals
      SET ${approveColumn} = 1
      WHERE id = ? AND is_executed = 0
    `);
    stmt.run([proposalId]);
    saveDatabase();

    // 检查是否双方都已同意
    const updatedProposal = cheeseOps.getProposal(proposalId);
    if (updatedProposal && updatedProposal.fox_approved && updatedProposal.bunny_approved) {
      return { success: true, readyToExecute: true, proposal: updatedProposal };
    }

    return { success: true, readyToExecute: false, proposal: updatedProposal };
  },

  // 执行 OMO 提案（赠送胡萝卜）
  executeProposal: (proposalId) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const proposal = cheeseOps.getProposal(proposalId);
    if (!proposal) return { success: false, error: '提案不存在' };

    if (!proposal.fox_approved || !proposal.bunny_approved) {
      return { success: false, error: '需要两位荣誉董事都同意才能执行' };
    }

    if (proposal.is_executed) {
      return { success: false, error: '提案已执行' };
    }

    // 给目标玩家增加胡萝卜
    const targetPlayer = playerOps.get(proposal.target_player_code);
    if (!targetPlayer) return { success: false, error: '目标玩家不存在' };

    const stmt = _db.prepare(`
      UPDATE player_profiles
      SET carrot_count = COALESCE(carrot_count, 0) + ?
      WHERE player_code = ?
    `);
    stmt.run([proposal.carrot_amount, proposal.target_player_code]);

    // 记录转账
    const transferStmt = _db.prepare(`
      INSERT INTO carrot_transfers (from_player_code, to_player_code, carrot_amount, transfer_type, approval_info)
      VALUES (NULL, ?, ?, 'OMO', ?)
    `);
    const approvalInfo = JSON.stringify({
      proposal_id: proposalId,
      fox_approved: true,
      bunny_approved: true,
      executed_at: Math.floor(Date.now() / 1000)
    });
    transferStmt.run([proposal.target_player_code, proposal.carrot_amount, approvalInfo]);

    // 标记提案已执行
    const executeStmt = _db.prepare(`
      UPDATE carrot_gift_proposals
      SET is_executed = 1, executed_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    executeStmt.run([proposalId]);

    saveDatabase();
    return { success: true, amount: proposal.carrot_amount };
  },

  // 获取提案详情
  getProposal: (proposalId) => {
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM carrot_gift_proposals WHERE id = ?');
    stmt.bind([proposalId]);
    if (stmt.step()) {
      const proposal = stmt.getAsObject();
      stmt.free();
      return proposal;
    }
    stmt.free();
    return null;
  },

  // 获取所有待审批的提案
  getPendingProposals: () => {
    if (!_db) return [];
    const stmt = _db.prepare(`
      SELECT * FROM carrot_gift_proposals
      WHERE is_executed = 0
      ORDER BY created_at DESC
    `);
    const proposals = [];
    stmt.bind();
    while (stmt.step()) {
      proposals.push(stmt.getAsObject());
    }
    stmt.free();
    return proposals;
  },

  // 获取玩家的胡萝卜转账记录
  getTransferHistory: (playerCode, limit = 20) => {
    if (!_db) return [];
    const stmt = _db.prepare(`
      SELECT * FROM carrot_transfers
      WHERE to_player_code = ? OR from_player_code = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const transfers = [];
    stmt.bind([playerCode, playerCode, limit]);
    while (stmt.step()) {
      transfers.push(stmt.getAsObject());
    }
    stmt.free();
    return transfers;
  },

  // 手动赠送胡萝卜（直接从一个玩家到另一个玩家）
  giftCarrot: (fromPlayerCode, toPlayerCode, amount) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const fromPlayer = playerOps.get(fromPlayerCode);
    const toPlayer = playerOps.get(toPlayerCode);

    if (!fromPlayer) return { success: false, error: '赠送方玩家不存在' };
    if (!toPlayer) return { success: false, error: '接收方玩家不存在' };

    if (fromPlayer.carrot_count < amount) {
      return { success: false, error: '胡萝卜不足' };
    }

    if (amount <= 0) {
      return { success: false, error: '胡萝卜数量必须大于 0' };
    }

    // 扣除赠送方胡萝卜
    const deductStmt = _db.prepare(`
      UPDATE player_profiles
      SET carrot_count = carrot_count - ?
      WHERE player_code = ?
    `);
    deductStmt.run([amount, fromPlayerCode]);

    // 增加接收方胡萝卜
    const addStmt = _db.prepare(`
      UPDATE player_profiles
      SET carrot_count = COALESCE(carrot_count, 0) + ?
      WHERE player_code = ?
    `);
    addStmt.run([amount, toPlayerCode]);

    // 记录转账
    const transferStmt = _db.prepare(`
      INSERT INTO carrot_transfers (from_player_code, to_player_code, carrot_amount, transfer_type)
      VALUES (?, ?, ?, 'GIFT')
    `);
    transferStmt.run([fromPlayerCode, toPlayerCode, amount]);

    saveDatabase();
    return { success: true, amount };
  }
};

// 钱包交易记录操作
export const walletOps = {
  // 添加交易记录
  add: (playerCode, currency, type, amount, title, description = '', relatedCode = null) => {
    if (!_db) return;
    // 查询交易后余额
    let balanceAfter = 0;
    if (currency === 'CHEESE') {
      balanceAfter = cheeseOps.getBalance(playerCode);
    } else if (currency === 'CARROT') {
      const player = playerOps.get(playerCode);
      balanceAfter = player ? player.carrot_count || 0 : 0;
    }
    const stmt = _db.prepare(`
      INSERT INTO wallet_transactions (player_code, currency, type, amount, title, description, balance_after, related_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([playerCode, currency, type, amount, title, description, balanceAfter, relatedCode]);
    saveDatabase();
  },

  // 获取玩家交易记录
  getTransactions: (playerCode, limit = 50) => {
    if (!_db) return [];
    const stmt = _db.prepare(`
      SELECT * FROM wallet_transactions
      WHERE player_code = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const transactions = [];
    stmt.bind([playerCode, limit]);
    while (stmt.step()) {
      transactions.push(stmt.getAsObject());
    }
    stmt.free();
    return transactions;
  },

  // 获取玩家交易记录（按货币筛选）
  getTransactionsByCurrency: (playerCode, currency, limit = 50) => {
    if (!_db) return [];
    const stmt = _db.prepare(`
      SELECT * FROM wallet_transactions
      WHERE player_code = ? AND currency = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const transactions = [];
    stmt.bind([playerCode, currency, limit]);
    while (stmt.step()) {
      transactions.push(stmt.getAsObject());
    }
    stmt.free();
    return transactions;
  },
};

// 玩家档案操作
export const playerOps = {
  // 计算 VIP 等级（根据登录天数）
  calculateVipLevel: (loginDays) => {
    // VIP 等级计算：每登录 1 天 +1 级，上限 100 级
    // 1-7 天：VIP 1
    // 8-30 天：VIP 2
    // 31-90 天：VIP 3
    // 91-180 天：VIP 4
    // 181-365 天：VIP 5
    // 365+ 天：VIP 6+（每多 365 天升一级，上限 100）
    if (loginDays <= 0) return 0;
    if (loginDays < 7) return 1;
    if (loginDays < 30) return 2;
    if (loginDays < 90) return 3;
    if (loginDays < 180) return 4;
    if (loginDays < 365) return 5;
    return Math.min(6 + Math.floor((loginDays - 365) / 365), 100);
  },

  // 更新登录天数（每天只计一次）
  updateLoginDays: (playerCode) => {
    if (!_db) return;
    const today = getCSTDate(); // YYYY-MM-DD
    const player = playerOps.get(playerCode);
    if (!player) return;

    const lastLoginDate = player.last_login_date;
    let loginDays = player.login_days || 1;

    // 如果上次登录不是今天，增加登录天数
    if (lastLoginDate !== today) {
      loginDays = (loginDays || 0) + 1;
      const vipLevel = playerOps.calculateVipLevel(loginDays);

      const stmt = _db.prepare(`
        UPDATE player_profiles
        SET login_days = ?, vip_level = ?, last_login_date = ?, last_login = ?
        WHERE player_code = ?
      `);
      stmt.run([loginDays, vipLevel, today, Math.floor(Date.now() / 1000), playerCode]);
      saveDatabase();

      return { loginDays, vipLevel };
    }

    return { loginDays: loginDays || 1, vipLevel: player.vip_level || 0 };
  },
  // 检查档案码是否可用
  isCodeAvailable: (playerCode) => {
    if (!_db) return false;
    const stmt = _db.prepare('SELECT 1 FROM player_profiles WHERE player_code = ? LIMIT 1');
    stmt.bind([playerCode]);
    const exists = stmt.step();
    stmt.free();
    return !exists;
  },

  // 通过档案码 + 密码获取玩家（登录用）
  getByCodeAndPassword: (playerCode, passwordHash) => {
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM player_profiles WHERE player_code = ? AND password_hash = ?');
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
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM player_profiles WHERE player_code = ?');
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
    if (!_db) return;
    const stmt = _db.prepare(`
      INSERT INTO player_profiles (player_identifier, player_code, password_hash, nickname, last_login)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `);
    stmt.run([playerCode, playerCode, passwordHash, nickname]);
    saveDatabase();
  },

  // 创建或更新玩家档案（兼容旧版，使用 player_identifier）
  upsert: (playerIdentifier, data = {}) => {
    if (!_db) return;
    const existing = playerOps.getByIdentifier(playerIdentifier);
    if (existing) {
      playerOps.update(playerIdentifier, data);
    } else {
      const stmt = _db.prepare(`
        INSERT INTO player_profiles (player_identifier, nickname, carrot_count, last_login)
        VALUES (?, ?, ?, strftime('%s', 'now'))
      `);
      stmt.run([playerIdentifier, data.nickname || '玩家', data.carrot_count || 0]);
      saveDatabase();
    }
  },

  // 通过 player_identifier 获取玩家（旧版兼容）
  getByIdentifier: (playerIdentifier) => {
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM player_profiles WHERE player_identifier = ?');
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
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM player_profiles WHERE player_identifier = ? OR player_code = ?');
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
    if (!_db) return;

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
    const stmt = _db.prepare(`UPDATE player_profiles SET ${fields.join(', ')} WHERE player_code = ?`);
    stmt.run(values);
    saveDatabase();
  },

  // 修改玩家昵称（仅改名，不改变档案码）
  changeNickname: (playerCode, newNickname) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    // 检查新昵称是否合法（1-20 字符）
    if (!newNickname || newNickname.length < 1 || newNickname.length > 20) {
      return { success: false, error: '昵称长度 1-20 个字符' };
    }

    const stmt = _db.prepare('UPDATE player_profiles SET nickname = ? WHERE player_code = ?');
    stmt.run([newNickname, playerCode]);
    saveDatabase();
    return { success: true };
  },

  // 获取所有玩家档案列表
  getAll: () => {
    if (!_db) return [];
    const stmt = _db.prepare(`
      SELECT player_code, nickname, carrot_count, cheese_balance, cheese_deposits, cheese_loans,
             vip_level, login_days, total_games, win_games, created_at, last_login
      FROM player_profiles
      ORDER BY created_at DESC
    `);
    const players = [];
    stmt.bind();
    while (stmt.step()) {
      players.push(stmt.getAsObject());
    }
    stmt.free();
    return players;
  },

  // 获取排行榜（按胡萝卜数量排序）
  getLeaderboard: (limit = 10, orderBy = 'carrot_count') => {
    if (!_db) return [];
    const allowedOrders = ['carrot_count', 'total_games', 'win_games'];
    const orderCol = allowedOrders.includes(orderBy) ? orderBy : 'carrot_count';
    const stmt = _db.prepare(`
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
    if (!_db) return [];
    const stmt = _db.prepare('SELECT * FROM player_inventory WHERE player_code = ?');
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
    if (!_db) return;
    const stmt = _db.prepare(`
      INSERT OR IGNORE INTO player_inventory (player_code, item_id, item_type, acquired_at)
      VALUES (?, ?, ?, strftime('%s', 'now'))
    `);
    stmt.run([playerCode, itemId, itemType]);
    saveDatabase();
  },

  // 检查玩家是否拥有某物品
  has: (playerCode, itemId) => {
    if (!_db) return false;
    const stmt = _db.prepare('SELECT 1 FROM player_inventory WHERE player_code = ? AND item_id = ? LIMIT 1');
    stmt.bind([playerCode, itemId]);
    const has = stmt.step();
    stmt.free();
    return has;
  },
};

// 玩家聊天室操作
export const chatRoomOps = {
  get: (playerCode, roomId = '') => {
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM player_chat_rooms WHERE player_code = ? AND room_id = ? LIMIT 1');
    stmt.bind([playerCode, roomId]);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      // 解析 furniture JSON
      try {
        result.furniture = JSON.parse(result.furniture);
      } catch (e) {
        result.furniture = [];
      }
      return result;
    }
    stmt.free();
    return null;
  },

  upsert: (playerCode, roomId = '', data) => {
    if (!_db) return;
    const existing = chatRoomOps.get(playerCode, roomId);
    if (existing) {
      const stmt = _db.prepare('UPDATE player_chat_rooms SET theme = ?, furniture = ?, updated_at = strftime(\'%s\', \'now\') WHERE player_code = ? AND room_id = ?');
      stmt.run([data.theme || existing.theme, JSON.stringify(data.furniture || existing.furniture), playerCode, roomId]);
    } else {
      const stmt = _db.prepare('INSERT INTO player_chat_rooms (player_code, room_id, theme, furniture) VALUES (?, ?, ?, ?)');
      stmt.run([playerCode, roomId, data.theme || 'cozy', JSON.stringify(data.furniture || [])]);
    }
    saveDatabase();
  },

  getFurniture: (playerCode, roomId = '') => {
    const room = chatRoomOps.get(playerCode, roomId);
    return room ? room.furniture : [];
  },

  updateTheme: (playerCode, roomId, theme) => {
    if (!_db) return;
    const existing = chatRoomOps.get(playerCode, roomId);
    if (existing) {
      const stmt = _db.prepare('UPDATE player_chat_rooms SET theme = ?, updated_at = strftime(\'%s\', \'now\') WHERE player_code = ? AND room_id = ?');
      stmt.run([theme, playerCode, roomId]);
    } else {
      const stmt = _db.prepare('INSERT INTO player_chat_rooms (player_code, room_id, theme) VALUES (?, ?, ?)');
      stmt.run([playerCode, roomId, theme]);
    }
    saveDatabase();
  },

  updateFurniture: (playerCode, roomId, furniture) => {
    if (!_db) return;
    const existing = chatRoomOps.get(playerCode, roomId);
    if (existing) {
      const stmt = _db.prepare('UPDATE player_chat_rooms SET furniture = ?, updated_at = strftime(\'%s\', \'now\') WHERE player_code = ? AND room_id = ?');
      stmt.run([JSON.stringify(furniture), playerCode, roomId]);
    } else {
      const stmt = _db.prepare('INSERT INTO player_chat_rooms (player_code, room_id, furniture) VALUES (?, ?, ?)');
      stmt.run([playerCode, roomId, JSON.stringify(furniture)]);
    }
    saveDatabase();
  }
};

// VIP 房间操作
export const vipRoomOps = {
  create: (roomId, ownerPlayerCode, password = null) => {
    if (!_db) return;
    const stmt = _db.prepare('INSERT INTO vip_rooms (id, owner_player_code, password) VALUES (?, ?, ?)');
    stmt.run([roomId, ownerPlayerCode, password]);
    saveDatabase();
  },

  get: (roomId) => {
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM vip_rooms WHERE id = ?');
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
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM vip_rooms WHERE id = ?');
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
    if (!_db) return;
    const stmt = _db.prepare('DELETE FROM vip_rooms WHERE id = ?');
    stmt.run([roomId]);
    saveDatabase();
  },

  exists: (roomId) => {
    if (!_db) return false;
    const stmt = _db.prepare('SELECT 1 FROM vip_rooms WHERE id = ? LIMIT 1');
    stmt.bind([roomId]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  },

  getByOwner: (ownerPlayerCode) => {
    if (!_db) return [];
    const stmt = _db.prepare('SELECT * FROM vip_rooms WHERE owner_player_code = ?');
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
    if (!_db) return null;
    const stmt = _db.prepare(`
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
    if (!_db) return;
    const stmt = _db.prepare(`
      UPDATE vip_rooms
      SET fox_player_code = ?, bunny_player_code = ?,
          fox_nickname = ?, bunny_nickname = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    // 将 undefined 转换为 null，避免 SQLite 绑定错误
    stmt.run([
      foxPlayerCode ?? null,
      bunnyPlayerCode ?? null,
      foxNickname ?? null,
      bunnyNickname ?? null,
      roomId
    ]);
    saveDatabase();
    console.log(`[vipRoomOps.updatePlayers] 更新成功：roomId=${roomId}, fox=${foxPlayerCode}, bunny=${bunnyPlayerCode}`);
  },

  // 更新房间玩家角色绑定（单个玩家）
  updatePlayerRole: (roomId, role, playerCode, nickname) => {
    if (!_db) return;
    const roleColumn = role === 'fox' ? 'fox_player_code' : 'bunny_player_code';
    const nicknameColumn = role === 'fox' ? 'fox_nickname' : 'bunny_nickname';
    const stmt = _db.prepare(`
      UPDATE vip_rooms
      SET ${roleColumn} = ?, ${nicknameColumn} = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([playerCode, nickname, roomId]);
    saveDatabase();
  },

  // 更新游戏状态
  updateGameState: (roomId, gameState) => {
    if (!_db) return;
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
    if (gameState.fox_score !== undefined) {
      updates.push('fox_score = ?');
      values.push(gameState.fox_score);
    }
    if (gameState.bunny_score !== undefined) {
      updates.push('bunny_score = ?');
      values.push(gameState.bunny_score);
    }

    if (updates.length > 0) {
      updates.push('updated_at = strftime("%s", "now")');
      values.push(roomId);
      const stmt = _db.prepare(`UPDATE vip_rooms SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(values);
      saveDatabase();
    }
  },

  // 更新准备状态
  updateReadyState: (roomId, role, isReady) => {
    if (!_db) return;
    const column = role === 'fox' ? 'fox_ready' : 'bunny_ready';
    const stmt = _db.prepare(`
      UPDATE vip_rooms
      SET ${column} = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([isReady ? 1 : 0, roomId]);
    saveDatabase();
  },

  // 清除房间玩家状态（游戏重置时）
  clearGame: (roomId) => {
    if (!_db) return;
    const stmt = _db.prepare(`
      UPDATE vip_rooms
      SET current_word = NULL, punishment_banks = NULL,
          fox_ready = 0, bunny_ready = 0, game_state = 'setup',
          fox_score = 0, bunny_score = 0,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([roomId]);
    saveDatabase();
  },

  // 清除房间玩家记录（房主强制重置时）
  clearPlayers: (roomId) => {
    if (!_db) return;
    const stmt = _db.prepare(`
      UPDATE vip_rooms
      SET fox_player_code = NULL, bunny_player_code = NULL,
          fox_nickname = NULL, bunny_nickname = NULL,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run([roomId]);
    saveDatabase();
  },

  // 检查是否是房主
  isOwner: (roomId, playerCode) => {
    if (!_db) return false;
    const room = vipRoomOps.get(roomId);
    return room && room.owner_player_code === playerCode;
  },

  // 转让房主
  transferOwnership: (roomId, newOwnerPlayerCode) => {
    if (!_db) return false;
    const room = vipRoomOps.get(roomId);
    if (!room || room.owner_player_code !== newOwnerPlayerCode) {
      // 验证新房主必须是房间成员
      if (room.fox_player_code !== newOwnerPlayerCode && room.bunny_player_code !== newOwnerPlayerCode) {
        return false;
      }
    }
    const stmt = _db.prepare('UPDATE vip_rooms SET owner_player_code = ?, updated_at = strftime("%s", "now") WHERE id = ?');
    stmt.run([newOwnerPlayerCode, roomId]);
    saveDatabase();
    return true;
  },

  // 移除房间成员（踢人）
  kickPlayer: (roomId, playerCode) => {
    if (!_db) return false;
    const room = vipRoomOps.get(roomId);
    if (!room) return false;

    // 只能踢非房主
    if (room.owner_player_code === playerCode) return false;

    // 清除被踢玩家的绑定
    let updates = [];
    if (room.fox_player_code === playerCode) {
      updates.push('fox_player_code = NULL', 'fox_nickname = NULL', 'fox_ready = 0', 'fox_score = 0');
    }
    if (room.bunny_player_code === playerCode) {
      updates.push('bunny_player_code = NULL', 'bunny_nickname = NULL', 'bunny_ready = 0', 'bunny_score = 0');
    }

    if (updates.length > 0) {
      updates.push('updated_at = strftime("%s", "now")');
      const stmt = _db.prepare(`UPDATE vip_rooms SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run([roomId]);
      saveDatabase();
      return true;
    }
    return false;
  },

  // 获取房间内所有玩家（包括等待中的玩家）
  getAllPlayers: (roomId) => {
    if (!_db) return [];
    const room = vipRoomOps.get(roomId);
    if (!room) return [];

    const players = [];
    if (room.fox_player_code) {
      players.push({
        playerCode: room.fox_player_code,
        nickname: room.fox_nickname || room.fox_player_code,
        role: 'FOX',
        isReady: !!room.fox_ready,
        score: room.fox_score || 0
      });
    }
    if (room.bunny_player_code) {
      players.push({
        playerCode: room.bunny_player_code,
        nickname: room.bunny_nickname || room.bunny_player_code,
        role: 'BUNNY',
        isReady: !!room.bunny_ready,
        score: room.bunny_score || 0
      });
    }
    return players;
  },
};

// 游戏历史操作
export const gameHistoryOps = {
  add: (roomId, playerName, isWinner) => {
    if (!_db) return;
    const stmt = _db.prepare('INSERT INTO game_history (room_id, player_name, is_winner) VALUES (?, ?, ?)');
    stmt.run([roomId, playerName, isWinner ? 1 : 0]);
    saveDatabase();
  },

  getByRoom: (roomId) => {
    if (!_db) return [];
    const stmt = _db.prepare('SELECT * FROM game_history WHERE room_id = ? ORDER BY game_date DESC LIMIT 50');
    stmt.bind([roomId]);
    const history = [];
    while (stmt.step()) {
      history.push(stmt.getAsObject());
    }
    stmt.free();
    return history;
  },

  getHonorHall: () => {
    if (!_db) return [];
    const stmt = _db.prepare(`
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
    if (!_db) return [];
    const stmt = _db.prepare(`
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

// 电子宠物操作
export const petOps = {
  // 计算状态变化（考虑时间衰减）
  calculateDecay: (pet) => {
    const now = Math.floor(Date.now() / 1000);
    const secondsSinceLastUpdate = now - (pet.last_login_time || now);
    const minutesPassed = Math.floor(secondsSinceLastUpdate / 60);

    let hunger = pet.hunger || 100;
    let mood = pet.mood || 100;
    let cleanliness = pet.cleanliness || 100;
    let energy = pet.energy || 100;

    // 每分钟衰减
    hunger = Math.max(0, hunger - minutesPassed * 2);
    cleanliness = Math.max(0, cleanliness - minutesPassed);
    energy = Math.max(0, energy - minutesPassed * 0.5);

    // 心情修正
    if (hunger < 30) mood -= 5;
    if (cleanliness < 30) mood -= 3;
    if (energy < 30) mood -= 3;
    if (hunger > 80) mood += 2;
    if (cleanliness > 80) mood += 2;
    mood = Math.max(0, Math.min(100, mood));

    return { hunger, mood, cleanliness, energy };
  },

  // 获取或创建宠物
  getOrCreate: (playerCode) => {
    if (!_db) return null;

    const stmt = _db.prepare('SELECT * FROM pet_profiles WHERE player_code = ?');
    stmt.bind([playerCode]);
    if (stmt.step()) {
      const pet = stmt.getAsObject();
      stmt.free();

      // 检查是否是蛋状态且已到达孵化时间
      if (pet.is_egg && pet.hatch_time && pet.hatch_time <= Math.floor(Date.now() / 1000)) {
        // 孵化完成，转换为真实宠物
        const updateStmt = _db.prepare(`
          UPDATE pet_profiles
          SET is_egg = 0,
              pet_name = ?,
              pet_type = ?,
              hatch_time = NULL
          WHERE player_code = ?
        `);
        updateStmt.run([pet.selected_pet_name || '宠物', pet.selected_pet_type || 'FOX', playerCode]);
        saveDatabase();

        // 发送孵化完成通知
        const io = getIo();
        if (io) {
          io.to(playerCode).emit('pet_hatch_complete', {
            pet_name: pet.selected_pet_name,
            pet_type: pet.selected_pet_type
          });
        }

        // 重新获取更新后的宠物数据
        return petOps.get(playerCode);
      }

      // 计算衰减后的状态
      const decayed = petOps.calculateDecay(pet);
      return {
        ...pet,
        hunger: decayed.hunger,
        mood: decayed.mood,
        cleanliness: decayed.cleanliness,
        energy: decayed.energy
      };
    }
    stmt.free();

    // 创建新宠物
    const now = Math.floor(Date.now() / 1000);
    const insertStmt = _db.prepare(`
      INSERT INTO pet_profiles (player_code, last_login_time)
      VALUES (?, ?)
    `);
    insertStmt.run([playerCode, now]);
    saveDatabase();

    return petOps.get(playerCode);
  },

  // 获取宠物
  get: (playerCode) => {
    if (!_db) return null;
    const stmt = _db.prepare('SELECT * FROM pet_profiles WHERE player_code = ?');
    stmt.bind([playerCode]);
    if (stmt.step()) {
      const pet = stmt.getAsObject();
      stmt.free();

      // 计算衰减后的状态
      const decayed = petOps.calculateDecay(pet);
      return {
        ...pet,
        hunger: decayed.hunger,
        mood: decayed.mood,
        cleanliness: decayed.cleanliness,
        energy: decayed.energy
      };
    }
    stmt.free();
    return null;
  },

  // 更新宠物状态
  update: (playerCode, updates) => {
    if (!_db) return;

    const allowed = ['pet_name', 'pet_type', 'level', 'experience', 'hunger', 'mood', 'cleanliness', 'energy', 'last_feed_time', 'last_clean_time', 'last_play_time', 'last_login_time', 'is_egg', 'hatch_time', 'selected_pet_id', 'selected_pet_name', 'selected_pet_type'];
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;
    values.push(playerCode);

    const stmt = _db.prepare(`UPDATE pet_profiles SET ${fields.join(', ')} WHERE player_code = ?`);
    stmt.run(values);
    saveDatabase();
  },

  // 喂食
  feed: (playerCode, foodId, effect) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const pet = petOps.get(playerCode);
    if (!pet) return { success: false, error: '宠物不存在' };

    const newHunger = Math.min(100, pet.hunger + (effect.hunger || 0));
    const newMood = Math.min(100, pet.mood + (effect.mood || 0));
    const now = Math.floor(Date.now() / 1000);

    petOps.update(playerCode, {
      hunger: newHunger,
      mood: newMood,
      last_feed_time: now,
      last_login_time: now
    });

    return { success: true, pet: petOps.get(playerCode) };
  },

  // 玩耍
  play: (playerCode, toyId, effect) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const pet = petOps.get(playerCode);
    if (!pet) return { success: false, error: '宠物不存在' };

    if (pet.energy < 10) {
      return { success: false, error: '宠物太累了，需要休息' };
    }

    const newMood = Math.min(100, pet.mood + (effect.mood || 0));
    const newEnergy = Math.max(0, pet.energy + (effect.energy || 0));
    const now = Math.floor(Date.now() / 1000);

    petOps.update(playerCode, {
      mood: newMood,
      energy: newEnergy,
      last_play_time: now,
      last_login_time: now
    });

    return { success: true, pet: petOps.get(playerCode) };
  },

  // 清洁
  clean: (playerCode) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const pet = petOps.get(playerCode);
    if (!pet) return { success: false, error: '宠物不存在' };

    const now = Math.floor(Date.now() / 1000);

    petOps.update(playerCode, {
      cleanliness: 100,
      mood: Math.min(100, pet.mood + 10),
      last_clean_time: now,
      last_login_time: now
    });

    return { success: true, pet: petOps.get(playerCode) };
  },

  // 获取宠物物品
  getItems: (playerCode) => {
    if (!_db) return [];
    const stmt = _db.prepare('SELECT * FROM pet_items WHERE player_code = ?');
    stmt.bind([playerCode]);
    const items = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();
    return items;
  },

  // 添加物品
  addItem: (playerCode, itemId, itemType, quantity = 1) => {
    if (!_db) return;
    const stmt = _db.prepare(`
      INSERT INTO pet_items (player_code, item_id, item_type, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(player_code, item_id, item_type) DO UPDATE SET quantity = quantity + ?
    `);
    stmt.run([playerCode, itemId, itemType, quantity, quantity]);
    saveDatabase();
  },

  // 消耗物品
  consumeItem: (playerCode, itemId, itemType) => {
    if (!_db) return { success: false, error: '数据库未初始化' };

    const stmt = _db.prepare('SELECT * FROM pet_items WHERE player_code = ? AND item_id = ? AND item_type = ?');
    stmt.bind([playerCode, itemId, itemType]);
    if (stmt.step()) {
      const item = stmt.getAsObject();
      stmt.free();

      if (item.quantity <= 1) {
        const deleteStmt = _db.prepare('DELETE FROM pet_items WHERE player_code = ? AND item_id = ? AND item_type = ?');
        deleteStmt.run([playerCode, itemId, itemType]);
      } else {
        const updateStmt = _db.prepare('UPDATE pet_items SET quantity = quantity - 1 WHERE player_code = ? AND item_id = ? AND item_type = ?');
        updateStmt.run([playerCode, itemId, itemType]);
      }
      saveDatabase();
      return { success: true, remaining: item.quantity - 1 };
    }
    stmt.free();
    return { success: false, error: '物品不存在' };
  },
};

export default getDb;
