import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import User
from app.auth import get_password_hash
import uuid

def fix_users():
    # Создаем таблицы если их нет
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Очищаем таблицу пользователей
        print("Очистка таблицы пользователей...")
        db.query(User).delete()
        db.commit()
        
        # Создаем тестовых пользователей
        test_users = [
            {
                "username": "employee_test",
                "password": "test123",
                "full_name": "Иванов Иван Иванович",
                "email": "employee@company.ru",
                "role": "employee",
                "organization": "ООО Компания",
                "department": "IT отдел"
            },
            {
                "username": "deputy_test",
                "password": "test123", 
                "full_name": "Петров Петр Петрович",
                "email": "deputy@company.ru",
                "role": "deputy_director",
                "organization": "ООО Компания",
                "department": "Руководство"
            },
            {
                "username": "treasury_test",
                "password": "test123",
                "full_name": "Сидорова Мария Ивановна",
                "email": "treasury@company.ru",
                "role": "treasury",
                "organization": "ООО Компания",
                "department": "Казначейство"
            }
        ]
        
        print("Создание тестовых пользователей...")
        for user_data in test_users:
            # Генерируем хеш пароля
            password_hash = get_password_hash(user_data["password"])
            print(f"Пароль для {user_data['username']}: {user_data['password']}")
            print(f"Хеш: {password_hash[:30]}...")
            
            db_user = User(
                id=uuid.uuid4(),
                username=user_data["username"],
                password_hash=password_hash,
                full_name=user_data["full_name"],
                email=user_data["email"],
                role=user_data["role"],
                organization=user_data["organization"],
                department=user_data["department"],
                is_active=True
            )
            db.add(db_user)
        
        db.commit()
        print("✅ Пользователи успешно созданы")
        
        # Проверяем созданных пользователей
        users = db.query(User).all()
        print(f"\nСоздано пользователей: {len(users)}")
        for user in users:
            print(f"  - {user.username} ({user.role})")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    if fix_users():
        print("\n✅ Исправление завершено успешно")
        sys.exit(0)
    else:
        print("\n❌ Исправление завершено с ошибками")
        sys.exit(1)
