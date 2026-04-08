---
name: 更新代码不碰数据库
description: 更新代码时只执行 git pull → npm install → pm2 restart，绝对不碰数据库
type: feedback
---

## 铁律

**更新代码 = 只更新代码，不碰数据库**

### 正确流程
```bash
git pull → npm install → pm2 restart
```

### 禁止操作
- ❌ 不要备份数据库
- ❌ 不要恢复数据库
- ❌ 不要检查数据库内容
- ❌ 不要操作 rooms.db
- ❌ 不要用测试数据写入生产库

### 为什么
- 代码是代码，数据是数据
- `.gitignore` 已配置 `rooms.db`，git 操作不会影响它
- PM2 重启后，新代码自动读取现有数据库
- 之前犯过错：用测试数据污染了生产数据库，导致用户房间丢失

### 记住
用户建立私密房间的数据必须永久保存，更新代码不能影响它。
