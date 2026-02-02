from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)
from sqlalchemy import func, and_, or_
from typing import List, Dict, Optional
from uuid import UUID
import uuid
from datetime import datetime
from sqlalchemy import func
from decimal import Decimal

from app.database import get_db
from app.auth import get_current_user, require_deputy_director
from app.models import User, Request, CategoryKeyword, ApprovalProcess, TreasuryNotification
from app.routes.notifications import (
    create_batch_for_approval_notification,
    create_batch_processed_notification_for_employee,
    create_batch_treasury_notification_for_deputy
)
from app.schemas import NotificationType
from app.schemas import (
    PivotTableRequest,
    PivotTableResponse,
    ApprovalRequest,
    CategoryStats
)

router = APIRouter()

class ApprovalCommentResponse(BaseModel):
    """Ответ с комментариями процесса согласования"""
    has_comment: bool = Field(..., description="Есть ли комментарий")
    treasury_comment: Optional[str] = Field(None, description="Комментарий казначейства")
    approval_process_id: Optional[UUID] = Field(None, description="ID процесса согласования")
    comment: Optional[str] = Field(None, description="Комментарий заместителя (для казначейства)")
    category: Optional[str] = Field(None, description="Категория процесса")
    is_general: bool = Field(False, description="Является ли общим комментарием")

@router.get("/categories", response_model=Dict[str, CategoryStats])
async def get_categories_stats(
    current_user: User = Depends(require_deputy_director),
    db: Session = Depends(get_db)
):
    """
    Получение статистики по категориям для отображения на кнопках
    """
    # Заявки со статусом 'pending' (на согласовании)
    base_query = db.query(Request).filter(Request.status == 'approved_for_payment')

    stats = {}

    # 1. Питание, проживание, аренда, связь
    pitanie_count = base_query.filter(
        Request.employee_category == 'pitanie_projivanie',
        Request.source == 'employee'
    ).count()

    pitanie_amount = base_query.filter(
        Request.employee_category == 'pitanie_projivanie',
        Request.source == 'employee'
    ).with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0

    stats['pitanie_projivanie'] = CategoryStats(
        count=pitanie_count,
        total_amount=float(pitanie_amount),
        label="Питание, проживание, аренда, связь"
    )

    # 2. Графики
    graphs_count = base_query.filter(
        Request.treasury_import_type == 'graphs',
        Request.source == 'treasury'
    ).count()

    graphs_amount = base_query.filter(
        Request.treasury_import_type == 'graphs',
        Request.source == 'treasury'
    ).with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0

    stats['graphs'] = CategoryStats(
        count=graphs_count,
        total_amount=float(graphs_amount),
        label="Графики"
    )

    # 3. Утверждено генеральным директором
    approved_count = base_query.filter(
        Request.treasury_import_type == 'approved_by_director',
        Request.source == 'treasury'
    ).count()

    approved_amount = base_query.filter(
        Request.treasury_import_type == 'approved_by_director',
        Request.source == 'treasury'
    ).with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0

    stats['approved_by_director'] = CategoryStats(
        count=approved_count,
        total_amount=float(approved_amount),
        label="Утверждено генеральным директором"
    )

    # 4. Непереносимые оплаты
    non_transferable_count = base_query.filter(
        Request.treasury_import_type == 'non_transferable',
        Request.source == 'treasury'
    ).count()

    non_transferable_amount = base_query.filter(
        Request.treasury_import_type == 'non_transferable',
        Request.source == 'treasury'
    ).with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0

    stats['non_transferable'] = CategoryStats(
        count=non_transferable_count,
        total_amount=float(non_transferable_amount),
        label="Непереносимые оплаты"
    )

    # 5. Филиалы
    filialy_query = base_query.filter(
        or_(
            Request.employee_category == 'filialy',
            and_(
                Request.employee_category.is_(None),
                Request.source == 'employee',
                Request.treasury_import_type.is_(None)
            )
        )
    )

    filialy_count = filialy_query.count()
    filialy_amount = filialy_query.with_entities(
        func.coalesce(func.sum(Request.amount), 0)
    ).scalar() or 0

    stats['filialy'] = CategoryStats(
        count=filialy_count,
        total_amount=float(filialy_amount),
        label="Филиалы"
    )

    # 6. Все оплаты
    all_count = base_query.count()
    all_amount = base_query.with_entities(
        func.coalesce(func.sum(Request.amount), 0)
    ).scalar() or 0

    stats['all'] = CategoryStats(
        count=all_count,
        total_amount=float(all_amount),
        label="Все оплаты"
    )

    return stats

