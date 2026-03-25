<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 言灵特工队 - 每日禁语

一款基于《疯狂动物城》的双人社交对战游戏。玩家扮演狐狸🦊或兔子🐰，通过挖坑和陷阱让对方说出禁语，分高者输并接受惩罚。

**在线游玩：** [kadegou48.top](http://kadegou48.top)

---

## 🎮 游戏说明

### 游戏流程
1. **创建/加入房间**：玩家 1 创建房间，玩家 2 输入房间号加入
2. **自由选择角色**：初始两个角色都可选，先选先占
3. **角色锁定**：一个角色被选择后，另一个自动锁定给对方
4. **自定义惩罚**：双方都可以添加自定义真心话和大冒险
5. **开始游戏**：双方准备好后自动开始
6. **计分对战**：点击"陷阱"或"罚单"给对方加分
7. **惩罚环节**：分高者输，抽取惩罚

### 角色
- **🦊 狐尼克**：擅长设置陷阱
- **🐰 朱迪**：擅长开罚单

---

## 🚀 本地开发

###  prerequisites
- Node.js 18+

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
# 终端 1 - 启动后端 (Socket.io)
cd server
npm run dev

# 终端 2 - 启动前端 (Vite + React)
cd ..
npm run dev
```

访问 `http://localhost:5173`，打开两个标签页测试双人模式。

---

## 📦 生产环境部署

### 服务器要求
- Node.js 20+
- PM2 进程管理
- Nginx 反向代理
- 域名解析到服务器 IP

### 部署步骤

1. **上传代码**
```bash
scp -r kaguess/* root@kadegou48.top:/root/kaguess
```

2. **安装依赖并构建**
```bash
cd /root/kaguess
npm install
npm run build
```

3. **启动后端服务**
```bash
cd /root/kaguess/server
pm2 start index.js --name kaguess-server
pm2 save
```

4. **Nginx 配置**
```nginx
server {
    listen 80;
    server_name kadegou48.top;
    root /root/kaguess/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 📝 更新日志

### 2026-03-25
- ✅ 新增实时聊天功能（文字、表情、图片）
- ✅ 修复聊天消息跨玩家同步问题
- ✅ 修复双人模式角色选择和计分同步问题

### 2026-03-22
- ✅ 修复双人模式角色选择不同步问题
- ✅ 修复初始进入房间角色被占用显示错误
- ✅ 修复惩罚库（真心话/大冒险）不同步
- ✅ 修复计分（罚单/陷阱）不同步
- ✅ 修复加分动画效果不同步

### 技术架构
- **前端**：React 19 + TypeScript + Vite
- **后端**：Node.js + Socket.io
- **样式**：Tailwind CSS
- **部署**：PM2 + Nginx

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License
