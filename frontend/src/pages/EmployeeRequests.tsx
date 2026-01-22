import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import DataTable from '../components/DataTable';
import ActionsPanel from '../components/ActionsPanel';
import { getTableColumns } from '../config/tableColumns';
import { useColumnSettings } from '../contexts/ColumnSettingsContext';

// Создаем инстанс axios с интерсепторами как в AuthService
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

const EmployeeRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const { settings: columnSettings } = useColumnSettings(); // Получаем настройки столбцов из контекста

  console.log('EmployeeRequests mounted, location:', location.pathname);

  const fetchRequests = async () => {
    console.log('fetchRequests called');
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);

      const response = await api.get('/requests');
      console.log('API Response received, count:', response.data.length);
      console.log('Sample data:', response.data.slice(0, 2));

      setRequests(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки заявок');
    } finally {
      setLoading(false);
      console.log('fetchRequests completed, loading:', false);
    }
  };

  // Обновляем данные при каждом показе страницы
  useEffect(() => {
    console.log('useEffect triggered, location.pathname:', location.pathname);
    fetchRequests();
  }, [location.pathname]); // Обновляем при изменении пути

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

  const handleSendForApproval = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите заявки для отправки');
      return;
    }

    // Проверяем что все выбранные заявки имеют статус "draft"
    const selectedRequests = requests.filter(r => selectedRows.includes(r.id));
    const nonDraftRequests = selectedRequests.filter(r => r.status !== 'draft');

    if (nonDraftRequests.length > 0) {
      alert('Отправлять на согласование можно только заявки со статусом "Черновик"');
      return;
    }

    if (!window.confirm(`Отправить ${selectedRows.length} заявок на согласование?`)) {
      return;
    }

    try {
      const response = await api.post('/requests/bulk/status', {
        request_ids: selectedRows,
        status: 'pending'
      });

      if (response.status === 200) {
        alert('Заявки успешно отправлены на согласование');
        fetchRequests(); // Обновляем список
        setSelectedRows([]);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка отправки заявок');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите заявки для удаления');
      return;
    }

    if (!window.confirm(`Удалить ${selectedRows.length} выбранных заявок?`)) {
      return;
    }

    try {
      const response = await api.post('/requests/bulk/delete', {
        request_ids: selectedRows
      });

      if (response.status === 200) {
        alert('Заявки успешно удалены');
        fetchRequests(); // Обновляем список
        setSelectedRows([]);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка удаления заявок');
    }
  };

  const columns = getTableColumns();
  const currentUserRole = 'employee';
  const selectedRowsData = requests.filter(r => selectedRows.includes(r.id));

  console.log('Rendering with requests count:', requests.length);
  console.log('Loading:', loading);
  console.log('Column settings:', columnSettings);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#333333', margin: 0 }}>Мои заявки</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              height: '36px',
              padding: '0 20px',
              backgroundColor: '#0078D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onClick={fetchRequests}
          >
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FFEBEE',
          border: '1px solid #D13438',
          borderRadius: '4px',
          padding: '12px 16px',
          color: '#D13438',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <ActionsPanel
        selectedRows={selectedRowsData}
        currentUserRole={currentUserRole}
        onSendForApproval={handleSendForApproval}
        onDeleteSelected={handleDeleteSelected}
      />

      {loading ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666666',
          fontSize: '16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDDDDD',
          borderRadius: '4px',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          Загрузка заявок...
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <DataTable
            columns={columns}
            data={requests}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            currentUserRole={currentUserRole}
            columnSettings={columnSettings} // Передаем настройки столбцов
          />
        </div>
      )}
    </div>
  );
};

export default EmployeeRequests;
