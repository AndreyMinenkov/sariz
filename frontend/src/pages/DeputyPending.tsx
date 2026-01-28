import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './DeputyPending.css';

// Типы для данных
interface CategoryStats {
  count: number;
  total_amount: number;
  label: string;
}

interface PivotTableRow {
  type: 'organization' | 'recipient' | 'total';
  organization?: string;
  recipient?: string;
  department_amounts?: Record<string, number>;
  department_totals?: Record<string, number>;
  total?: number;
  grand_total?: number;
  is_expanded?: boolean;
}

interface PivotTableResponse {
  rows: PivotTableRow[];
  total_row: {
    department_totals: Record<string, number>;
    grand_total: number;
  };
  departments: string[];
  category: string;
}

// Типы для выбора
interface CategorySelection {
  category: string;
  selected: boolean;
}

interface RecipientSelection {
  organization: string;
  recipient: string;
  selected: boolean;
}

const DeputyPending: React.FC = () => {
  const [categories, setCategories] = useState<Record<string, CategoryStats>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pivotData, setPivotData] = useState<PivotTableResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrganizations, setExpandedOrganizations] = useState<Set<string>>(new Set());
  
  // Состояние для выбора
  const [selectedCategories, setSelectedCategories] = useState<CategorySelection[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientSelection[]>([]);
  const [approvalComment, setApprovalComment] = useState<string>('');
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);

  // Категории в порядке отображения
  const categoryOrder = [
    'pitanie_projivanie',
    'graphs',
    'approved_by_director',
    'non_transferable',
    'filialy',
    'all'
  ];

  // Определяем класс таблицы на основе количества столбцов
  const tableClassName = useMemo(() => {
    if (!pivotData) return 'pivot-table';
    const columnCount = pivotData.departments.length;
    if (columnCount > 10) return 'pivot-table many-columns';
    if (columnCount > 6) return 'pivot-table many-columns';
    return 'pivot-table';
  }, [pivotData]);

  // Загрузка статистики категорий
  const loadCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/approval/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCategories(response.data);
      
      // Инициализируем выбор категорий
      const initialCategories: CategorySelection[] = categoryOrder.map(cat => ({
        category: cat,
        selected: false
      }));
      setSelectedCategories(initialCategories);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      setError('Не удалось загрузить статистику категорий');
    }
  }, []);

  // Загрузка данных сводной таблицы
  const loadPivotTable = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/approval/pivot-table',
        { category },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPivotData(response.data);
      // Сбрасываем развернутые организации при смене категории
      setExpandedOrganizations(new Set());
      
      // Инициализируем выбор контрагентов для этой категории
      const recipients: RecipientSelection[] = [];
      response.data.rows.forEach((row: PivotTableRow) => {
        if (row.type === 'recipient' && row.organization && row.recipient) {
          recipients.push({
            organization: row.organization,
            recipient: row.recipient,
            selected: false
          });
        }
      });
      setSelectedRecipients(recipients);
    } catch (err) {
      console.error('Ошибка загрузки сводной таблицы:', err);
      setError('Не удалось загрузить данные сводной таблицы');
    } finally {
      setLoading(false);
    }
  }, []);

  // Первоначальная загрузка
  useEffect(() => {
    loadCategories();
    loadPivotTable(selectedCategory);
  }, [loadCategories, loadPivotTable, selectedCategory]);

  // Обработчик выбора категории
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  // Обработчик выбора категории чекбоксом
  const handleCategoryCheckboxChange = (categoryKey: string) => {
    setSelectedCategories(prev => 
      prev.map(cat => 
        cat.category === categoryKey 
          ? { ...cat, selected: !cat.selected }
          : cat
      )
    );
  };

  // Обработчик выбора контрагента
  const handleRecipientCheckboxChange = (organization: string, recipient: string) => {
    setSelectedRecipients(prev =>
      prev.map(rec =>
        rec.organization === organization && rec.recipient === recipient
          ? { ...rec, selected: !rec.selected }
          : rec
      )
    );
  };

  // Обработчик разворачивания/сворачивания организации
  const toggleOrganization = (organization: string) => {
    const newExpanded = new Set(expandedOrganizations);
    if (newExpanded.has(organization)) {
      newExpanded.delete(organization);
    } else {
      newExpanded.add(organization);
    }
    setExpandedOrganizations(newExpanded);
  };

  // Форматирование суммы
  const formatAmount = (amount: number | string) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(typeof amount === "string" ? parseFloat(amount) || 0 : amount);
  };

  // Генерация автоматического комментария
  const generateAutoComment = useCallback(() => {
    const selectedCatLabels = selectedCategories
      .filter(cat => cat.selected)
      .map(cat => categories[cat.category]?.label || cat.category);
    
    const selectedRecLabels = selectedRecipients
      .filter(rec => rec.selected)
      .map(rec => `${rec.recipient} (${rec.organization})`);
    
    let comment = '';
    
    if (selectedCatLabels.length > 0) {
      comment += `Платим категории: ${selectedCatLabels.join(', ')}`;
    }
    
    if (selectedRecLabels.length > 0) {
      if (comment) comment += ' и ';
      comment += `заявки: ${selectedRecLabels.join(', ')}`;
    }
    
    if (!comment) {
      comment = 'Согласование заявок';
    }
    
    return comment;
  }, [selectedCategories, selectedRecipients, categories]);

  // Обновление комментария при изменении выбора
  useEffect(() => {
    const comment = generateAutoComment();
    setApprovalComment(comment);
  }, [selectedCategories, selectedRecipients, generateAutoComment]);

  // Подсчет выбранных элементов
  const selectedCategoriesCount = useMemo(() => 
    selectedCategories.filter(cat => cat.selected).length,
    [selectedCategories]
  );

  const selectedRecipientsCount = useMemo(() => 
    selectedRecipients.filter(rec => rec.selected).length,
    [selectedRecipients]
  );

  // Обработчик согласования
  const handleApprove = async () => {
    if (selectedCategoriesCount === 0 && selectedRecipientsCount === 0) {
      alert('Выберите категории или контрагентов для согласования');
      return;
    }

    const approvalData = {
      selection: {
        selected_categories: selectedCategories.filter(cat => cat.selected),
        selected_recipients: selectedRecipients.filter(rec => rec.selected)
      },
      comment: approvalComment
    };

    try {
      const response = await axios.post('/api/approval/approve', approvalData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert(response.data.message);
      setShowApprovalModal(false);
      
      // Сбрасываем выбор
      setSelectedCategories(prev => prev.map(cat => ({ ...cat, selected: false })));
      setSelectedRecipients(prev => prev.map(rec => ({ ...rec, selected: false })));
      
      // Перезагружаем данные
      loadCategories();
      loadPivotTable(selectedCategory);
    } catch (err) {
      console.error('Ошибка согласования:', err);
      alert('Ошибка при согласовании заявок');
    }
  };

  // Рендер строки таблицы
  const renderTableRow = (row: PivotTableRow, index: number) => {
    if (row.type === 'organization') {
      const isExpanded = expandedOrganizations.has(row.organization || '');
      const orgRecipients = selectedRecipients.filter(
        rec => rec.organization === row.organization
      );
      const allSelected = orgRecipients.length > 0 && 
        orgRecipients.every(rec => rec.selected);
      const someSelected = orgRecipients.length > 0 && 
        orgRecipients.some(rec => rec.selected) && !allSelected;
      
      return (
        <React.Fragment key={`org-${index}`}>
          <tr className="organization-row">
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="expand-button"
                  onClick={() => toggleOrganization(row.organization || '')}
                  aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                  title={isExpanded ? 'Свернуть' : 'Развернуть'}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={() => {
                    // Переключаем все контрагенты этой организации
                    const newRecipients = [...selectedRecipients];
                    newRecipients.forEach(rec => {
                      if (rec.organization === row.organization) {
                        rec.selected = !allSelected;
                      }
                    });
                    setSelectedRecipients(newRecipients);
                  }}
                  title={allSelected ? 'Снять выбор со всех' : 'Выбрать всех контрагентов'}
                />
                <strong>{row.organization}</strong>
              </div>
            </td>
            {pivotData?.departments.map(dept => (
              <td key={dept} className="amount-cell">
                <strong>{formatAmount(row.department_amounts?.[dept] || 0)}</strong>
              </td>
            ))}
            <td className="amount-cell total-column">
              <strong>{formatAmount(row.total || 0)}</strong>
            </td>
          </tr>
          
          {isExpanded && pivotData?.rows
            .filter(r => r.type === 'recipient' && r.organization === row.organization)
            .map((recipientRow, idx) => renderTableRow(recipientRow, idx + 1000))}
        </React.Fragment>
      );
    }

    if (row.type === 'recipient') {
      const isSelected = selectedRecipients.some(
        rec => rec.organization === row.organization && rec.recipient === row.recipient && rec.selected
      );
      
      return (
        <tr key={`recipient-${index}`} className="recipient-row">
          <td className="recipient-cell">
            <div style={{ paddingLeft: '50px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleRecipientCheckboxChange(row.organization || '', row.recipient || '')}
                title={isSelected ? 'Снять выбор' : 'Выбрать контрагента'}
              />
              <span>{row.recipient}</span>
            </div>
          </td>
          {pivotData?.departments.map(dept => (
            <td key={dept} className="amount-cell">
              {formatAmount(row.department_amounts?.[dept] || 0)}
            </td>
          ))}
          <td className="amount-cell total-column">
            {formatAmount(row.total || 0)}
          </td>
        </tr>
      );
    }

    if (row.type === 'total') {
      return (
        <tr key="total" className="total-row">
          <td>
            <strong>ОБЩИЙ ИТОГО</strong>
          </td>
          {pivotData?.departments.map(dept => (
            <td key={dept} className="amount-cell">
              <strong>{formatAmount(row.department_totals?.[dept] || 0)}</strong>
            </td>
          ))}
          <td className="amount-cell total-column">
            <strong>{formatAmount(row.grand_total || 0)}</strong>
          </td>
        </tr>
      );
    }

    return null;
  };

  // Рендер кнопок категорий с чекбоксами
  const renderCategoryTabs = () => {
    return categoryOrder.map(categoryKey => {
      const category = categories[categoryKey];
      if (!category) return null;

      const categorySelection = selectedCategories.find(cat => cat.category === categoryKey);
      const isSelected = categorySelection?.selected || false;

      return (
        <div key={categoryKey} className="category-tab-container">
          <button
            className={`category-tab ${selectedCategory === categoryKey ? 'active' : ''}`}
            onClick={() => handleCategorySelect(categoryKey)}
            title={`${category.label}: ${category.count} заявок на сумму ${formatAmount(category.total_amount)} ₽`}
          >
            <div className="category-header">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  handleCategoryCheckboxChange(categoryKey);
                }}
                onClick={(e) => e.stopPropagation()}
                title={isSelected ? 'Снять выбор категории' : 'Выбрать всю категорию'}
              />
              <div className="category-name">{category.label}</div>
            </div>
            <div className="category-stats">
              <span className="count">{category.count} заявок</span>
              <span className="amount">{formatAmount(category.total_amount)} ₽</span>
            </div>
          </button>
        </div>
      );
    });
  };

  return (
    <div className="deputy-pending">
      <header className="pending-header">
        <h1>Кабинет заместителя директора</h1>
        <div className="header-actions">
          <div className="selection-info">
            Выбрано: {selectedCategoriesCount} категорий, {selectedRecipientsCount} контрагентов
          </div>
          <button
            className="approve-button"
            disabled={selectedCategoriesCount === 0 && selectedRecipientsCount === 0}
            onClick={() => setShowApprovalModal(true)}
            title={
              selectedCategoriesCount === 0 && selectedRecipientsCount === 0 
                ? 'Выберите категории или контрагентов для согласования' 
                : `Согласовать ${selectedCategoriesCount} категорий и ${selectedRecipientsCount} контрагентов`
            }
          >
            Согласовать выбранное
          </button>
        </div>
      </header>

      {/* Панель категорий */}
      <div className="category-tabs">
        {renderCategoryTabs()}
      </div>

      {/* Основное содержание */}
      <div className="pending-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Загрузка данных...</div>
        ) : pivotData ? (
          <div className="pivot-table-container">
            <div className="table-header">
              <h2>
                {categories[selectedCategory]?.label || 'Сводная таблица'}
                {pivotData.departments.length > 6 && (
                  <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '10px' }}>
                    ({pivotData.departments.length} подразделений)
                  </span>
                )}
              </h2>
              <div className="table-info">
                {pivotData.rows.filter(r => r.type === 'organization').length} организаций, 
                {pivotData.rows.filter(r => r.type === 'recipient').length} контрагентов
              </div>
            </div>

            <div className="table-wrapper">
              <table className={tableClassName}>
                <thead>
                  <tr>
                    <th style={{ width: '350px' }}>Организация / Контрагент</th>
                    {pivotData.departments.map(dept => (
                      <th key={dept} title={dept}>{dept}</th>
                    ))}
                    <th className="total-column" title="Итого по строке">ИТОГО</th>
                  </tr>
                </thead>
                <tbody>
                  {pivotData.rows
                    .filter(row => row.type === 'organization')
                    .map((row, index) => renderTableRow(row, index))}
                  
                  {/* Итоговая строка */}
                  {pivotData.total_row && renderTableRow({
                    type: 'total',
                    department_totals: pivotData.total_row.department_totals,
                    grand_total: pivotData.total_row.grand_total
                  }, 9999)}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="no-data">Нет данных для отображения</div>
        )}
      </div>

      {/* Модальное окно согласования */}
      {showApprovalModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Согласование заявок</h3>
            
            <div className="selection-summary">
              <h4>Сводка по выбору:</h4>
              {selectedCategoriesCount > 0 && (
                <div className="selected-categories">
                  <strong>Выбранные категории:</strong>
                  <ul>
                    {selectedCategories
                      .filter(cat => cat.selected)
                      .map(cat => (
                        <li key={cat.category}>
                          {categories[cat.category]?.label || cat.category}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              
              {selectedRecipientsCount > 0 && (
                <div className="selected-recipients">
                  <strong>Выбранные контрагенты:</strong>
                  <ul>
                    {selectedRecipients
                      .filter(rec => rec.selected)
                      .map((rec, idx) => (
                        <li key={idx}>
                          {rec.recipient} ({rec.organization})
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="comment">Комментарий для казначейства:</label>
              <textarea
                id="comment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Введите комментарий для казначейства..."
                rows={6}
                autoFocus
              />
              <div className="comment-hint">
                Система сформировала комментарий автоматически. Вы можете отредактировать его.
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowApprovalModal(false);
                }}
              >
                Отмена
              </button>
              <button
                className="confirm-button"
                onClick={handleApprove}
                disabled={!approvalComment.trim()}
              >
                Отправить на оплату
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeputyPending;
