from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash
import uuid

def create_another_test_user():
    db = SessionLocal()

    try:
        # Создаем тестового пользователя с другим подразделением
        another_user = {
            "username": "employee_muravlenko",
            "password": "test123",
            "full_name": "Кузнецов Алексей Владимирович",
            "email": "kuznetsov@service-integrator.ru",
            "role": "employee",
            "organization": "Сервис-Интегратор ООО",
            "department": "ДТ МУРАВЛЕНКО"
        }

        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.username == another_user["username"]).first()

        if not existing_user:
            db_user = User(
                id=uuid.uuid4(),
                username=another_user["username"],
                password_hash=get_password_hash(another_user["password"]),
                full_name=another_user["full_name"],
                email=another_user["email"],
                role=another_user["role"],
                organization=another_user["organization"],
                department=another_user["department"],
                is_active=True
            )

            db.add(db_user)
            db.commit()
            print(f"✅ Создан тестовый пользователь:")
            print(f"  Логин: {another_user['username']}")
            print(f"  Пароль: {another_user['password']}")
            print(f"  Организация: {another_user['organization']}")
            print(f"  Подразделение: {another_user['department']}")
            print(f"  ФИО: {another_user['full_name']}")
        else:
            print("✅ Пользователь уже существует")
            
            # Обновляем данные существующего пользователя
            existing_user.organization = another_user["organization"]
            existing_user.department = another_user["department"]
            existing_user.full_name = another_user["full_name"]
            db.commit()
            print(f"✅ Обновлены данные пользователя {another_user['username']}")

    except Exception as e:
        print(f"❌ Ошибка при создании пользователя: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_another_test_user()
