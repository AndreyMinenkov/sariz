from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime
import pytz
import openpyxl
from io import BytesIO

from app.database import get_db
from app.models import Import, Request, User
from app.schemas import ImportCreate, ImportResponse, RequestCreate, ImportType, Category
from app.auth import get_current_user, require_employee
from app.utils.categorization import categorize_request
import logging
from app.utils.excel_processor import process_excel_file
from app.routes.notifications import create_batch_for_approval_notification

router = APIRouter()

@router.get("/", response_model=List[ImportResponse])
async def get_imports(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение истории импортов пользователя
    """
    imports = db.query(Import).filter(
        Import.user_id == current_user.id
    ).order_by(Import.created_at.desc()).offset(skip).limit(limit).all()
    
    return imports

@router.post("/excel", response_model=ImportResponse)
async def import_excel(
    payment_date: str = Form(...),
    comment: str = Form(None),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db)
):
    """
    Импорт заявок из Excel файлов
    """
    # Валидация количества файлов
    logger = logging.getLogger(__name__)
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Максимальное количество файлов за одну загрузку: 10"
        )
    
    # Создание записи об импорте
    db_import = Import(
        user_id=current_user.id,
        file_name=", ".join([f.filename for f in files]),
        file_size=sum([f.size for f in files]),
        payment_date=datetime.strptime(payment_date, "%Y-%m-%d").date(),
        comment=comment,
        status="processing"
    )
    
    db.add(db_import)
    db.commit()
    db.refresh(db_import)
    
    imported_count = 0
    skipped_count = 0
    errors = []
    
    try:
        for file in files:
            # Валидация размера файла
            if file.size > 5 * 1024 * 1024:  # 5 MB
                errors.append(f"Файл {file.filename} превышает лимит 5 МБ")
                skipped_count += 1
                continue
            
            # Чтение содержимого файла
            content = await file.read()
            
            try:
                # Обработка Excel файла
                logger.info(f"Processing file {file.filename}, size: {len(content)} bytes")
                requests_data = process_excel_file(content)
                logger.info(f"Processed {len(requests_data)} rows from file {file.filename}")
                
                # Создание заявок
                for request_data in requests_data:
                    try:
                        db_request = Request(
                            article=request_data.get("Статья ДДС", ""),
                            amount=float(request_data.get("Сумма", 0)),
                            recipient=request_data.get("Получатель", ""),
                            request_number=request_data.get("Номер заявки", ""),
                            request_date=pytz.timezone('Europe/Moscow').localize(datetime.strptime(
                                request_data.get("Дата заявки", "2024-01-01"),
                                "%d.%m.%Y %H:%M:%S"
                            )),
                            organization=request_data.get("Организация", ""),
                            department=request_data.get("Подразделение", ""),
                            purpose=request_data.get("Назначение", ""),
                            applicant=request_data.get("Заявитель", current_user.full_name),
                            category="subdivisions",  # По умолчанию
                            import_type="regular",
                            created_by=current_user.id,
                            import_id=db_import.id,
                            source='treasury' if current_user.role == 'treasury' else 'employee',
                            status="draft"
                        )

                        
                        db.add(db_request)

                        # Автоматическая категоризация
                        categorize_request(db_request, db)

                        logger.info(f"Created request: {db_request.request_number}, amount: {db_request.amount}")
                        imported_count += 1
                        
                    except Exception as e:
                        errors.append(f"Ошибка при обработке строки в файле {file.filename}: {str(e)}")
                        skipped_count += 1
                
            except Exception as e:
                errors.append(f"Ошибка при обработке файла {file.filename}: {str(e)}")
                skipped_count += 1
        
        # Обновление статуса импорта
        db_import.status = "completed"
        db_import.imported_count = imported_count
        db_import.skipped_count = skipped_count
        
        if errors:
            db_import.error_message = "; ".join(errors[:5])  # Сохраняем первые 5 ошибок
        
        db.commit()
        

        # Создание пакетного уведомления для заместителя
        try:
            # Получаем всех заместителей
            deputies = db.query(User).filter(User.role == "deputy_director").all()
            
            # Получаем статистику по импортированным заявкам
            imported_requests = db.query(Request).filter(Request.import_id == db_import.id).all()
            
            if imported_requests:
                # Рассчитываем общую сумму
                total_amount = sum([req.amount for req in imported_requests])
                
                # Собираем уникальные категории
                categories = list(set([req.category for req in imported_requests]))
                
                # Отправляем уведомление каждому заместителю
                for deputy in deputies:
                    create_batch_for_approval_notification(
                        db=db,
                        deputy_id=deputy.id,
                        import_id=db_import.id,
                        request_count=len(imported_requests),
                        categories=categories,
                        total_amount=total_amount,
                        imported_by_user=current_user
                    )
                
                logger.info(f"Создано пакетное уведомление для заместителей о {len(imported_requests)} заявках")
        except Exception as e:
            logger.error(f"Ошибка при создании уведомления: {str(e)}")
            # Не прерываем импорт из-за ошибки уведомления
    except Exception as e:
        # В случае общей ошибки
        db_import.status = "failed"
        db_import.error_message = str(e)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при импорте: {str(e)}"
        )
    
    return db_import

@router.get("/{import_id}", response_model=ImportResponse)
async def get_import(
    import_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение информации об конкретном импорте
    """
    import_record = db.query(Import).filter(
        Import.id == import_id,
        Import.user_id == current_user.id
    ).first()
    
    if not import_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Импорт не найден"
        )
    
    return import_record

@router.post("/validate-excel")
async def validate_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db)
):
    """
    Валидация Excel файла перед импортом
    """
    # Валидация размера файла
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл превышает лимит 5 МБ"
        )
    
    content = await file.read()
    
    try:
        # Проверка структуры файла
        workbook = openpyxl.load_workbook(filename=BytesIO(content), read_only=True)
        worksheet = workbook.active
        
        # Проверка заголовков
        headers = []
        for cell in worksheet[1]:
            headers.append(cell.value)
        
        required_headers = ["Статья ДДС", "Сумма", "Получатель", "Номер заявки", "Дата заявки"]
        
        missing_headers = [h for h in required_headers if h not in headers]
        if missing_headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"В файле отсутствуют обязательные колонки: {', '.join(missing_headers)}"
            )
        
        # Подсчет строк
        row_count = 0
        total_amount = 0
        
        for row in worksheet.iter_rows(min_row=2, values_only=True):
            if any(row):  # Пропуск пустых строк
                row_count += 1
                
                # Проверка суммы
                try:
                    amount = float(row[headers.index("Сумма")] or 0)
                    total_amount += amount
                except:
                    pass
        
        # Проверка лимита строк
        if row_count > 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Файл содержит {row_count} строк, что превышает лимит 200 строк"
            )
        
        # Проверка лимита суммы
        if total_amount > 500000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Общая сумма заявок ({total_amount:,.2f} руб.) превышает лимит 500,000 руб."
            )
        
        workbook.close()
        
        return {
            "valid": True,
            "filename": file.filename,
            "row_count": row_count,
            "total_amount": total_amount,
            "message": "Файл прошел валидацию"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка при валидации файла: {str(e)}"
        )
