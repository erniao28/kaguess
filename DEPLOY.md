# 言灵特工队 - 部署指南

## 服务器端口登记

> **重要：** 部署前请检查服务器端口占用情况，避免冲突！

### 端口占用登记表

| 项目 | 后端端口 | 域名 | PM2 服务名 | Nginx 配置 | 备注 |
|------|----------|------|------------|------------|------|
| NCD 报价系统 | 3000 | 121.40.35.46 | ncd-backend | /etc/nginx/sites-available/ncd-quotation | 现有项目 |
| CD Quote | 3002 | - | auto-quote-frontend | /etc/nginx/sites-available/cd-quote | 现有项目 |
| **kaguess** | **3001** | **kadegou48.top** | **kaguess-backend** | **/etc/nginx/sites-available/kadegou48.top** | **本项目** |
| (待定) | 3003 | - | - | - | 空闲 |
| (待定) | 3004 | - | - | - | 空闲 |

### 检查端口占用命令

```bash
# 查看 3000-3010 端口占用情况
netstat -tlnp | grep -E "300[0-9]|3010"

# 或查看所有 Node 进程占用的端口
ss -tlnp | grep node

# 查看 PM2 运行的服务
pm2 list

# 查看 Nginx 配置
cat /etc/nginx/sites-available/
```

---

## Nginx 配置方式说明（重要）

### 服务器使用 `sites-available/sites-enabled` 方式

```bash
# 配置文件目录
/etc/nginx/sites-available/    # 存放配置文件
/etc/nginx/sites-enabled/      # 存放软链接（启用的配置）

# 现有配置
/etc/nginx/sites-available/ncd-quotation    # NCD 项目
/etc/nginx/sites-available/cd-quote         # CD Quote 项目
/etc/nginx/sites-available/kadegou48.top    # kaguess 项目（本项目）
```

### 注意事项

1. **不要创建 `.bak` 备份文件在 `conf.d/` 目录** - 会造成冲突
2. **备份时移到其他目录** - 如 `/root/nginx-backup/`
3. **每个项目使用独立的配置文件** - 避免冲突
4. **后端必须监听 127.0.0.1** - 只有 Nginx 能访问

---

## 项目结构

```
kaguess/
├── server/          # 后端服务器（Socket.io）
│   ├── index.js     # 服务器主程序
│   ├── .env         # 环境变量配置
│   ├── .env.example # 环境变量模板
│   └── package.json
├── components/      # React 组件
├── App.tsx          # 主应用
├── deploy.sh        # 部署脚本
├── DEPLOY.md        # 部署文档
├── package.json
└── README.md
```

---

## 本地开发

### 1. 安装依赖

**前端：**
```bash
cd kaguess
npm install
```

**后端：**
```bash
cd kaguess/server
npm install
```

### 2. 启动服务

**启动后端服务器（终端 1）：**
```bash
cd kaguess/server
npm run dev
```
服务器将运行在 `http://localhost:3001`（开发环境）

**启动前端（终端 2）：**
```bash
cd kaguess
npm run dev
```
前端将运行在 `http://localhost:5173`

### 3. 测试
- 打开两个浏览器标签页，访问 `http://localhost:5173`
- 一个标签页创建房间，另一个加入
- 选择不同角色进行对战

---

## 生产环境部署（ kadegou48.top ）

### 方式一：使用部署脚本（推荐）

```bash
# 1. 上传代码到服务器
scp -r kaguess/* root@kadegou48.top:/root/kaguess

# 2. 在服务器上执行部署脚本
ssh root@kadegou48.top
cd /root/kaguess
chmod +x deploy.sh
./deploy.sh
```

### 方式二：手动部署

#### 1. 服务器要求
- Node.js 18+ (推荐 v20)
- PM2 进程管理
- Nginx 使用 `sites-available/sites-enabled` 方式
- 域名解析：`kadegou48.top` → 服务器公网 IP

