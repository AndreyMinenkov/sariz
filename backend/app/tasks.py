from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import Import, Request
import openpyxl
from io import BytesIO
from datetime import datetime
import traceback

@celery_app.task(bind=True, max_retries=3)
def process_excel_import_task(self, import_id):
    """
    Фоновая задача для обработки импорта Excel файлов
    """
    db = SessionLocal()
    
    try:
        import_record = db.query(Import).filter(Import.id == import_id).first()
        if not import_record:
            return {"status": "error", "message": "Import record not found"}
        
        # Обновляем статус импорта
        import_record.status = "processing"
        db.commit()
        
        # Здесь будет логика обработки Excel файла
        # В реальном приложении здесь будет чтение файла из хранилища
        
        # Имитация обработки
        import_record.status = "completed"
        import_record.imported_count = 10  # Примерное количество
        db.commit()
        
        return {"status": "success", "import_id": str(import_id)}
        
    except Exception as e:
        # В случае ошибки
        if import_record:
            import_record.status = "failed"
            import_record.error_message = str(e)
            db.commit()
        
        # Повторная попытка
        raise self.retry(exc=e, countdown=60)
    
    finally:
        db.close()

@celery_app.task
def cleanup_old_imports():
    """
    Очистка старых записей об импорте
    """
    db = SessionLocal()
    
    try:
        # Удаление записей старше 30 дней
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        deleted_count = db.query(Import).filter(
            Import.created_at < cutoff_date,
            Import.status.in_(["completed", "failed"])
        ).delete()
        
        db.commit()
        
        return {"deleted_count": deleted_count}
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()

@celery_app.task
def update_request_statistics():
    """
    Обновление статистики по заявкам
    """
    db = SessionLocal()
    
    try:
        from sqlalchemy import func
        
        # Статистика по статусам
        status_stats = db.query(
            Request.status,
            func.count(Request.id).label('count'),
            func.sum(Request.amount).label('total_amount')
        ).group_by(Request.status).all()
        
        # Здесь можно сохранить статистику в кэш или отдельную таблицу
        
        return {
            "status_stats": [
                {"status": stat.status, "count": stat.count, "total_amount": float(stat.total_amount or 0)}
                for stat in status_stats
            ]
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()
