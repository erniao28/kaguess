# 数据持久化方案

## 问题根源

之前的代码使用 `socket.id` 作为玩家标识符，但每次玩家刷新页面或重新连接时，`socket.id` 都会变化，导致：
- 胡萝卜数据无法关联到同一玩家
- 玩家战绩统计丢失
- 特效解锁状态丢失

## 解决方案

### 1. 使用玩家名字作为持久化标识符

**修改前**（server/index.js）：
```javascript
// ❌ 错误：玩家连接时用 socket.id 创建档案
io.on('connection', (socket) => {
  playerOps.upsert(socket.id, { nickname: '玩家' });
});
```

**修改后**：
```javascript
// ✅ 正确：不立即创建档案
io.on('connection', (socket) => {
  // 等待玩家选择角色时再用 player.name 创建档案
});

// select_role 时创建持久化档案
socket.on('select_role', ({ roomId, role, player }) => {
  if (player.name) {
    // 将旧 socket.id 的胡萝卜转移到玩家名字
    const oldCarrotCount = carrotOps.getCount(socket.id);
    if (oldCarrotCount > 0) {
      carrotOps.addCarrot(player.name, oldCarrotCount);
      db.prepare(`DELETE FROM player_carrots WHERE player_identifier = ?`).run(socket.id);
    }
    // 创建玩家档案
    playerOps.upsert(player.name, { nickname: player.name });
  }
});
```

### 2. 数据库表结构

```sql
-- 玩家档案表（永久保存）
CREATE TABLE player_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_identifier TEXT UNIQUE NOT NULL,  -- 使用玩家名字
  nickname TEXT DEFAULT '玩家',
  total_games INTEGER DEFAULT 0,
  win_games INTEGER DEFAULT 0,
  carrot_count INTEGER DEFAULT 0,
  vip_level INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  last_login INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 胡萝卜记录表
CREATE TABLE player_carrots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_identifier TEXT UNIQUE NOT NULL,  -- 使用玩家名字
  carrot_count INTEGER DEFAULT 0,
  last_updated INTEGER DEFAULT (strftime('%s', 'now'))
);

-- VIP 房间表（永久保存）
CREATE TABLE vip_rooms (
  id TEXT PRIMARY KEY,
  owner_identifier TEXT NOT NULL,
  room_name TEXT DEFAULT 'VIP 房间',
  is_vip INTEGER DEFAULT 1,
  bg_image TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER  -- NULL 表示永久
);
```

### 3. 服务器重启时自动恢复 VIP 房间

```javascript
// server/index.js
function restoreVipRooms() {
  const stmt = db.prepare(
    "SELECT * FROM vip_rooms WHERE expires_at IS NULL OR expires_at > strftime('%s', 'now')"
  );
  const activeVipRooms = stmt.all();

  activeVipRooms.forEach(room => {
    rooms.set(room.id, {
      players: [],
      state: { fox: null, bunny: null, word: null, punishments: null },
      isPrivate: true
    });
    console.log(`[RESTORE] 恢复 VIP 房间：${room.id}`);
  });
}

// 服务器启动时恢复
setTimeout(restoreVipRooms, 1000);
```

## 部署说明

### 数据库文件位置
- 服务器路径：`/root/kaguess/server/rooms.db`
- **重要**：此文件不被 git 追踪，手动备份

### 备份策略

1. **自动备份**（已配置）：
   - 每天凌晨 3 点自动备份
   - 备份脚本：`/root/kaguess/server/backup-db.sh`
   - 备份位置：`/root/kaguess/backups/`
   - 保留 30 天

2. **手动备份**：
   ```bash
   # SSH 登录服务器
   ssh root@kadegou48.top

   # 手动备份数据库
   cp /root/kaguess/server/rooms.db /root/kaguess/backups/rooms_backup_$(date +%Y%m%d_%H%M%S).db

   # 下载到本地
   scp root@kadegou48.top:/root/kaguess/server/rooms.db ./backup/
   ```

### 迁移旧数据

如果服务器上有旧的 socket.id 格式数据：

```bash
# SSH 登录服务器
ssh root@kadegou48.top

# 运行迁移脚本
cd /root/kaguess/server
node migrate-db.js

# 重启服务
pm2 restart kaguess-server
```

## 测试方法

### 测试胡萝卜持久化
1. 访问 http://kadegou48.top
2. 创建/加入私密房间
3. 输入玩家名字（如 "Judy"）
4. 选择角色并开始游戏
5. 获胜后查看胡萝卜数量
6. **刷新页面**，重新登录相同名字
7. 检查胡萝卜数量是否保留

### 测试 VIP 房间持久化
1. 创建私密房间（如房间号 "myroom"）
2. 设置密码
3. **重启 PM2 服务**：`pm2 restart kaguess-server`
4. 重新加入房间 "myroom"
5. 验证房间仍存在，密码正确

## 数据流程图

```
玩家连接 → socket.id 临时标识
    ↓
选择角色 → player.name 持久标识
    ↓
游戏获胜 → carrotOps.addCarrot(player.name, 1)
    ↓
保存到 DB → player_carrots 表
    ↓
下次登录 → 使用相同 player.name 查询
```

## 常见问题

### Q: 为什么之前数据会丢失？
A: 因为使用 `socket.id` 作为标识符，每次刷新页面 socket.id 都变化，导致查询不到之前的数据。

### Q: 如何恢复之前"丢失"的数据？
A: 很遗憾，使用 socket.id 记录的数据无法自动恢复。因为无法确定哪个 socket.id 对应哪个玩家名字。

### Q: 数据库会被代码更新覆盖吗？
A: 不会。数据库文件 `/root/kaguess/server/rooms.db` 存储在服务器本地，代码更新（git pull）不会覆盖数据库文件。

### Q: 如果服务器重装怎么办？
A: 需要提前备份数据库文件。可以使用自动备份（每天凌晨 3 点）或手动备份。

## 维护命令

```bash
# 查看数据库内容
cd /root/kaguess/server
node -e "import('better-sqlite3').then(db => {
  const d = db.default('rooms.db');
  console.log('VIP 房间:', d.prepare('SELECT * FROM vip_rooms').all());
  console.log('玩家档案:', d.prepare('SELECT * FROM player_profiles').all());
  console.log('胡萝卜记录:', d.prepare('SELECT * FROM player_carrots').all());
})"

# 备份数据库
./backup-db.sh

# 查看备份文件
ls -la /root/kaguess/backups/
```