#### 2. 安装 Node.js 和 PM2

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 安装 PM2
npm install -g pm2
```

#### 3. 上传代码

使用 SCP 或 Git 将代码上传到服务器：
```bash
scp -r kaguess/* root@kadegou48.top:/root/kaguess
```

#### 4. 配置后端环境变量

```bash
cd /root/kaguess/server
cp .env.example .env
nano .env
```

编辑 `.env` 文件：
```
PORT=3001
HOST=127.0.0.1
# GEMINI_API_KEY=your_api_key_here
```

#### 5. 安装依赖并构建

```bash
# 后端依赖
cd /root/kaguess/server
npm install

# 前端依赖和构建
cd /root/kaguess
npm install
npm run build
```

构建产物在 `dist/` 目录。

#### 6. 启动后端服务（PM2）

```bash
cd /root/kaguess/server
pm2 start index.js --name kaguess-backend

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup
```

#### 7. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/kadegou48.top
```

粘贴以下配置：

```nginx
server {
    listen 80;
    server_name kadegou48.top www.kadegou48.top;

    root /root/kaguess/dist;
    index index.html;

    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket 代理（Socket.io）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置：
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/kadegou48.top /etc/nginx/sites-enabled/

# 删除旧的 conf.d 配置（如果存在）
sudo rm -f /etc/nginx/conf.d/kadegou48.top.conf

# 测试 Nginx 配置
sudo nginx -t

# 重载 Nginx
sudo nginx -s reload
```

#### 8. 检查服务状态

```bash
# 查看 PM2 服务
pm2 status

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看端口监听
netstat -tlnp | grep -E "3001|80"
```

#### 9. 访问测试

打开浏览器访问 `http://kadegou48.top`，应该能看到前端页面并正常连接 WebSocket。

---

## 旧版部署指南（开发环境，不推荐生产使用）

### 1. 服务器要求
- Node.js 18+ (推荐 v20)
- 开放端口：3001（WebSocket）、5173（前端）或 80（生产环境）

### 2. 安装 Node.js

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 3. 上传代码

使用 SCP 或 Git 将代码上传到服务器：
```bash
# SCP 方式
scp -r kaguess/* user@your-server-ip:/path/to/kaguess
```

### 4. 安装依赖

```bash
cd /path/to/kaguess/server
npm install

cd ../
npm install
```

### 5. 配置服务器地址

**前端配置：** 修改 `App.tsx` 和 `SetupRoom.tsx` 中的 `SERVER_URL`：

```typescript
// 将 localhost 改为服务器公网 IP
const SERVER_URL = 'http://your-server-ip:3001';
```

### 6. 启动服务

**方式 1：后台运行（开发环境）**
```bash
# 后端
cd /path/to/kaguess/server
nohup npm start > server.log 2>&1 &

# 前端
cd /path/to/kaguess
nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
```

**方式 2：使用 PM2（推荐，生产环境）**
```bash
npm install -g pm2

# 启动后端
cd /path/to/kaguess/server
pm2 start index.js --name kaguess-server

# 启动前端
cd /path/to/kaguess
pm2 start npm --name kaguess-frontend -- start -- --host 0.0.0.0

# 查看状态
pm2 status

# 开机自启
pm2 startup
pm2 save
```

### 7. 防火墙配置

在阿里云轻量服务器控制台开放端口：
- 3001 (WebSocket)
- 5173 或 80 (前端)

---

## 生产环境构建（可选）

### 构建前端静态文件

```bash
cd kaguess
npm run build
```

构建产物在 `dist/` 目录。

### 使用 Nginx 托管

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/kaguess/dist;
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 使用说明

1. **创建房间**：访问网站，点击"创建新房间"，获得房间号
2. **分享房间号**：将房间号发给朋友
3. **加入房间**：朋友输入房间号，点击"连接作战频道"
4. **选择角色**：两人分别选择狐狸🦊和兔子🐰
5. **开始游戏**：双方准备好后自动开始
6. ** gameplay**：给对方挖坑，让对方说出禁语
7. **结算**：分高者输，抽取惩罚

---

## 常见问题

### Q: 连接失败
A: 检查服务器防火墙是否开放 3001 端口，确认 `SERVER_URL` 配置正确

### Q: WebSocket 连接不稳定
A: 确保服务器 WebSocket 协议正常工作，可尝试使用 polling 传输

### Q: 房间数据丢失
A: 当前版本使用内存存储，服务器重启后房间数据会清空
