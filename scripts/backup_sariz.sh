#!/bin/bash
# Скрипт резервного копирования SARIZ

echo "=== РЕЗЕРВНОЕ КОПИРОВАНИЕ SARIZ ==="

BACKUP_DIR="/opt/sariz/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sariz_backup_$DATE"

# Создание директории для бекапов
mkdir -p "$BACKUP_DIR"

# 1. Резервное копирование базы данных
echo "1. Копирование базы данных PostgreSQL..."
sudo -u postgres pg_dump -Fc sariz > "${BACKUP_FILE}.db"

# 2. Резервное копирование загруженных файлов
echo "2. Копирование загруженных файлов..."
if [ -d "/opt/sariz/uploads" ]; then
    tar -czf "${BACKUP_FILE}_uploads.tar.gz" -C /opt/sariz uploads
fi

# 3. Резервное копирование конфигураций
echo "3. Копирование конфигураций..."
tar -czf "${BACKUP_FILE}_configs.tar.gz" \
    /etc/nginx/sites-available/sariz \
    /etc/systemd/system/sariz-backend.service \
    /etc/systemd/system/sariz-celery.service \
    /opt/sariz/backend/.env \
    /etc/postgresql/16/main/postgresql.conf \
    /etc/redis/redis.conf

# 4. Создание общего архива
echo "4. Создание общего архива..."
tar -czf "${BACKUP_FILE}.tar.gz" \
    "${BACKUP_FILE}.db" \
    "${BACKUP_FILE}_uploads.tar.gz" \
    "${BACKUP_FILE}_configs.tar.gz"

# 5. Удаление временных файлов
rm -f "${BACKUP_FILE}.db" "${BACKUP_FILE}_uploads.tar.gz" "${BACKUP_FILE}_configs.tar.gz"

# 6. Удаление старых бекапов (храним 7 дней)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Резервное копирование завершено: ${BACKUP_FILE}.tar.gz"
echo "Размер: $(du -h "${BACKUP_FILE}.tar.gz" | cut -f1)"
