import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { getTableColumns } from '../config/tableColumns';
import { useColumnSettings } from '../contexts/ColumnSettingsContext';
import { formatNumber } from '../utils/format';
import './TreasuryPending.css';

// Создаем инстанс axios
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Типы для узлов дерева
interface TreeNode {
  id: string;
  name: string;
  type: 'root' | 'organization' | 'department' | 'user' | 'import';
  count: number;
  amount: number;
  children: TreeNode[];
  import_id?: string;
  user_id?: string;
  organization?: string;
  department?: string;
}

// Тип для категории
interface Category {
  name: string;
  count: number;
  amount: number;
}

interface TreasuryPendingContext {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}

const TreasuryPending: React.FC = () => {
  // Получаем контекст из Layout
  const context = useOutletContext<TreasuryPendingContext>();
  const selectedNodeId = context?.selectedNodeId || null;

  // Состояние для выбранного узла
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // Состояние для категорий
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Состояние для сводной таблицы
  const [pivotData, setPivotData] = useState<any>(null);

  // Состояние для таблицы заявок
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingPivot, setLoadingPivot] = useState(false);

  // Комментарий для заместителя
  const [treasuryComment, setTreasuryComment] = useState('');

  // Роль пользователя и настройки колонок
  const [userRole, setUserRole] = useState<'employee' | 'deputy_director' | 'treasury'>('treasury');
  const { settings: columnSettings } = useColumnSettings();

  // Инициализация при монтировании
  useEffect(() => {
    console.log('TreasuryPending: Компонент смонтирован');
    const role = localStorage.getItem('userRole') || 'treasury';
    setUserRole(role as 'employee' | 'deputy_director' | 'treasury');
    loadCategories();
  }, []);

  // Загрузка категорий
  const loadCategories = async () => {
    try {
      const response = await api.get('/treasury/pending/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  // Загрузка данных при выборе узла
  useEffect(() => {
    console.log('TreasuryPending: selectedNodeId изменился:', selectedNodeId);
    if (selectedNodeId) {
      // Загружаем дерево, чтобы получить данные узла
      loadNodeData(selectedNodeId);
    } else {
      console.log('TreasuryPending: selectedNodeId null, сбрасываем состояние');
      setSelectedNode(null);
      setPivotData(null);
      setRequests([]);
      setSelectedCategory(null);
    }
  }, [selectedNodeId]);

  // Загрузка данных при выборе категории
  const handleCategorySelect = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    try {
      setLoadingRequests(true);
      const response = await api.get('/treasury/pending/requests', {
        params: { category: categoryName }
      });
      setRequests(response.data);
      setSelectedRows([]);
    } catch (error) {
      console.error('Ошибка загрузки заявок по категории:', error);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadNodeData = async (nodeId: string) => {
    try {
      setLoading(true);
      // Загружаем все дерево и находим узел
      const response = await api.get('/treasury/pending/tree');
      const findNode = (node: TreeNode): TreeNode | null => {
        if (node.id === nodeId) return node;
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
        return null;
      };
      
      const foundNode = findNode(response.data);
      if (foundNode) {
        console.log('TreasuryPending: Найден узел:', foundNode);
        setSelectedNode(foundNode);
        loadRequestsByNode(foundNode);
        loadPivotByNode(foundNode);
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('TreasuryPending: Ошибка загрузки узла:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequestsByNode = async (node: TreeNode) => {
    try {
      setLoadingRequests(true);
      console.log('TreasuryPending: loadRequestsByNode для узла:', node.id, node.type);
      
      // Формируем параметры для запроса
      const params: any = {
        node_id: node.id,
        node_type: node.type
      };
      
      if (node.organization) params.organization = node.organization;
      if (node.department) params.department = node.department;
      if (node.user_id) params.user_id = node.user_id;
      if (node.import_id) params.import_id = node.import_id;
      
      const response = await api.get('/treasury/pending/filter-by-node', { params });
      setRequests(response.data);
      setSelectedRows([]);
      console.log('TreasuryPending: Загружено заявок:', response.data.length);
    } catch (error) {
      console.error('TreasuryPending: Ошибка загрузки заявок:', error);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadPivotByNode = async (node: TreeNode) => {
    try {
      setLoadingPivot(true);
      console.log('TreasuryPending: loadPivotByNode для узла:', node.id, node.type);
      
      const data = {
        node_type: node.type,
        organization: node.organization,
        department: node.department,
        user_id: node.user_id,
        import_id: node.import_id
      };
      
      const response = await api.post('/treasury/pending/pivot-by-node', data);
      setPivotData(response.data);
      console.log('TreasuryPending: Сводная таблица загружена');
    } catch (error) {
      console.error('TreasuryPending: Ошибка загрузки сводной таблицы:', error);
      setPivotData(null);
    } finally {
      setLoadingPivot(false);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRows(prev =>
      prev.includes(rowId)
        ? prev.filter(id => id !== rowId)
        : [...prev, rowId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === requests.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(requests.map(request => request.id));
    }
  };

  const handleSendToDeputy = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите хотя бы одну заявку для отправки');
      return;
    }

    if (!treasuryComment.trim()) {
      alert('Введите комментарий для заместителя');
      return;
    }

    if (!window.confirm(`Отправить ${selectedRows.length} заявок на финальное согласование заместителю?`)) {
      return;
    }

    try {
      // Используем FormData для отправки данных
      const formData = new FormData();
      selectedRows.forEach(id => {
        formData.append('request_ids', id);
      });
      formData.append('treasury_comment', treasuryComment);

      await api.post('/treasury/pending/send-to-deputy', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert(`Успешно отправлено ${selectedRows.length} заявок на финальное согласование`);

      // Перезагружаем данные
      if (selectedNode) {
        loadRequestsByNode(selectedNode);
        loadPivotByNode(selectedNode);
      }
      if (selectedCategory) {
        handleCategorySelect(selectedCategory);
      }
      
      setSelectedRows([]);
      setTreasuryComment('');
    } catch (error: any) {
      console.error('Ошибка отправки заявок:', error);
      alert(error.response?.data?.detail || 'Ошибка отправки заявок');
    }
  };

  const handleRejectRequests = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите хотя бы одну заявку для отклонения');
      return;
    }

    if (!window.confirm(`Отклонить ${selectedRows.length} выбранных заявок?`)) {
      return;
    }

    try {
      // Используем FormData для отправки данных
      const formData = new FormData();
      selectedRows.forEach(id => {
        formData.append('request_ids', id);
      });

      await api.post('/treasury/pending/reject-requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert(`Успешно отклонено ${selectedRows.length} заявок`);

      // Перезагружаем данные
      if (selectedNode) {
        loadRequestsByNode(selectedNode);
        loadPivotByNode(selectedNode);
      }
      if (selectedCategory) {
        handleCategorySelect(selectedCategory);
      }
      
      setSelectedRows([]);
    } catch (error: any) {
      console.error('Ошибка отклонения заявок:', error);
      alert(error.response?.data?.detail || 'Ошибка отклонения заявок');
    }
  };

  const handleDeleteRequests = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите хотя бы одну заявку для удаления');
      return;
    }

    if (!window.confirm(`Удалить ${selectedRows.length} выбранных заявок? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await api.post('/treasury/pending/delete-requests', {
        request_ids: selectedRows
      });

      alert(`Успешно удалено ${selectedRows.length} заявок`);

      // Перезагружаем данные
      if (selectedNode) {
        loadRequestsByNode(selectedNode);
        loadPivotByNode(selectedNode);
      }
      if (selectedCategory) {
        handleCategorySelect(selectedCategory);
      }
      
      setSelectedRows([]);
    } catch (error: any) {
      console.error('Ошибка удаления заявок:', error);
      alert(error.response?.data?.detail || 'Ошибка удаления заявок');
    }
  };

  // Получаем колонки для таблицы
  const tableColumns = getTableColumns();

  if (loading) {
    return <div className="treasury-pending-loading">Загрузка данных...</div>;
  }

  const getNodeTitle = (node: TreeNode | null): string => {
    if (!node) return 'Выберите узел в дереве навигации';
    
    switch (node.type) {
      case 'root': return 'Все заявки';
      case 'organization': return `Организация: ${node.name}`;
      case 'department': return `Подразделение: ${node.name} (${node.organization})`;
      case 'user': return `Пользователь: ${node.name} (${node.department})`;
      case 'import': return `Импорт: ${node.name}`;
      default: return node.name;
    }
  };

  return (
    <div className="treasury-pending-page">
      <div className="page-header">
        <h1>Заявки на согласовании в казначействе</h1>
        {selectedNode && (
          <div className="current-node-info">
            <span className="node-title">{getNodeTitle(selectedNode)}</span>
            <span className="node-stats">
              {selectedNode.count} заявок, {formatNumber(selectedNode.amount)} ₽
            </span>
          </div>
        )}
      </div>

      <div className="main-work-area">
        {/* Категории */}
        <div className="category-blocks-section">
          <h3>Категории</h3>
          <div className="category-blocks">
            {categories.map(category => (
              <div
                key={category.name}
                className={`category-block ${selectedCategory === category.name ? 'selected' : ''}`}
                onClick={() => handleCategorySelect(category.name)}
              >
                <div className="category-name">{category.name}</div>
                <div className="category-stats">
                  <span className="category-count">{category.count} заявок</span>
                  <span className="category-amount">{formatNumber(category.amount)} ₽</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Сводная таблица */}
        {selectedNode && (
          <div className="pivot-section">
            <h3>Сводная таблица</h3>

            {loadingPivot ? (
              <div className="loading">Загрузка сводной таблицы...</div>
            ) : pivotData ? (
              <div className="pivot-table-container">
                <table className="pivot-table">
                  <thead>
                    <tr>
                      <th>Организация</th>
                      {pivotData.departments.map((dept: string) => (
                        <th key={dept}>{dept}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pivotData.rows.map((row: any) => (
                      <tr key={row.organization}>
                        <td className="pivot-org">{row.organization}</td>
                        {pivotData.departments.map((dept: string) => (
                          <td key={dept} className="pivot-amount">
                            {row.departments[dept] ? formatNumber(row.departments[dept]) : '0,00'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">Нет данных для сводной таблицы</div>
            )}
          </div>
        )}

        {/* Управление отправкой на финальное согласование и удалением */}
        <div className="send-to-deputy-section">
          <div className="selection-info">
            <span>Выбрано заявок: {selectedRows.length} из {requests.length}</span>
            <button onClick={handleSelectAll} className="select-all-btn">
              {selectedRows.length === requests.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>

          <div className="comment-and-send">
            <textarea
              placeholder="Введите комментарий для заместителя..."
              value={treasuryComment}
              onChange={(e) => setTreasuryComment(e.target.value)}
              className="treasury-comment-input"
              rows={3}
            />
            <div className="action-buttons">
              <button
                onClick={handleDeleteRequests}
                disabled={selectedRows.length === 0}
                className="delete-requests-btn"
              >
                Удалить заявки ({selectedRows.length})
              </button>
              <button
                onClick={handleRejectRequests}
                disabled={selectedRows.length === 0}
                className="reject-requests-btn"
              >
                Отклонить заявки ({selectedRows.length})
              </button>
              <button
                onClick={handleSendToDeputy}
                disabled={selectedRows.length === 0 || !treasuryComment.trim()}
                className="send-to-deputy-btn"
              >
                Отправить на финальное согласование ({selectedRows.length})
              </button>
            </div>
          </div>
        </div>

        {/* Таблица с заявками */}
        <div className="requests-table-section">
          <h3>
            {selectedNode ? getNodeTitle(selectedNode) : 
             selectedCategory ? `Категория: ${selectedCategory}` : 
             'Выберите категорию или узел в дереве навигации'}
          </h3>

          {!selectedNode && !selectedCategory ? (
            <div className="no-node-selected">
              <p>Пожалуйста, выберите категорию выше или узел в дереве навигации слева.</p>
              <p>Дерево навигации доступно только для пользователей с ролью "Казначейство".</p>
            </div>
          ) : loadingRequests ? (
            <div className="loading">Загрузка заявок...</div>
          ) : requests.length === 0 ? (
            <div className="no-data">Нет заявок для отображения</div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={requests}
              selectedRows={selectedRows}
              onRowSelect={handleRowSelect}
              onSelectAll={handleSelectAll}
              currentUserRole={userRole}
              columnSettings={columnSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TreasuryPending;
