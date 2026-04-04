# 部署安全规范

## 核心原则
1. **不影响其他项目** - 服务器上运行着 auto-quote、ncd、chat-server 等项目，部署 kaguess 时不能干扰它们
2. **数据正确保存** - 每次更新前必须备份数据库，确保玩家档案、聊天记录、胡萝卜数据不丢失
3. **代码同步一致** - 前端 dist、后端代码、bare 仓库必须同步到同一版本

## 服务器架构
```
/root/
├── kaguess/          # kaguess 后端代码 (git worktree)
├── kaguess-repo/     # kaguess bare 仓库 (git remote)
├── chat-server/      # 聊天服务 (其他项目)
└── ...

/var/www/
├── kaguess/          # kaguess 前端 dist
├── auto-quote/       # auto-quote 前端 (其他项目)
└── html/             # 其他静态文件

/root/.pm2/           # PM2 管理的服务
├── kaguess-server    # kaguess 后端
├── chat-server       # 聊天服务
├── ncd-backend       # NCD 项目
└── auto-quote-backend # Auto Quote 项目
```

## 标准部署流程

### 步骤 1: 本地构建和提交
```bash
cd /E/file/project_ai/cc_test/test\ k\ project/game/kaguess

# 1. 构建前端
npm run build

# 2. 提交所有更改
git add -A
git commit -m "fix: xxx"

# 3. 推送到 GitHub (如果网络允许)
git push origin master

# 4. 推送到服务器 bare 仓库
git push server master
```

### 步骤 2: 备份服务器数据
```bash
# 备份数据库到带时间戳的文件
ssh kaguess-server "cd /root/kaguess/server && cp rooms.db rooms.db.\$(date +%Y%m%d_%H%M%S)"

# 验证备份存在
ssh kaguess-server "ls -la /root/kaguess/server/rooms.db*"
```

### 步骤 3: 同步后端代码
```bash
# 从 bare 仓库更新工作目录
ssh kaguess-server "cd /root/kaguess && git pull /root/kaguess-repo master"

# 验证版本
ssh kaguess-server "cd /root/kaguess && git log -1 --oneline"
```

### 步骤 4: 上传前端文件
```bash
# 上传 dist 目录
scp -i ~/.ssh/id_kaguess_ai -r dist/* root@121.40.35.46:/var/www/kaguess/dist/

# 验证文件
ssh kaguess-server "md5sum /var/www/kaguess/dist/assets/*.js"
ssh kaguess-server "cat /var/www/kaguess/dist/index.html | grep 'index-.*\\.js'"
```

### 步骤 5: 重启服务
```bash
# 仅重启 kaguess-server，不影响其他项目
ssh kaguess-server "pm2 restart kaguess-server"

# 验证服务状态
ssh kaguess-server "pm2 list"

# 检查日志（无错误）
ssh kaguess-server "pm2 logs kaguess-server --lines 20 --nostream"
```

### 步骤 6: 验证部署
- [ ] 前端 JS hash 与本地一致
- [ ] 后端 git commit 与本地一致
- [ ] PM2 服务正常运行
- [ ] 其他项目（auto-quote, ncd, chat-server）正常运行
- [ ] 数据库文件存在且大小正常

## 禁止操作

❌ **不要重启 PM2 所有服务** - 只重启 `kaguess-server`
```bash
# 错误：会影响其他项目
pm2 restart all

# 正确：只影响 kaguess
pm2 restart kaguess-server
```

❌ **不要删除数据库** - 除非确认不需要保留数据
```bash
# 错误：会丢失所有玩家数据
rm /root/kaguess/server/rooms.db

# 正确：先备份，或者只在测试环境删除
cp rooms.db rooms.db.backup
```

❌ **不要修改其他项目目录**
```bash
# 错误：影响其他项目
rm -rf /var/www/auto-quote
pm2 restart ncd-backend

# 正确：只操作 kaguess 相关目录
```

## 数据库表结构

重要数据表，必须保护：
- `rooms` - 私密房间信息
- `messages` - 聊天记录（私密房间）
- `player_profiles` - 玩家档案（档案码、密码、胡萝卜、装扮等）
- `player_carrots` - 胡萝卜数量
- `player_effects` - 已解锁特效
- `player_inventory` - 玩家物品背包
- `vip_rooms` - VIP 房间

## 回滚流程

如果部署后出现问题：

```bash
# 1. 恢复数据库
ssh kaguess-server "cd /root/kaguess/server && cp rooms.db.backup rooms.db"

# 2. 回滚代码到上一个版本
ssh kaguess-server "cd /root/kaguess && git reset --hard HEAD~1"

# 3. 回滚前端到旧版本（如果有备份）
# 上传旧的 dist 文件

# 4. 重启服务
ssh kaguess-server "pm2 restart kaguess-server"
```

## 检查清单

每次部署前确认：
- [ ] 已备份数据库
- [ ] 本地代码已提交
- [ ] 已推送到 bare 仓库
- [ ] 只重启 kaguess-server，不影响其他服务
- [ ] 验证部署后功能正常
- [ ] 检查其他项目是否正常运行
