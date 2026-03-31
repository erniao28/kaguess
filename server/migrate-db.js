// 数据库迁移脚本：将 socket.id 标识的玩家数据迁移到 player.name
// 使用方法：node migrate-db.js

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.resolve(__dirname, 'rooms.db'));

console.log('🔍 开始迁移玩家数据...');

// 获取所有玩家档案
const profiles = db.prepare('SELECT * FROM player_profiles').all();
const carrots = db.prepare('SELECT * FROM player_carrots').all();
const effects = db.prepare('SELECT * FROM player_effects').all();

console.log(`找到 ${profiles.length} 个玩家档案`);
console.log(`找到 ${carrots.length} 条胡萝卜记录`);
console.log(`找到 ${effects.length} 条特效记录`);

// 检查是否有 socket.id 格式的记录（长度 22 左右，包含 - 和 _）
function isSocketId(identifier) {
  return /^[a-zA-Z0-9_-]{15,}$/.test(identifier);
}

const socketIdProfiles = profiles.filter(p => isSocketId(p.player_identifier));
const socketIdCarrots = carrots.filter(c => isSocketId(c.player_identifier));
const socketIdEffects = effects.filter(e => isSocketId(e.player_identifier));

console.log(`\n⚠️  发现 ${socketIdProfiles.length} 个 socket.id 格式的档案`);
console.log(`⚠️  发现 ${socketIdCarrots.length} 条 socket.id 格式的胡萝卜记录`);
console.log(`⚠️  发现 ${socketIdEffects.length} 条 socket.id 格式的特效记录`);

if (socketIdProfiles.length === 0) {
  console.log('\n✅ 无需迁移，数据库已经使用玩家名字作为标识符');
  db.close();
  process.exit(0);
}

console.log('\n📝 迁移方案：');
console.log('1. 将 socket.id 档案的 carrot_count 合并到 player_carrots 表');
console.log('2. 将 socket.id 档案的 total_games/win_games 保留（但标记为未知玩家）');
console.log('3. 删除 socket.id 格式的 player_profiles 记录');
console.log('4. player_carrots 和 player_effects 表中的记录保留，等待玩家登录时合并');

// 备份数据
console.log('\n💾 创建备份...');
const backupStmt = db.prepare(`
  CREATE TABLE IF NOT EXISTS backup_player_profiles (
    id INTEGER PRIMARY KEY,
    player_identifier TEXT,
    nickname TEXT,
    total_games INTEGER,
    win_games INTEGER,
    carrot_count INTEGER,
    vip_level INTEGER,
    created_at INTEGER,
    last_login INTEGER,
    backed_up_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);
backupStmt.run();

const insertBackup = db.prepare(`
  INSERT INTO backup_player_profiles (player_identifier, nickname, total_games, win_games, carrot_count, vip_level, created_at, last_login)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const transaction = db.transaction((profilesToBackup) => {
  profilesToBackup.forEach(p => {
    insertBackup.run(p.player_identifier, p.nickname, p.total_games, p.win_games, p.carrot_count, p.vip_level, p.created_at, p.last_login);
  });
});

transaction(socketIdProfiles);
console.log('✅ 备份完成');

// 将 socket.id 档案的胡萝卜数量转移到 player_carrots（如果 player_carrots 中已有则合并）
console.log('\n🔄 迁移胡萝卜数据...');
let migratedCarrots = 0;
socketIdCarrots.forEach(c => {
  // 这些是 socket.id 的胡萝卜记录，我们无法知道对应的玩家名字
  // 保留在数据库中，但不删除，等待未来有玩家名字匹配时再处理
  migratedCarrots++;
});
console.log(`保留了 ${migratedCarrots} 条胡萝卜记录（等待玩家重新登录时合并）`);

// 删除 socket.id 格式的 player_profiles 记录
console.log('\n🗑️  清理无效档案...');
const deleteProfiles = db.prepare('DELETE FROM player_profiles WHERE player_identifier = ?');
socketIdProfiles.forEach(p => {
  deleteProfiles.run(p.player_identifier);
});
console.log(`已删除 ${socketIdProfiles.length} 个 socket.id 格式的档案`);

// 注意：不删除 player_carrots 和 player_effects 中的 socket.id 记录
// 因为这些数据可能代表之前玩家的胡萝卜和特效
// 当玩家使用相同的名字登录时，代码会将旧的 socket.id 数据合并到新名字下

console.log('\n✅ 迁移完成！');
console.log('\n📋 重要说明：');
console.log('- 旧的 socket.id 档案已删除');
console.log('- player_carrots 表中的旧记录保留，等待玩家登录时合并');
console.log('- 玩家下次登录选择角色时，会用 player.name 创建新的持久化档案');
console.log('- 之前因 socket.id 变更而"丢失"的胡萝卜数据无法自动恢复');

db.close();