@router.post("/pivot-table", response_model=PivotTableResponse)
async def get_pivot_table(
    request: PivotTableRequest,
    current_user: User = Depends(require_deputy_director),
    db: Session = Depends(get_db)
):
    """
    Получение сводной таблицы для выбранной категории
    """
    category = request.category

    # Базовый запрос для заявок в статусе 'approved_for_payment'
    base_query = db.query(Request).filter(Request.status == 'approved_for_payment')

    # Применяем фильтр по категории
    if category == 'all':
        # Все заявки
        query = base_query
    elif category == 'pitanie_projivanie':
        query = base_query.filter(
            Request.employee_category == 'pitanie_projivanie',
            Request.source == 'employee'
        )
    elif category == 'graphs':
        query = base_query.filter(
            Request.treasury_import_type == 'graphs',
            Request.source == 'treasury'
        )
    elif category == 'approved_by_director':
        query = base_query.filter(
            Request.treasury_import_type == 'approved_by_director',
            Request.source == 'treasury'
        )
    elif category == 'non_transferable':
        query = base_query.filter(
            Request.treasury_import_type == 'non_transferable',
            Request.source == 'treasury'
        )
    elif category == 'filialy':
        query = base_query.filter(
            or_(
                Request.employee_category == 'filialy',
                and_(
                    Request.employee_category.is_(None),
                    Request.source == 'employee',
                    Request.treasury_import_type.is_(None)
                )
            )
        )
    else:
        raise HTTPException(status_code=400, detail=f"Неизвестная категория: {category}")

    # Получаем все заявки
    requests = query.all()

    if not requests:
        return PivotTableResponse(
            rows=[],
            total_row={"department_totals": {}, "grand_total": 0},
            departments=[],
            category=category
        )

    # Собираем уникальные департаменты
    departments = sorted(list(set([req.department for req in requests if req.department])))

    # Группируем по организациям и контрагентам
    org_data = {}
    for req in requests:
        org = req.organization or "Без организации"
        recipient = req.recipient or "Без контрагента"

        if org not in org_data:
            org_data[org] = {
                'recipients': {},
                'department_totals': {dept: 0 for dept in departments}
            }

        if recipient not in org_data[org]['recipients']:
            org_data[org]['recipients'][recipient] = {
                'department_amounts': {dept: 0 for dept in departments},
                'total': 0
            }

        # Добавляем сумму в департамент
        dept = req.department or "Без департамента"
        if dept in departments:
            amount = float(req.amount) if req.amount else 0
            org_data[org]['recipients'][recipient]['department_amounts'][dept] += amount
            org_data[org]['recipients'][recipient]['total'] += amount
            org_data[org]['department_totals'][dept] += amount

    # Формируем строки для таблиции
    rows = []
    department_totals = {dept: 0 for dept in departments}
    grand_total = 0

    for org, org_info in org_data.items():
        # Строка организации
        org_row = {
            'type': 'organization',
            'organization': org,
            'department_amounts': org_info['department_totals'],
            'total': sum(org_info['department_totals'].values())
        }
        rows.append(org_row)

        # Строки контрагентов
        for recipient, recipient_info in org_info['recipients'].items():
            recipient_row = {
                'type': 'recipient',
                'organization': org,
                'recipient': recipient,
                'department_amounts': recipient_info['department_amounts'],
                'total': recipient_info['total']
            }
            rows.append(recipient_row)

            # Обновляем итоги по департаментам
            for dept in departments:
                department_totals[dept] += recipient_info['department_amounts'][dept]
                grand_total += recipient_info['department_amounts'][dept]

    # Итоговая строка
    total_row = {
        'department_totals': department_totals,
        'grand_total': grand_total
    }

    return PivotTableResponse(
        rows=rows,
        total_row=total_row,
        departments=departments,
        category=category
    )

