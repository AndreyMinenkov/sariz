from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Создание Celery приложения
celery_app = Celery(
    'sariz',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    include=['app.tasks']
)

# Настройки Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Moscow',
    enable_utc=True,
    worker_max_tasks_per_child=100,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Оптимизации для сервера с 2GB RAM
celery_app.conf.update(
    worker_max_memory_per_child=200000,  # 200MB на процесс
    broker_pool_limit=10,
    broker_connection_max_retries=3,
)
