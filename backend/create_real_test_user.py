from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash
import uuid

def create_real_test_user():
    db = SessionLocal()

    try:
        # Создаем тестового пользователя с реальными данными
        real_user = {
            "username": "employee_real",
            "password": "test123",
            "full_name": "Сергеев Сергей Сергеевич",
            "email": "sergeev@service-integrator.ru",
            "role": "employee",
            "organization": "Сервис-Интегратор ООО",
            "department": "ДТ ЖЕЛЕЗНОГОРСК"
        }

        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.username == real_user["username"]).first()

        if not existing_user:
            db_user = User(
                id=uuid.uuid4(),
                username=real_user["username"],
                password_hash=get_password_hash(real_user["password"]),
                full_name=real_user["full_name"],
                email=real_user["email"],
                role=real_user["role"],
                organization=real_user["organization"],
                department=real_user["department"],
                is_active=True
            )

            db.add(db_user)
            db.commit()
            print(f"✅ Создан тестовый пользователь с реальными данными:")
            print(f"  Логин: {real_user['username']}")
            print(f"  Пароль: {real_user['password']}")
            print(f"  Организация: {real_user['organization']}")
            print(f"  Подразделение: {real_user['department']}")
            print(f"  ФИО: {real_user['full_name']}")
        else:
            print("✅ Пользователь уже существует")
            
            # Обновляем данные существующего пользователя
            existing_user.organization = real_user["organization"]
            existing_user.department = real_user["department"]
            existing_user.full_name = real_user["full_name"]
            db.commit()
            print(f"✅ Обновлены данные пользователя {real_user['username']}")

    except Exception as e:
        print(f"❌ Ошибка при создании пользователя: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_real_test_user()
