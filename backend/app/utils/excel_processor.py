import openpyxl
from io import BytesIO
from typing import List, Dict
import re

def process_excel_file_optimized(file_content: bytes, max_rows: int = 500) -> List[Dict]:
    """Оптимизированная обработка Excel файлов для сервера с ограниченными ресурсами"""
    import logging
    logger = logging.getLogger(__name__)

    # Проверка размера файла
    if len(file_content) > 5 * 1024 * 1024:  # 5 MB
        raise ValueError("Файл превышает лимит 5 МБ")

    # Использование режима read_only для экономии памяти
    workbook = openpyxl.load_workbook(
        filename=BytesIO(file_content),
        read_only=True,
        data_only=True
    )

    worksheet = workbook.active
    data = []

    # Чтение заголовков для определения индексов столбцов
    headers = []
    for cell in worksheet[1]:  # Первая строка - заголовки
        headers.append(str(cell.value).strip() if cell.value else "")

    # Логирование найденных заголовков для отладки - ВЫВОДИМ В КОНСОЛЬ
    print(f"=== EXCEL ПАРСИНГ: НАЙДЕНЫ ЗАГОЛОВКИ ===")
    for i, header in enumerate(headers):
        print(f"Столбец {i}: '{header}'")
    logger.debug(f"Найдены заголовки в Excel файле: {headers}")

    # Определяем индексы нужных столбцов
    column_indices = {}
    target_columns = {
        'Статья ДДС': ['Статья движения денежных средств', 'Статья ДДС'],
        'Сумма': ['Сумма'],
        'Получатель': ['Получатель'],
        'Номер заявки': ['Заявка', 'Номер заявки'],
        'Дата заявки': ['Дата заявки'],
        'Статус': ['Статус'],
        'Организация': ['Организация'],
        'Подразделение': ['Подразделение'],
        'Приоритет': ['Приоритет'],
        'Назначение': ['Назначение платежа', 'Назначение'],
        'Дата оплаты': ['Дата оплаты'],
        'Заявитель': ['Заявитель']
    }

    # Логирование для отладки соответствия столбцов
    print(f"=== EXCEL ПАРСИНГ: ПОИСК СТОЛБЦОВ ===")
    logger.debug(f"Ищем столбцы по шаблонам: {target_columns}")
    for target_name, possible_names in target_columns.items():
        found = False
        for i, header in enumerate(headers):
            header_lower = header.lower().strip()
            for possible_name in possible_names:
                possible_lower = possible_name.lower().strip()
                # Проверяем точное совпадение или частичное (если заголовок содержит ключевые слова)
                if (header_lower == possible_lower or
                    possible_lower in header_lower or
                    any(word in header_lower for word in possible_lower.split())):
                    column_indices[target_name] = i
                    found = True
                    print(f"Найден столбец '{target_name}' как столбец {i}: '{header}'")
                    break
            if found:
                break
        if not found:
            print(f"ВНИМАНИЕ: Столбец '{target_name}' не найден! Возможные имена: {possible_names}")
            logger.warning(f"Столбец '{target_name}' не найден. Возможные имена: {possible_names}")
            # Если столбец не найден, используем -1
            column_indices[target_name] = -1
    
    print(f"=== EXCEL ПАРСИНГ: РЕЗУЛЬТАТЫ ===")
    for field_name, col_index in column_indices.items():
        if col_index >= 0:
            print(f"{field_name}: столбец {col_index} ('{headers[col_index] if col_index < len(headers) else 'N/A'}')")
        else:
            print(f"{field_name}: НЕ НАЙДЕН - будет пустое значение")
    print(f"=====================================")

    # Чтение данных
    for i, row in enumerate(worksheet.iter_rows(min_row=2, values_only=True), start=2):
        if i > max_rows + 1:
            raise ValueError(f"Файл содержит более {max_rows} строк")

        # Собираем данные по найденным индексам
        row_data = {}

        for field_name, col_index in column_indices.items():
            if col_index >= 0 and col_index < len(row):
                value = row[col_index]

                # Преобразование типов
                if field_name == 'Сумма':
                    try:
                        # Заменяем запятые на точки и убираем пробелы
                        if isinstance(value, str):
                            value = value.replace(',', '.').replace(' ', '')
                        row_data[field_name] = float(value or 0)
                    except (ValueError, TypeError):
                        row_data[field_name] = 0.0
                else:
                    row_data[field_name] = str(value or '').strip()
            else:
                row_data[field_name] = '' if field_name != 'Сумма' else 0.0

        # Пропуск пустых строк
        if not any(row_data.values()):
            continue

        data.append(row_data)

    workbook.close()

    if not data:
        raise ValueError("Файл не содержит данных или имеет неверный формат")

    print(f"=== EXCEL ПАРСИНГ: ЗАВЕРШЕНО ===")
    print(f"Обработано строк: {len(data)}")
    print(f"=====================================")
    
    return data

def process_excel_file(file_content: bytes, max_rows: int = 500) -> List[Dict]:
    """Основная функция обработки Excel (для обратной совместимости)"""
    return process_excel_file_optimized(file_content, max_rows)

def format_amount(value: float) -> str:
    """Форматирование числа"""
    # Вход: 9100.00
    # Выход: "9 100,00"
    integer_part = int(value)
    decimal_part = int(round((value - integer_part) * 100))

    formatted_integer = f"{integer_part:,}".replace(",", " ")
    return f"{formatted_integer},{decimal_part:02d}"

def format_date_time(date) -> str:
    """Формат: "09.10.2025 23:59:59" """
    from datetime import datetime
    if isinstance(date, str):
        return date
    return date.strftime("%d.%m.%Y %H:%M:%S")
