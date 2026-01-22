#!/usr/bin/env python3
"""
Скрипт для обновления существующих заявок:
1. Установка source на основе роли пользователя
2. Автоматическая категоризация
"""
import sys
sys.path.append('/opt/sariz/backend')

from app.database import SessionLocal
from app.models import Request, User
from app.utils.categorization import categorize_request, update_request_categories

def main():
    db = SessionLocal()
    
    try:
        print("Обновление существующих заявок...")
        
        # 1. Устанавливаем source на основе роли пользователя
        print("1. Установка source для заявок...")
        
        # Обновляем заявки от казначейства
        treasury_users = db.query(User.id).filter(User.role == 'treasury').all()
        treasury_user_ids = [user[0] for user in treasury_users]
        
        if treasury_user_ids:
            db.query(Request).filter(
                Request.created_by.in_(treasury_user_ids)
            ).update(
                {"source": "treasury"},
                synchronize_session=False
            )
            print(f"  - Обновлено заявок от казначейства: {db.query(Request).filter(Request.created_by.in_(treasury_user_ids)).count()}")
        
        # Обновляем заявки от сотрудников
        employee_users = db.query(User.id).filter(User.role == 'employee').all()
        employee_user_ids = [user[0] for user in employee_users]
        
        if employee_user_ids:
            db.query(Request).filter(
                Request.created_by.in_(employee_user_ids)
            ).update(
                {"source": "employee"},
                synchronize_session=False
            )
            print(f"  - Обновлено заявок от сотрудников: {db.query(Request).filter(Request.created_by.in_(employee_user_ids)).count()}")
        
        db.commit()
        
        # 2. Автоматическая категоризация
        print("2. Автоматическая категоризация заявок...")
        stats = update_request_categories(db)
        
        print(f"  - Всего обновлено: {stats['total_updated']}")
        print(f"  - Категория 'pitanie_projivanie': {stats['pitanie_projivanie']}")
        print(f"  - Категория 'filialy': {stats['filialy']}")
        
        print("\nОбновление завершено успешно!")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
