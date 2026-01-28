from app.database import SessionLocal
from app.models import User

def update_test_users():
    db = SessionLocal()

    try:
        # Обновляем пользователя employee_test
        user = db.query(User).filter(User.username == 'employee_test').first()
        if user:
            user.organization = "Сервис-Интегратор ООО"
            user.department = "ДТ МОСКВА"
            user.full_name = "Иванов Иван Иванович"
            print(f"✅ Обновлен пользователь {user.username}:")
            print(f"  Организация: {user.organization}")
            print(f"  Подразделение: {user.department}")
            print(f"  ФИО: {user.full_name}")
        else:
            print("❌ Пользователь employee_test не найден")

        # Обновляем пользователя deputy_test
        deputy = db.query(User).filter(User.username == 'deputy_test').first()
        if deputy:
            deputy.organization = "Сервис-Интегратор ООО"
            deputy.department = "ДТ МОСКВА"
            deputy.full_name = "Петров Петр Петрович"
            print(f"\n✅ Обновлен пользователь {deputy.username}:")
            print(f"  Организация: {deputy.organization}")
            print(f"  Подразделение: {deputy.department}")
            print(f"  ФИО: {deputy.full_name}")

        # Обновляем пользователя treasury_test
        treasury = db.query(User).filter(User.username == 'treasury_test').first()
        if treasury:
            treasury.organization = "Сервис-Интегратор ООО"
            treasury.department = "ДТ МОСКВА"
            treasury.full_name = "Сидорова Мария Ивановна"
            print(f"\n✅ Обновлен пользователь {treasury.username}:")
            print(f"  Организация: {treasury.organization}")
            print(f"  Подразделение: {treasury.department}")
            print(f"  ФИО: {treasury.full_name}")

        # Обновляем пользователя employee_real (если есть)
        employee_real = db.query(User).filter(User.username == 'employee_real').first()
        if employee_real:
            employee_real.organization = "Сервис-Интегратор ООО"
            employee_real.department = "ДТ МОСКВА"
            employee_real.full_name = "Сергеев Сергей Сергеевич"
            print(f"\n✅ Обновлен пользователь {employee_real.username}:")
            print(f"  Организация: {employee_real.organization}")
            print(f"  Подразделение: {employee_real.department}")
            print(f"  ФИО: {employee_real.full_name}")

        db.commit()
        print("\n✅ Все пользователи обновлены!")

    except Exception as e:
        print(f"❌ Ошибка при обновлении пользователей: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_test_users()
