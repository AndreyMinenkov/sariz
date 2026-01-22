#!/bin/bash
# Скрипт восстановления системы SARIZ после сбоя

echo "=== ВОССТАНОВЛЕНИЕ СИСТЕМЫ SARIZ ==="

# Проверка и восстановление сервисов
restart_service() {
    service=$1
    echo "Проверка сервиса $service..."
    if ! systemctl is-active --quiet $service; then
        echo "Сервис $service не работает. Перезапуск..."
        systemctl restart $service
        sleep 5
        if systemctl is-active --quiet $service; then
            echo "✅ Сервис $service восстановлен"
        else
            echo "❌ Не удалось восстановить сервис $service"
        fi
    else
        echo "✅ Сервис $service работает"
    fi
}

# Проверка основных сервисов
restart_service postgresql
restart_service redis-server
restart_service nginx
restart_service sariz-backend
restart_service sariz-celery

# Проверка свободного места на диске
echo "Проверка свободного места на диске..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ $DISK_USAGE -gt 90 ]; then
    echo "⚠️ Внимание! Использовано ${DISK_USAGE}% дискового пространства"
    echo "Очистка временных файлов..."
    find /opt/sariz/uploads/tmp -type f -mtime +1 -delete 2>/dev/null || true
    find /tmp -name "*.tmp" -mtime +1 -delete 2>/dev/null || true
fi

# Проверка использования памяти
echo "Проверка использования памяти..."
MEM_USAGE=$(free | awk '/Mem:/ {print int($3/$2*100)}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "⚠️ Внимание! Использовано ${MEM_USAGE}% памяти"
    echo "Перезапуск Redis для освобождения памяти..."
    systemctl restart redis-server
fi

echo "=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ==="
