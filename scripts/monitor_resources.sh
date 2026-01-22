#!/bin/bash
# Скрипт мониторинга ресурсов для SARIZ

echo "=== МОНИТОРИНГ РЕСУРСОВ СЕРВЕРА ==="
echo "Время: $(date)"
echo ""

# CPU использование
echo "CPU использование:"
top -bn1 | grep "Cpu(s)" | awk '{print "Пользователь: " $2 "%, Система: " $4 "%, Ожидание: " $6 "%"}'
echo ""

# Память
echo "Использование памяти:"
free -h | awk 'NR==2 {print "Используется: " $3 " из " $2 " (" $3/$2*100 "%)"}'
echo ""

# Диск
echo "Использование диска:"
df -h / | awk 'NR==2 {print "Используется: " $3 " из " $2 " (" $5 ")"}'
echo ""

# Проверка сервисов
check_service() {
    if systemctl is-active --quiet $1; then
        echo "✅ $1 работает"
    else
        echo "❌ $1 не работает"
    fi
}

echo "Статус сервисов:"
check_service nginx
check_service postgresql
check_service redis-server
check_service sariz-backend
check_service sariz-celery
echo ""

# Проверка логов на ошибки
echo "Последние ошибки в логах:"
tail -10 /opt/sariz/logs/backend_error.log 2>/dev/null | grep -i "error\|exception\|fail" || echo "Ошибок не найдено"
echo ""

echo "=== МОНИТОРИНГ ЗАВЕРШЕН ==="
