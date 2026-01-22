#!/bin/bash
# Скрипт запуска сервера разработки SARIZ

cd /opt/sariz/backend
source venv/bin/activate

echo "Запуск сервера разработки SARIZ..."
echo "Адрес: http://31.130.155.16:8000"
echo "Документация API: http://31.130.155.16:8000/docs"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
