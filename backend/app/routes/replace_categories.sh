#!/bin/bash

# Находим начало и конец функции
START_LINE=$(grep -n "async def get_pending_categories_stats" treasury.py | cut -d: -f1)
END_LINE=$(grep -n "@router.post(\"/pending/pivot-table\")" treasury.py | cut -d: -f1)

echo "Начало функции: $START_LINE, Конец: $END_LINE"

# Создаем новую функцию
cat > /tmp/new_function.py << 'FUNC_EOF'
async def get_pending_categories_stats(
    import_id: Optional[str] = None,
    current_user: User = Depends(require_treasury),
    db: Session = Depends(get_db)
):
    """
    Получение статистики по категориям для выбранного импорта
    Используется та же логика, что и в кабинете заместителя
    """
    # Базовый запрос для заявок в статусе 'pending'
    query = db.query(Request).filter(Request.status == 'pending')

    if import_id:
        query = query.filter(Request.import_id == uuid.UUID(import_id))

    categories = []
    
    # Определяем цвета для категорий
    colors = {
        'pitanie_projivanie': '#EF4444',      # Красный
        'filialy': '#3B82F6',                 # Синий
        'graphs': '#F59E0B',                  # Оранжевый
        'approved_by_director': '#8B5CF6',    # Фиолетовый
        'non_transferable': '#10B981',        # Зеленый
        'all': '#6B7280'                      # Серый
    }
    
    # Названия категорий (как в кабинете заместителя)
    names = {
        'pitanie_projivanie': 'Питание, проживание, связь, аренда',
        'filialy': 'Подразделения',
        'graphs': 'Графики',
        'approved_by_director': 'Утверждено генеральным директором',
        'non_transferable': 'Непереносимые оплаты',
        'all': 'Все заявки'
    }

    # 1. Питание, проживание, аренда, связь (заявки от сотрудников)
    pitanie_query = query.filter(
        Request.employee_category == 'pitanie_projivanie',
        Request.source == 'employee'
    )
    pitanie_count = pitanie_query.count()
    pitanie_amount = pitanie_query.with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0
    
    categories.append({
        'id': 'pitanie_projivanie',
        'name': names['pitanie_projivanie'],
        'count': pitanie_count,
        'amount': float(pitanie_amount),
        'color': colors['pitanie_projivanie']
    })

    # 2. Графики (особые заявки из казначейства)
    graphs_query = query.filter(
        Request.treasury_import_type == 'graphs',
        Request.source == 'treasury'
    )
    graphs_count = graphs_query.count()
    graphs_amount = graphs_query.with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0
    
    categories.append({
        'id': 'graphs',
        'name': names['graphs'],
        'count': graphs_count,
        'amount': float(graphs_amount),
        'color': colors['graphs']
    })

    # 3. Утверждено генеральным директором (особые заявки из казначейства)
    approved_query = query.filter(
        Request.treasury_import_type == 'approved_by_director',
        Request.source == 'treasury'
    )
    approved_count = approved_query.count()
    approved_amount = approved_query.with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0
    
    categories.append({
        'id': 'approved_by_director',
        'name': names['approved_by_director'],
        'count': approved_count,
        'amount': float(approved_amount),
        'color': colors['approved_by_director']
    })

    # 4. Непереносимые оплаты (особые заявки из казначейства)
    non_transferable_query = query.filter(
        Request.treasury_import_type == 'non_transferable',
        Request.source == 'treasury'
    )
    non_transferable_count = non_transferable_query.count()
    non_transferable_amount = non_transferable_query.with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0
    
    categories.append({
        'id': 'non_transferable',
        'name': names['non_transferable'],
        'count': non_transferable_count,
        'amount': float(non_transferable_amount),
        'color': colors['non_transferable']
    })

    # 5. Подразделения (заявки от сотрудников, не относящиеся к питанию/проживанию)
    filialy_query = query.filter(
        Request.source == 'employee'
    ).filter(
        or_(
            Request.employee_category == 'filialy',
            Request.employee_category.is_(None)
        )
    )
    filialy_count = filialy_query.count()
    filialy_amount = filialy_query.with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0
    
    categories.append({
        'id': 'filialy',
        'name': names['filialy'],
        'count': filialy_count,
        'amount': float(filialy_amount),
        'color': colors['filialy']
    })

    # 6. Все заявки (сумма всех категорий)
    all_count = query.count()
    all_amount = query.with_entities(func.coalesce(func.sum(Request.amount), 0)).scalar() or 0
    
    categories.append({
        'id': 'all',
        'name': names['all'],
        'count': all_count,
        'amount': float(all_amount),
        'color': colors['all']
    })

    return categories
FUNC_EOF

# Создаем новый файл
head -n $((START_LINE - 1)) treasury.py > /tmp/treasury_new.py
cat /tmp/new_function.py >> /tmp/treasury_new.py
tail -n +$((END_LINE)) treasury.py >> /tmp/treasury_new.py

# Заменяем оригинальный файл
mv treasury.py treasury.py.backup_before_categories
mv /tmp/treasury_new.py treasury.py

# Проверяем и добавляем импорт or_ если нужно
if ! grep -q "from sqlalchemy import.*or_\|from sqlalchemy import or_" treasury.py; then
    echo "Добавляем импорт or_..."
    sed -i 's/from sqlalchemy import func/from sqlalchemy import func, or_/' treasury.py
fi

echo "Функция get_pending_categories_stats успешно обновлена!"
