from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import uuid

from app.database import get_db
from app.models import Request, User
from app.routes.notifications import create_batch_for_approval_notification
from app.schemas import RequestCreate, RequestUpdate, RequestResponse, RequestStatus, BulkStatusUpdate, BulkDelete
from app.auth import get_current_user, require_employee, require_deputy_director, require_treasury

router = APIRouter()

@router.get("", response_model=List[RequestResponse])
@router.get("/", response_model=List[RequestResponse])
async def get_requests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[RequestStatus] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение списка заявок с фильтрацией
    """
    query = db.query(Request)

    # Фильтрация по пользователю (сотрудники видят только свои заявки)
    if current_user.role == "employee":
        query = query.filter(Request.created_by == current_user.id)

    # Применение фильтров
    if status:
        query = query.filter(Request.status == status)

    if category:
        query = query.filter(Request.category == category)

    if start_date:
        query = query.filter(Request.created_at >= start_date)

    if end_date:
        query = query.filter(Request.created_at <= end_date)

    # Сортировка и пагинация
    requests = query.order_by(Request.created_at.desc()).offset(skip).limit(limit).all()

    return requests

@router.post("/", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    request_data: RequestCreate,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db)
):
    """
    Создание новой заявки
    """
    request = Request(
        **request_data.dict(),
        created_by=current_user.id,
        id=uuid.uuid4()
    )
    
    db.add(request)
    # Создаем уведомление для заместителя о новой заявке (если это не черновик)
    if request_data.status != "draft":
        # Находим заместителя для этой категории заявок
        # Пока отправляем уведомление первому найденному заместителю
        deputy = db.query(User).filter(
            User.role == "deputy_director",
            User.is_active == True
        ).first()

        if deputy:
                # Получаем все новые заявки в этой категории за последний час
                from datetime import datetime, timedelta
                hour_ago = datetime.utcnow() - timedelta(hours=1)
                new_requests = db.query(Request).filter(
                    Request.category == request_data.category,
                    Request.status == "pending",
                    Request.created_at >= hour_ago
                ).all()
            
                # Отправляем уведомление если есть новые заявки
                if new_requests:
                    # Рассчитываем общую сумму
                    total_amount = sum([req.amount for req in new_requests])
            
                    # Создаем пакетное уведомление
                    create_batch_for_approval_notification(
                        db=db,
                        deputy_id=deputy.id,
                        import_id=None,  # Нет импорта для одиночных заявок
                        request_count=len(new_requests),
                        categories=[request_data.category],
                        total_amount=total_amount,
                        imported_by_user=current_user
                    )
    db.commit()
    db.refresh(request)
    
    return request

@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение конкретной заявки
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверка прав доступа
    if current_user.role == "employee" and request.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра этой заявки"
        )
    
    return request

@router.put("/{request_id}", response_model=RequestResponse)
async def update_request(
    request_id: uuid.UUID,
    request_data: RequestUpdate,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db)
):
    """
    Обновление заявки
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверка прав доступа
    if request.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования этой заявки"
        )
    
    # Можно редактировать только черновики
    if request.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Можно редактировать только черновики"
        )
    
    # Обновление полей
    for field, value in request_data.dict(exclude_unset=True).items():
        setattr(request, field, value)
    
    request.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(request)
    
    return request

@router.post("/bulk/status")
async def bulk_update_status(
    bulk_data: BulkStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Массовое обновление статуса заявок
    """
    if current_user.role == "employee":
        # Сотрудник может отправлять только свои заявки на согласование
        for request_id in bulk_data.request_ids:
            request = db.query(Request).filter(Request.id == request_id).first()
            if request and request.created_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Недостаточно прав для обновления заявки {request_id}"
                )
    
    # Обновление статуса
    updated_count = 0
    for request_id in bulk_data.request_ids:
        request = db.query(Request).filter(Request.id == request_id).first()
        if request:
            request.status = bulk_data.status
            request.updated_at = datetime.utcnow()
            updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Статус {updated_count} заявок обновлен",
        "updated_count": updated_count
    }

@router.post("/bulk/delete")
async def bulk_delete_requests(
    bulk_data: BulkDelete,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db)
):
    """
    Массовое удаление заявок
    """
    deleted_count = 0
    
    for request_id in bulk_data.request_ids:
        request = db.query(Request).filter(Request.id == request_id).first()
        
        if request:
            # Проверка прав доступа
            if request.created_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Недостаточно прав для удаления заявки {request_id}"
                )
            
            # Можно удалять только черновики
            if request.status != "draft":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Можно удалять только черновики. Заявка {request_id} имеет статус {request.status}"
                )
            
            db.delete(request)
            deleted_count += 1
    
    db.commit()
    
    return {
        "message": f"Удалено {deleted_count} заявок",
        "deleted_count": deleted_count
    }
