from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash
import uuid

def create_test_users():
    db = SessionLocal()
    
    try:
        # Создаем тестовых пользователей для каждой роли
        test_users = [
            {
                "username": "employee_test",
                "password": "employee123",
                "full_name": "Иванов Иван Иванович",
                "email": "employee@company.ru",
                "role": "employee",
                "organization": "ООО Компания",
                "department": "IT отдел"
            },
            {
                "username": "deputy_test",
                "password": "deputy123",
                "full_name": "Петров Петр Петрович",
                "email": "deputy@company.ru",
                "role": "deputy_director",
                "organization": "ООО Компания",
                "department": "Руководство"
            },
            {
                "username": "treasury_test",
                "password": "treasury123",
                "full_name": "Сидорова Мария Ивановна",
                "email": "treasury@company.ru",
                "role": "treasury",
                "organization": "ООО Компания",
                "department": "Казначейство"
            }
        ]
        
        created_users = []
        
        for user_data in test_users:
            # Проверяем, существует ли пользователь
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            
            if not existing_user:
                db_user = User(
                    id=uuid.uuid4(),
                    username=user_data["username"],
                    password_hash=get_password_hash(user_data["password"]),
                    full_name=user_data["full_name"],
                    email=user_data["email"],
                    role=user_data["role"],
                    organization=user_data["organization"],
                    department=user_data["department"],
                    is_active=True
                )
                
                db.add(db_user)
                created_users.append(user_data["username"])
        
        db.commit()
        
        if created_users:
            print(f"✅ Созданы тестовые пользователи: {', '.join(created_users)}")
            print("\nДанные для входа:")
            for user in test_users:
                print(f"  Логин: {user['username']}")
                print(f"  Пароль: {user['password']}")
                print(f"  Роль: {user['role']}")
                print(f"  ---")
        else:
            print("✅ Пользователи уже существуют")
            
    except Exception as e:
        print(f"❌ Ошибка при создании пользователей: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()
