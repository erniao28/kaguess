# 部署验证流程

## 验证方法（每次部署后必须执行）

### 1. 本地获取信息
```bash
# 构建
npm run build

# 获取 JS 文件 hash 和 git commit
md5sum dist/assets/*.js
git log -1 --format='%H %s'
```

### 2. 服务器获取信息
```bash
# SSH 登录服务器
ssh kaguess

# 获取信息
cd /var/www/kaguess
md5sum dist/assets/*.js
git log -1 --format='%H %s'
```

### 3. 对比验证
| 项目 | 本地 | 服务器 | 状态 |
|------|------|--------|------|
| JS Hash | xxx | xxx | ✅/❌ |
| Git Commit | xxx | xxx | ✅/❌ |

## 标准部署流程

```bash
# 1. 本地提交
git add -A && git commit -m "xxx"

# 2. 推送到 GitHub
git push origin master

# 3. 服务器拉取并构建（优先）
ssh kaguess "cd /var/www/kaguess && git pull && npm run build"

# 如果 git pull 失败，使用 scp 上传 dist
scp -i ~/.ssh/id_kaguess_ai -r dist/* root@kaguess:/var/www/kaguess/dist/

# 4. 同步服务器 Git 状态（如果用了 scp）
ssh kaguess "cd /var/www/kaguess && git fetch origin && git reset --hard origin/master"

# 5. 重启 PM2（如需要）
ssh kaguess "pm2 restart kaguess-server"

# 6. 验证一致性（必须！）
```

## 常见问题

**Q: 构建失败 `vite: Permission denied`**
A: 重新安装依赖：`rm -rf node_modules && npm install`

**Q: git pull 冲突**
A: `git reset --hard origin/master` 然后重新构建

**Q: GitHub 连接超时**
A: 使用 `scp` 上传 `dist/`，然后用 `git fetch + git reset` 同步 Git 状态