@router.post("/approve")
async def approve_requests(
    approval_request: ApprovalRequest,
    current_user: User = Depends(require_deputy_director),
    db: Session = Depends(get_db)
):
    """
    Согласование выбранных заявок заместителем директора
    """
    try:
        selected_categories = approval_request.selection.selected_categories
        selected_recipients = approval_request.selection.selected_recipients

        if not selected_categories and not selected_recipients:
            raise HTTPException(status_code=400, detail="Не выбраны категории или контрагенты для согласования")

        # Базовый запрос для заявок в статусе 'approved_for_payment'
        base_query = db.query(Request).filter(Request.status == 'approved_for_payment')

        request_ids = []

        # Фильтр по выбранным категориям
        if selected_categories:
            category_filters = []
            has_all_category = False
            
            for cat_selection in selected_categories:
                if cat_selection.category == 'all':
                    # Запомним, что выбрана категория 'all'
                    has_all_category = True
                elif cat_selection.category == 'pitanie_projivanie':
                    category_filters.append(and_(
                        Request.employee_category == 'pitanie_projivanie',
                        Request.source == 'employee'
                    ))
                elif cat_selection.category == 'graphs':
                    category_filters.append(and_(
                        Request.treasury_import_type == 'graphs',
                        Request.source == 'treasury'
                    ))
                elif cat_selection.category == 'approved_by_director':
                    category_filters.append(and_(
                        Request.treasury_import_type == 'approved_by_director',
                        Request.source == 'treasury'
                    ))
                elif cat_selection.category == 'non_transferable':
                    category_filters.append(and_(
                        Request.treasury_import_type == 'non_transferable',
                        Request.source == 'treasury'
                    ))
                elif cat_selection.category == 'filialy':
                    category_filters.append(or_(
                        Request.employee_category == 'filialy',
                        and_(
                            Request.employee_category.is_(None),
                            Request.source == 'employee',
                            Request.treasury_import_type.is_(None)
                        )
                    ))

            if has_all_category:
                # Если выбрана категория 'all', берем все заявки
                cat_requests = base_query.all()
                request_ids.extend([str(req.id) for req in cat_requests])
            elif category_filters:
                cat_query = base_query.filter(or_(*category_filters))
                cat_requests = cat_query.all()
                request_ids.extend([str(req.id) for req in cat_requests])

        # Фильтр по выбранным контрагентам
        if selected_recipients:
            recipient_filters = []
            for rec_selection in selected_recipients:
                recipient_filters.append(and_(
                    Request.organization == rec_selection.organization,
                    Request.recipient == rec_selection.recipient
                ))

            if recipient_filters:
                rec_query = base_query.filter(or_(*recipient_filters))
                rec_requests = rec_query.all()
                request_ids.extend([str(req.id) for req in rec_requests])

        # Убираем дубликаты
        request_ids = list(set(request_ids))

        if not request_ids:
            raise HTTPException(status_code=400, detail="Не найдены заявки для выбранных критериев")

        # Обновляем статус заявок
        updated_count = db.query(Request).filter(
            Request.id.in_(request_ids)
        ).update(
            {"status": "for_payment", "paid_at": datetime.utcnow().date()},
            synchronize_session=False
        )

        # Получаем ID процессов согласования для обновления
        approval_processes = db.query(ApprovalProcess).filter(
            ApprovalProcess.request_ids.overlap(request_ids),
            ApprovalProcess.status == 'pending'
        ).all()

        for process in approval_processes:
            process.status = 'approved'
            process.approved_at = datetime.utcnow()
            process.comment = approval_request.comment

        db.commit()

        # Создаем уведомления для казначейства
        for process in approval_processes:
            # Создаем уведомление для казначейства
            from app.models import TreasuryNotification
            treasury_notification = TreasuryNotification(
                approval_process_id=process.id,
                category=process.category,
                deputy_name=current_user.full_name,
                comment=approval_request.comment,
                request_count=len(process.request_ids),
                total_amount=0.0
            )
            db.add(treasury_notification)

        db.commit()
        return {
            "message": f"Успешно согласовано {updated_count} заявок",
            "approved_count": updated_count
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Ошибка при согласовании заявок: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@router.get("/approval-info", response_model=ApprovalCommentResponse)
async def get_approval_info(
    category: str = Query(..., description="Категория заявок"),
    current_user: User = Depends(require_deputy_director),
    db: Session = Depends(get_db)
):
    """
    Получение информации о процессе согласования и комментариев для текущей категории
    """

    # Находим активные процессы согласования
    approval_processes = db.query(ApprovalProcess).filter(
        ApprovalProcess.deputy_id == current_user.id,
        ApprovalProcess.status == 'pending'
    ).all()

    if not approval_processes:
        return ApprovalCommentResponse(
            has_comment=False,
            treasury_comment=None,
            approval_process_id=None,
            comment=None,
            category=None,
            is_general=False
        )

    # Находим общий процесс (категория 'general')
    general_process = next((p for p in approval_processes if p.category == 'general'), None)

    # Находим процесс для запрошенной категории
    category_process = next((p for p in approval_processes if p.category == category), None)

    # Если запрашивается категория 'all' - показываем общий комментарий
    if category == 'all':
        if general_process and general_process.treasury_comment:
            return ApprovalCommentResponse(
                has_comment=True,
                treasury_comment=general_process.treasury_comment,
                approval_process_id=general_process.id,
                comment=general_process.comment,
                category=general_process.category,
                is_general=True
            )
        else:
            return ApprovalCommentResponse(
                has_comment=False,
                treasury_comment=None,
                approval_process_id=None,
                comment=None,
                category=None,
                is_general=False
            )

    # Для конкретной категории:
    # 1. Если есть процесс для этой категории И его комментарий отличается от общего - показываем его
    # 2. Иначе - не показываем комментарий (has_comment=False)
    if category_process and category_process.treasury_comment:
        # Проверяем, отличается ли комментарий от общего
        is_different_from_general = True
        if general_process and general_process.treasury_comment:
            # Если комментарий такой же как в общем процессе - считаем его общим
            is_different_from_general = (category_process.treasury_comment != general_process.treasury_comment)

        if is_different_from_general:
            # Это специальный комментарий для категории (из импорта особых заявок)
            return ApprovalCommentResponse(
                has_comment=True,
                treasury_comment=category_process.treasury_comment,
                approval_process_id=category_process.id,
                comment=category_process.comment,
                category=category_process.category,
                is_general=False
            )

    # Если дошли сюда - не показываем комментарий для этой категории
    return ApprovalCommentResponse(
        has_comment=False,
        treasury_comment=None,
        approval_process_id=None,
        comment=None,
        category=None,
        is_general=False
    )

@router.get("/active-processes", response_model=List[ApprovalCommentResponse])
async def get_active_processes_with_comments(
    current_user: User = Depends(require_deputy_director),
    db: Session = Depends(get_db)
):
    """
    Получение всех активных процессов согласования с комментариями казначейства
    для текущего заместителя
    """
    # Находим все активные процессы согласования для текущего заместителя
    approval_processes = db.query(ApprovalProcess).filter(
        ApprovalProcess.deputy_id == current_user.id,
        ApprovalProcess.status == 'pending',
        ApprovalProcess.treasury_comment.isnot(None)  # Только с комментариями казначейства
    ).all()

    if not approval_processes:
        return [ApprovalCommentResponse(
            has_comment=False,
            treasury_comment=None,
            approval_process_id=None,
            comment=None,
            category=None,
            is_general=False
        )]

    # Преобразуем в ответ
    result = []
    for process in approval_processes:
        result.append(ApprovalCommentResponse(
            has_comment=True,
            treasury_comment=process.treasury_comment,
            approval_process_id=process.id,
            comment=process.comment,
            category=process.category,
            is_general=(process.category == "general")
        ))

    return result
