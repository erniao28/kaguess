#!/bin/bash
# kaguess 项目部署脚本
# 服务器：kadegou48.top
# 后端端口：3001 (127.0.0.1)

set -e

echo "=========================================="
echo "  kaguess 项目部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_ROOT="/var/www/kaguess"
BACKEND_DIR="${PROJECT_ROOT}/server"
FRONTEND_DIST="${PROJECT_ROOT}/dist"
NGINX_CONF="/etc/nginx/sites-available/kadegou48.top"
NGINX_LINK="/etc/nginx/sites-enabled/kadegou48.top"

echo -e "${YELLOW}[1/6] 检查目录结构...${NC}"
if [ ! -d "${BACKEND_DIR}" ]; then
    echo -e "${RED}错误：后端目录不存在 ${BACKEND_DIR}${NC}"
    exit 1
fi
echo -e "${GREEN}目录检查通过${NC}"

echo -e "${YELLOW}[2/6] 安装后端依赖...${NC}"
cd "${BACKEND_DIR}"
npm install
echo -e "${GREEN}后端依赖安装完成${NC}"

echo -e "${YELLOW}[3/6] 构建前端...${NC}"
cd "${PROJECT_ROOT}"
npm install
npm run build
echo -e "${GREEN}前端构建完成${NC}"

echo -e "${YELLOW}[4/6] 启动/重启 PM2 后端服务...${NC}"
# 检查是否已存在服务
if pm2 describe kaguess-server > /dev/null 2>&1; then
    pm2 restart kaguess-server
    echo -e "${GREEN}PM2 服务已重启${NC}"
else
    pm2 start index.js --name kaguess-server
    echo -e "${GREEN}PM2 服务已启动${NC}"
fi

# 保存 PM2 配置
pm2 save

echo -e "${YELLOW}[5/6] 创建 Nginx 配置...${NC}"

# 创建 Nginx 配置文件
cat > "${NGINX_CONF}" << 'NGINX_EOF'
server {
    listen 80;
    server_name kadegou48.top www.kadegou48.top;

    root /var/www/kaguess/dist;
    index index.html;

    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket 代理 (Socket.io)
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
NGINX_EOF

echo -e "${GREEN}Nginx 配置已创建：${NGINX_CONF}${NC}"

echo -e "${YELLOW}[6/6] 启用 Nginx 配置...${NC}"

# 创建软链接（如果不存在）
if [ ! -L "${NGINX_LINK}" ]; then
    ln -s "${NGINX_CONF}" "${NGINX_LINK}"
    echo -e "${GREEN}软链接已创建：${NGINX_LINK}${NC}"
else
    echo -e "${GREEN}软链接已存在${NC}"
fi

# 删除旧的 conf.d 配置（如果存在）
OLD_CONF="/etc/nginx/conf.d/kadegou48.top.conf"
if [ -f "${OLD_CONF}" ]; then
    rm "${OLD_CONF}"
    echo -e "${GREEN}已删除旧配置：${OLD_CONF}${NC}"
fi

# 测试 Nginx 配置
echo -e "${YELLOW}测试 Nginx 配置...${NC}"
nginx -t

# 重载 Nginx
echo -e "${YELLOW}重载 Nginx...${NC}"
nginx -s reload

echo -e "${GREEN}=========================================="
echo "  部署完成！"
echo "==========================================${NC}"
echo ""
echo "访问地址：http://kadegou48.top"
echo ""
echo "验证命令："
echo "  pm2 status"
echo "  pm2 logs kaguess-server"
echo "  curl -I http://kadegou48.top"
