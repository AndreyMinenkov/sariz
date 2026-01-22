"""
Утилиты для категоризации заявок
"""
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import re
from app.models import Request, CategoryKeyword

def categorize_request(request: Request, db: Session) -> None:
    """
    Автоматическая категоризация заявки
    
    Логика:
    1. Если source = 'employee' → определяем employee_category
    2. Если source = 'treasury' → treasury_import_type уже должен быть установлен при импорте
    """
    if request.source == 'employee':
        request.employee_category = determine_employee_category(request, db)
        # Сохраняем изменения в БД
        db.add(request)
        db.commit()
        db.refresh(request)
    elif request.source == 'treasury':
        # Для казначейства категория уже должна быть установлена при импорте
        # Если нет, устанавливаем по умолчанию
        if not request.treasury_import_type:
            request.treasury_import_type = 'non_transferable'
            db.add(request)
            db.commit()
            db.refresh(request)

def determine_employee_category(request: Request, db: Session) -> Optional[str]:
    """
    Определение категории для заявок от сотрудников
    
    Возвращает:
    - 'pitanie_projivanie' если найдены ключевые слова
    - 'filialy' если не найдены ключевые слова
    - None если не удалось определить
    """
    # Получаем все ключевые слова для категории pitanie_projivanie
    keywords = db.query(CategoryKeyword).filter(
        CategoryKeyword.category == 'pitanie_projivanie'
    ).all()
    
    if not keywords:
        return 'filialy'
    
    # Текст для анализа (объединяем article и purpose)
    text_to_analyze = f"{request.article or ''} {request.purpose or ''}".lower()
    
    # Проверяем наличие ключевых слов
    for keyword_obj in keywords:
        keyword = keyword_obj.keyword.lower()
        
        # Простой поиск подстроки (можно улучшить)
        if keyword in text_to_analyze:
            return 'pitanie_projivanie'
    
    # Если ключевые слова не найдены
    return 'filialy'

def get_requests_by_category(
    db: Session, 
    category: str,
    source: Optional[str] = None
) -> List[Request]:
    """
    Получение заявок по категории для кабинета заместителя
    
    Категории:
    - 'pitanie_projivanie' - Питание, проживание, аренда, связь
    - 'graphs' - Графики
    - 'approved_by_director' - Утверждено генеральным директором
    - 'non_transferable' - Непереносимые оплаты
    - 'filialy' - Филиалы
    - 'all' - Все оплаты
    """
    query = db.query(Request).filter(Request.status == 'pending')  # На согласовании
    
    if category == 'all':
        # Все заявки со статусом pending
        pass
    elif category == 'pitanie_projivanie':
        query = query.filter(
            Request.employee_category == 'pitanie_projivanie',
            Request.source == 'employee'
        )
    elif category == 'graphs':
        query = query.filter(
            Request.treasury_import_type == 'graphs',
            Request.source == 'treasury'
        )
    elif category == 'approved_by_director':
        query = query.filter(
            Request.treasury_import_type == 'approved_by_director',
            Request.source == 'treasury'
        )
    elif category == 'non_transferable':
        query = query.filter(
            Request.treasury_import_type == 'non_transferable',
            Request.source == 'treasury'
        )
    elif category == 'filialy':
        query = query.filter(
            (Request.employee_category == 'filialy') |
            (
                (Request.employee_category.is_(None)) &
                (Request.source == 'employee') &
                (Request.treasury_import_type.is_(None))
            )
        )
    
    if source:
        query = query.filter(Request.source == source)
    
    return query.all()

def update_request_categories(db: Session) -> Dict[str, int]:
    """
    Обновление категорий для всех заявок
    Возвращает статистику по обновленным категориям
    """
    requests = db.query(Request).all()
    stats = {
        'pitanie_projivanie': 0,
        'filialy': 0,
        'total_updated': 0
    }
    
    for request in requests:
        old_category = request.employee_category
        categorize_request(request, db)
        
        if request.employee_category != old_category:
            stats['total_updated'] += 1
            
            if request.employee_category == 'pitanie_projivanie':
                stats['pitanie_projivanie'] += 1
            elif request.employee_category == 'filialy':
                stats['filialy'] += 1
    
    db.commit()
    return stats
