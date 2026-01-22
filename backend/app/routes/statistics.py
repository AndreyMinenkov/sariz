from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import date, datetime, timedelta
from typing import List, Optional
import xlsxwriter
from io import BytesIO
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.models import Request, User, ApprovalProcess
from app.auth import get_current_user, require_role
from app.schemas import RequestStatus, Category

router = APIRouter()

# Вспомогательные функции
def get_statistics_data(
    db: Session,
    user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    group_by: str = "article",
    status_filter: Optional[str] = None
):
    """
    Получение агрегированных данных для статистики
    """
    # Базовый запрос в зависимости от роли
    if user.role == "employee":
        # Сотрудник: только свои заявки, исключаем черновики
        base_query = db.query(Request).filter(
            Request.created_by == user.id,
            Request.status != RequestStatus.DRAFT.value
        )
    elif user.role == "deputy_director":
        # Заместитель: все заявки (кроме черновиков)
        base_query = db.query(Request).filter(
            Request.status != RequestStatus.DRAFT.value
        )
    elif user.role == "treasury":
        # Казначейство: все заявки, исключая черновики
        base_query = db.query(Request).filter(
            Request.status != RequestStatus.DRAFT.value
        )
    else:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    # Фильтр по статусу, если указан
    if status_filter:
        base_query = base_query.filter(Request.status == status_filter)

    # Фильтр по дате создания заявки (created_at) вместо paid_at
    if start_date:
        base_query = base_query.filter(Request.created_at >= start_date)
    if end_date:
        base_query = base_query.filter(Request.created_at <= end_date)

    # Определяем поле для группировки
    group_by_field = None
    if group_by == "article":
        group_by_field = Request.article
    elif group_by == "organization":
        group_by_field = Request.organization
    elif group_by == "department":
        group_by_field = Request.department
    elif group_by == "recipient":
        group_by_field = Request.recipient
    else:
        raise HTTPException(status_code=400, detail="Некорректный параметр группировки")

    # Выполняем группировку и агрегацию
    query = base_query.with_entities(
        group_by_field.label("group"),
        func.count(Request.id).label("count"),
        func.sum(Request.amount).label("total_amount")
    )

    results = query.group_by(group_by_field).order_by(func.sum(Request.amount).desc()).all()

    # Форматируем результат
    return [
        {
            "group": item.group,
            "count": item.count,
            "total_amount": float(item.total_amount) if item.total_amount else 0.0
        }
        for item in results
    ]

def get_detailed_requests(
    db: Session,
    user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    group_by: str = "article",
    group_value: Optional[str] = None,
    status_filter: Optional[str] = None
):
    """
    Получение детальных заявок для статистики
    """
    # Базовый запрос в зависимости от роли
    if user.role == "employee":
        # Сотрудник: только свои заявки, исключаем черновики
        query = db.query(Request).filter(
            Request.created_by == user.id,
            Request.status != RequestStatus.DRAFT.value
        )
    elif user.role == "deputy_director":
        # Заместитель: все заявки (кроме черновиков)
        query = db.query(Request).filter(
            Request.status != RequestStatus.DRAFT.value
        )
    elif user.role == "treasury":
        # Казначейство: все заявки, исключая черновики
        query = db.query(Request).filter(
            Request.status != RequestStatus.DRAFT.value
        )
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    # Фильтр по статусу, если указан
    if status_filter:
        query = query.filter(Request.status == status_filter)

    # Фильтр по дате создания заявки (created_at)
    if start_date:
        query = query.filter(Request.created_at >= start_date)
    if end_date:
        query = query.filter(Request.created_at <= end_date)

    # Фильтр по значению группы
    if group_value:
        if group_by == "article":
            query = query.filter(Request.article == group_value)
        elif group_by == "organization":
            query = query.filter(Request.organization == group_value)
        elif group_by == "department":
            query = query.filter(Request.department == group_value)
        elif group_by == "recipient":
            query = query.filter(Request.recipient == group_value)

    # Получаем заявки
    requests = query.order_by(Request.created_at.desc()).all()

    # Форматируем результат
    return requests

