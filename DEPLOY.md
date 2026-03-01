# 言灵特工队 - 部署指南

## 项目结构

```
kaguess/
├── server/          # 后端服务器（Socket.io）
│   ├── index.js     # 服务器主程序
│   └── package.json
├── components/      # React 组件
├── App.tsx          # 主应用
├── package.json
└── README.md        # 本文件
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
服务器将运行在 `http://localhost:3001`

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

## 阿里云轻量服务器部署

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
