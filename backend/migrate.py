#!/usr/bin/env python3
import psycopg2
import os
from pathlib import Path

def run_migrations():
    # Используем предоставленные данные для подключения
    db_params = {
        'host': 'localhost',
        'port': '5432',
        'database': 'sariz',
        'user': 'postgres',
        'password': 'Kapapa661109'
    }
    
    # Подключение к БД
    conn = psycopg2.connect(**db_params)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Создание таблицы для отслеживания миграций
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Получение списка примененных миграций
    cursor.execute('SELECT version FROM schema_migrations ORDER BY version')
    applied_migrations = [row[0] for row in cursor.fetchall()]
    
    # Поиск файлов миграций
    migration_dir = Path(__file__).parent
    migration_files = sorted(migration_dir.glob('*.sql'))
    
    for migration_file in migration_files:
        # Извлечение номера версии из имени файла
        version = int(migration_file.stem.split('_')[0])
        
        if version not in applied_migrations:
            print(f'Применение миграции: {migration_file.name}')
            
            # Чтение SQL-скрипта
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_script = f.read()
            
            # Выполнение миграции
            try:
                cursor.execute(sql_script)
                
                # Запись о примененной миграции
                cursor.execute(
                    'INSERT INTO schema_migrations (version, name) VALUES (%s, %s)',
                    (version, migration_file.name)
                )
                print(f'Миграция {version} успешно применена')
            except Exception as e:
                print(f'Ошибка при применении миграции {version}: {e}')
                conn.rollback()
                break
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    run_migrations()