# Endpoint для получения данных дашборда
@router.get("/dashboard")
async def get_statistics_dashboard(
    start_date: Optional[date] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    group_by: str = Query("article", description="Поле для группировки: article, organization, department, recipient"),
    status: Optional[str] = Query(None, description="Фильтр по статусу заявки"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение данных для дашборда статистики
    """
    try:
        data = get_statistics_data(db, current_user, start_date, end_date, group_by, status)

        # Общая статистика
        total_count = sum(item["count"] for item in data)
        total_amount = sum(item["total_amount"] for item in data)

        return {
            "user_role": current_user.role,
            "group_by": group_by,
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            },
            "total": {
                "count": total_count,
                "amount": total_amount
            },
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint для получения детальных заявок
@router.get("/details")
async def get_statistics_details(
    start_date: Optional[date] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    group_by: str = Query("article", description="Поле для группировки: article, organization, department, recipient"),
    group_value: Optional[str] = Query(None, description="Конкретное значение группы (например, название статьи)"),
    status: Optional[str] = Query(None, description="Фильтр по статусу заявки"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение детального списка заявок для статистики
    """
    try:
        requests = get_detailed_requests(db, current_user, start_date, end_date, group_by, group_value, status)

        # Форматируем результат
        return [
            {
                "id": str(req.id),
                "article": req.article,
                "amount": req.amount,
                "recipient": req.recipient,
                "request_number": req.request_number,
                "request_date": req.request_date.isoformat() if req.request_date else None,
                "status": req.status,
                "organization": req.organization,
                "department": req.department,
                "purpose": req.purpose,
                "payment_date": req.payment_date.isoformat() if req.payment_date else None,
                "applicant": req.applicant,
                "category": req.category,
                "paid_at": req.paid_at.isoformat() if req.paid_at else None,
                "created_at": req.created_at.isoformat() if req.created_at else None,
                "created_by": str(req.created_by) if current_user.role in ["deputy_director", "treasury"] else None
            }
            for req in requests
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint для экспорта в Excel
@router.get("/export")
async def export_statistics_to_excel(
    start_date: Optional[date] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    group_by: str = Query("article", description="Поле для группировки: article, organization, department, recipient"),
    status: Optional[str] = Query(None, description="Фильтр по статусу заявки"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Экспорт статистики и детальных данных в Excel
    """
    try:
        # Получаем агрегированные данные
        aggregated_data = get_statistics_data(db, current_user, start_date, end_date, group_by, status)

        # Получаем детальные данные
        detailed_requests = get_detailed_requests(db, current_user, start_date, end_date, group_by, None, status)

        # Создаем Excel файл в памяти с помощью xlsxwriter
        output = BytesIO()

        # Создаем workbook
        with xlsxwriter.Workbook(output, {'in_memory': True}) as workbook:
            # Лист со статистикой
            if aggregated_data:
                stats_sheet = workbook.add_worksheet('Статистика')
                # Заголовки
                headers = ['Группа', 'Количество', 'Общая сумма']
                for col, header in enumerate(headers):
                    stats_sheet.write(0, col, header)

                # Данные
                for row, item in enumerate(aggregated_data, start=1):
                    stats_sheet.write(row, 0, item['group'])
                    stats_sheet.write(row, 1, item['count'])
                    stats_sheet.write_number(row, 2, item['total_amount'])

                # Форматирование суммы как денежного значения
                money_format = workbook.add_format({'num_format': '#,##0.00'})
                stats_sheet.set_column(2, 2, 15, money_format)

            # Лист с детальными данными
            if detailed_requests:
                details_sheet = workbook.add_worksheet('Детальные данные')
                # Определяем заголовки
                detail_headers = [
                    "Статья ДДС", "Сумма", "Получатель", "Номер заявки",
                    "Дата заявки", "Статус", "Организация", "Подразделение", "Назначение",
                    "Дата оплаты (план)", "Дата оплаты (факт)", "Заявитель", "Категория"
                ]

                # Добавляем поле "Создатель" для заместителя и казначейства
                if current_user.role in ["deputy_director", "treasury"]:
                    detail_headers.append("Создатель")

                # Записываем заголовки
                for col, header in enumerate(detail_headers):
                    details_sheet.write(0, col, header)

                # Записываем данные
                for row, req in enumerate(detailed_requests, start=1):
                    details_sheet.write(row, 0, req.article)
                    details_sheet.write_number(row, 1, req.amount)
                    details_sheet.write(row, 2, req.recipient)
                    details_sheet.write(row, 3, req.request_number)
                    details_sheet.write(row, 4, req.request_date.strftime('%d.%m.%Y %H:%M:%S') if req.request_date else '')
                    details_sheet.write(row, 5, req.status)
                    details_sheet.write(row, 6, req.organization)
                    details_sheet.write(row, 7, req.department)
                    details_sheet.write(row, 8, req.purpose)
                    details_sheet.write(row, 9, req.payment_date.strftime('%d.%m.%Y') if req.payment_date else '')
                    details_sheet.write(row, 10, req.paid_at.strftime('%d.%m.%Y') if req.paid_at else '')
                    details_sheet.write(row, 11, req.applicant)
                    details_sheet.write(row, 12, req.category)

                    # Добавляем создателя для определенных ролей
                    col_index = 13
                    if current_user.role in ["deputy_director", "treasury"]:
                        creator = db.query(User).filter(User.id == req.created_by).first()
                        details_sheet.write(row, 13, creator.full_name if creator else "Неизвестно")
                        col_index = 14

                # Форматирование столбца с суммой
                money_format = workbook.add_format({'num_format': '#,##0.00'})
                details_sheet.set_column(1, 1, 15, money_format)

                # Автоматическая ширина столбцов
                for col in range(col_index):
                    details_sheet.set_column(col, col, 20)

        output.seek(0)

        # Формируем имя файла
        filename = f"statistics_{current_user.role}_{current_user.username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при экспорте: {str(e)}")

# Подключаем маршруты статистики для всех ролей
@router.get("/available-groupings")
async def get_available_groupings(current_user: User = Depends(get_current_user)):
    """
    Получение доступных полей для группировки
    """
    return [
        {"value": "article", "label": "Статья ДДС"},
        {"value": "organization", "label": "Организация"},
        {"value": "department", "label": "Подразделение"},
        {"value": "recipient", "label": "Контрагент (получатель)"}
    ]

@router.get("/available-statuses")
async def get_available_statuses(current_user: User = Depends(get_current_user)):
    """
    Получение доступных статусов для фильтрации
    """
    return [
        {"value": "pending", "label": "На согласовании"},
        {"value": "approved_for_payment", "label": "Согласовано в оплату"},
        {"value": "for_payment", "label": "Оплачено"},
        {"value": "rejected", "label": "Отклонено"}
    ]

@router.get("/user-info")
async def get_user_info(current_user: User = Depends(get_current_user)):
    """
    Получение информации о текущем пользователе для статистики
    """
    return {
        "role": current_user.role,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "organization": current_user.organization,
        "department": current_user.department
    }
