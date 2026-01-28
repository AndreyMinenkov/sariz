import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { getTableColumns } from '../config/tableColumns';
import { useColumnSettings } from '../contexts/ColumnSettingsContext';
import { formatNumber } from '../utils/format';

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

const TreasuryApproved: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<'employee' | 'deputy_director' | 'treasury'>('treasury');
  const { settings: columnSettings } = useColumnSettings();

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'treasury';
    setCurrentUserRole(role as 'employee' | 'deputy_director' | 'treasury');
    loadApprovedRequests();
  }, []);

  const loadApprovedRequests = async () => {
    try {
      const response = await api.get('/treasury/for-payment');
      setRequests(response.data);
    } catch (error) {
      console.error('Ошибка загрузки согласованных заявок:', error);
    } finally {
      setLoading(false);
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

  const handleMarkAsPaid = async () => {
    if (selectedRows.length === 0) {
      alert('Выберите хотя бы одну заявку для отметки об оплате');
      return;
    }

    if (!window.confirm(`Отметить ${selectedRows.length} заявок как оплаченные?`)) {
      return;
    }

    try {
      await api.post('/treasury/approved/mark-paid', {
        request_ids: selectedRows
      });

      alert(`Успешно отмечено ${selectedRows.length} заявок как оплаченные`);
      loadApprovedRequests();
      setSelectedRows([]);
    } catch (error: any) {
      console.error('Ошибка отметки об оплате:', error);
      alert(error.response?.data?.detail || 'Ошибка отметки об оплате');
    }
  };

  const tableColumns = getTableColumns();
  const allSelected = requests.length > 0 && selectedRows.length === requests.length;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        fontSize: '18px',
        color: '#64748b'
      }}>
        Загрузка данных...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '20px',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h1 style={{
          margin: '0 0 12px 0',
          fontSize: '24px',
          fontWeight: 600,
          color: '#1e293b'
        }}>
          Согласованные заявки
        </h1>
        <p style={{
          margin: 0,
          color: '#64748b',
          fontSize: '14px'
        }}>
          Заявки, согласованные заместителем генерального директора и ожидающие оплаты
        </p>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Панель управления */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '16px',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '14px'
          }}>
            <div style={{ color: '#495057', fontWeight: 500 }}>
              Выбрано заявок: {selectedRows.length} из {requests.length}
            </div>

            {requests.length > 0 && (
              <div style={{ color: '#495057' }}>
                Общая сумма: {formatNumber(requests.reduce((sum, req) => sum + (req.amount || 0), 0))} руб.
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
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ color: '#64748b', fontSize: '16px' }}>Загрузка заявок...</div>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                    />
                    <span>Выбрать все</span>
                  </div>
                </div>

                <button
                  onClick={handleMarkAsPaid}
                  disabled={selectedRows.length === 0}
                  style={{
                    backgroundColor: selectedRows.length > 0 ? '#10b981' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s',
                    opacity: selectedRows.length > 0 ? 1 : 0.6,
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => {
                    if (selectedRows.length > 0) {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedRows.length > 0) {
                      e.currentTarget.style.backgroundColor = '#10b981';
                    }
                  }}
                >
                  Отметить как оплаченные ({selectedRows.length})
                </button>
              </div>
            </>
          )}
        </div>

        {/* Таблица заявок */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#1e293b'
          }}>
            Список заявок ({requests.length})
          </h3>

          {requests.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#94a3b8',
              fontSize: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '2px dashed #cbd5e1',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              Нет согласованных заявок для отображения
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <DataTable
                columns={tableColumns}
                data={requests}
                selectedRows={selectedRows}
                onRowSelect={handleRowSelect}
                onSelectAll={handleSelectAll}
                currentUserRole={currentUserRole}
                columnSettings={columnSettings}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TreasuryApproved;
