#!/bin/bash
# 数据库备份脚本
# 使用方法：./backup-db.sh [备份目录]

BACKUP_DIR="${1:-/root/kaguess/backups}"
DB_PATH="/root/kaguess/server/rooms.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/rooms_backup_$DATE.db"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 复制数据库文件
cp "$DB_PATH" "$BACKUP_FILE"

# 压缩备份
gzip "$BACKUP_FILE"

# 删除 30 天前的旧备份
find "$BACKUP_DIR" -name "rooms_backup_*.db.gz" -mtime +30 -delete

echo "备份完成：$BACKUP_FILE.gz"

# 可选：上传到远程存储（如阿里云 OSS、AWS S3 等）
# ossutil cp "$BACKUP_FILE.gz" oss://your-bucket/backups/
