import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import DataTable from '../components/DataTable';
import ActionsPanel from '../components/ActionsPanel';
import { getTableColumns } from '../config/tableColumns';
import { useColumnSettings } from '../contexts/ColumnSettingsContext';

// Создаем инстанс axios с интерсепторами
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерсептор для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерсептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const TreasuryApproved: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deputyComment, setDeputyComment] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userRole, setUserRole] = useState<'employee' | 'deputy_director' | 'treasury'>('treasury');
  const location = useLocation();
  const { settings: columnSettings } = useColumnSettings();

  // Получение роли пользователя
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'treasury';
    setUserRole(role as 'employee' | 'deputy_director' | 'treasury');
  }, []);

  const fetchApprovedRequests = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/treasury/requests', { params });
      console.log('Заявки казначейства:', response.data.length);
      setRequests(response.data);
      setError(null);

      // TODO: Здесь нужно получить комментарий заместителя
      // Пока используем заглушку
      setDeputyComment('Заявки согласованы заместителем генерального директора для оплаты');

    } catch (err: any) {
      console.error('Ошибка загрузки заявок:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  // Обновляем данные при каждом показе страницы
  useEffect(() => {
    fetchApprovedRequests();
  }, [location.pathname, statusFilter]);

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

  const handleExportToExcel = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите заявки для экспорта');
      return;
    }

    try {
      const response = await api.post('/treasury/export', {
        request_ids: selectedRows,
        export_all: false
      });

      if (response.status === 200) {
        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'заявки_к_оплате.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err: any) {
      console.error('Ошибка экспорта:', err);
      alert(err.response?.data?.detail || 'Ошибка экспорта');
    }
  };

  const handleSendForApproval = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите заявки для отправки');
      return;
    }

    // Проверяем, что все выбранные заявки имеют статус "Черновик"
    const nonDraftRequests = requests.filter(request =>
      selectedRows.includes(request.id) && request.status !== 'draft'
    );

    if (nonDraftRequests.length > 0) {
      alert('Отправлять на согласование можно только заявки со статусом "Черновик"');
      return;
    }

    if (!window.confirm(`Отправить ${selectedRows.length} заявок на согласование?`)) {
      return;
    }

    try {
      const response = await api.post('/treasury/send-to-approval', {
        request_ids: selectedRows
      });

      if (response.status === 200) {
        alert('Заявки успешно отправлены на согласование');
        fetchApprovedRequests(); // Обновляем список
        setSelectedRows([]);
      }
    } catch (err: any) {
      console.error('Ошибка отправки на согласование:', err);
      alert(err.response?.data?.detail || 'Ошибка отправки на согласование');
    }
  };

  // Формируем колонки таблицы
  const tableColumns = getTableColumns();

  // Фильтр статусов
  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'draft', label: 'Черновик' },
    { value: 'pending', label: 'На согласовании' },
    { value: 'for_payment', label: 'К оплате' },
    { value: 'rejected', label: 'Отклонено' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Заголовок и фильтры */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ margin: 0, color: '#343a40', fontSize: '24px' }}>
          Заявки казначейства
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Фильтр по статусу */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#495057', fontSize: '14px', fontWeight: 500 }}>Статус:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #dee2e6',
                backgroundColor: 'white',
                color: '#495057',
                fontSize: '14px',
                minWidth: '180px'
              }}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Кнопка обновления */}
          <button
            onClick={fetchApprovedRequests}
            style={{
              padding: '6px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Обновить
          </button>
        </div>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '6px',
          fontSize: '14px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {/* Комментарий заместителя (если есть) */}
      {deputyComment && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          borderRadius: '6px',
          fontSize: '14px',
          border: '1px solid #bee5eb'
        }}>
          <strong>Комментарий заместителя:</strong>
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: 0, color: '#495057', fontSize: '14px', lineHeight: 1.5 }}>
              {deputyComment}
            </p>
          </div>
        </div>
      )}

      {/* Панель действий */}
      <ActionsPanel
        selectedRows={requests.filter(req => selectedRows.includes(req.id))}
        currentUserRole={userRole}
        onSendForApproval={handleSendForApproval}
        onExportSelected={handleExportToExcel}
      />

      {/* Информация о выборе */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        fontSize: '14px'
      }}>
        <div style={{ color: '#495057', fontWeight: 500 }}>
          Выбрано заявок: {selectedRows.length} из {requests.length}
        </div>

        {requests.length > 0 && (
          <div style={{ color: '#495057' }}>
            Общая сумма: {requests.reduce((sum, req) => sum + (req.amount || 0), 0).toFixed(2)} руб.
          </div>
        )}
      </div>

      {/* Загрузка */}
      {loading ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          borderRadius: '8px',
          fontSize: '16px',
          color: '#666'
        }}>
          Загрузка заявок...
        </div>
      ) : (
        /* Таблица заявок */
        <div style={{ flex: 1, overflow: 'auto' }}>
          <DataTable
            columns={tableColumns}
            data={requests}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            currentUserRole={userRole}
            columnSettings={columnSettings}
          />
        </div>
      )}
    </div>
  );
};

export default TreasuryApproved;
