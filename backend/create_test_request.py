from app.database import SessionLocal
from app.models import Request, Import, User
import uuid
from datetime import datetime, date, timedelta
import random

def create_test_request():
    db = SessionLocal()

    try:
        # Находим пользователя employee_real
        user = db.query(User).filter(User.username == 'employee_real').first()
        if not user:
            print("❌ Пользователь employee_real не найден")
            return

        print(f"✅ Найден пользователь: {user.full_name}, Организация: {user.organization}, Подразделение: {user.department}")

        # Создаем тестовый импорт
        import_item = Import(
            id=uuid.uuid4(),
            user_id=user.id,
            file_name="тестовый_импорт.xlsx",
            file_size=1024,
            payment_date=date.today() + timedelta(days=30),
            comment="Тестовый комментарий от реального пользователя",
            status="processing"
        )
        db.add(import_item)
        db.flush()  # Получаем ID импорта

        # Создаем тестовые заявки
        for i in range(3):
            request = Request(
                id=uuid.uuid4(),
                article=f"Статья {i+1}",
                amount=random.randint(10000, 50000),
                recipient=f"Получатель {i+1}",
                request_number=f"REQ-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}",
                request_date=datetime.now(),
                status='pending',
                organization=user.organization,
                department=user.department,
                priority=random.randint(1, 5),
                purpose=f"Тестовая цель {i+1}",
                payment_date=date.today() + timedelta(days=random.randint(1, 30)),
                applicant=user.full_name,
                category="test",
                import_type='regular',
                created_by=user.id,
                import_id=import_item.id,
                source="employee"
            )
            db.add(request)

        db.commit()
        print(f"✅ Созданы тестовые заявки от пользователя {user.full_name}")
        print(f"✅ Организация: {user.organization}")
        print(f"✅ Подразделение: {user.department}")
        print(f"✅ Количество заявок: 3")
        print(f"✅ Импорт создан с ID: {import_item.id}")

    except Exception as e:
        print(f"❌ Ошибка при создании тестовой заявки: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_request()
