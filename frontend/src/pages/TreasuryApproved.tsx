import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { getTableColumns } from '../config/tableColumns';
import { useColumnSettings } from '../contexts/ColumnSettingsContext';

// Типы для комментариев
interface ApprovalCommentInfo {
  has_comment: boolean;
  treasury_comment: string | null;
  approval_process_id: string | null;
  comment: string | null;
}

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
  const [deputyCommentInfo, setDeputyCommentInfo] = useState<ApprovalCommentInfo | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'employee' | 'deputy_director' | 'treasury'>('treasury');
  const { settings: columnSettings } = useColumnSettings();

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'treasury';
    setCurrentUserRole(role as 'employee' | 'deputy_director' | 'treasury');
    loadApprovedRequests();
  }, []);

  // Загрузка комментариев заместителя для выбранных заявок
  const loadDeputyComments = async (requestIds: string[]) => {
    if (!requestIds || requestIds.length === 0) {
      setDeputyCommentInfo(null);
      return;
    }

    try {
      // Преобразуем массив ID в строку параметров
      const idsParam = requestIds.map(id => `request_ids=${id}`).join("&");
      const response = await api.get(`/treasury/batch-approval-comments?${idsParam}`);
      
      // Если есть комментарии, берем первый (все заявки должны быть из одного процесса согласования)
      if (response.data && response.data.length > 0 && response.data[0].has_comment) {
        setDeputyCommentInfo(response.data[0]);
      } else {
        setDeputyCommentInfo({
          has_comment: false,
          treasury_comment: null,
          approval_process_id: null,
          comment: null
        });
      }
    } catch (err) {
      console.error("Ошибка загрузки комментариев заместителя:", err);
      setDeputyCommentInfo(null);
    }
  };

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

  // Загрузка комментариев заместителя при изменении выбранных строк
  useEffect(() => {
    if (selectedRows && selectedRows.length > 0) {
      loadDeputyComments(selectedRows);
    } else {
      setDeputyCommentInfo(null);
    }
  }, [selectedRows]);

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

  return (
    <div className="treasury-approved">
      <div className="treasury-approved-container">
        <h1>Согласованные заявки</h1>
        
        {/* Комментарий заместителя */}
        {deputyCommentInfo && deputyCommentInfo.has_comment && deputyCommentInfo.comment && (
          <div className="deputy-comment-section">
            <div className="deputy-comment-header">
              <h3>Комментарий заместителя:</h3>
            </div>
            <div className="deputy-comment-content">
              <div className="deputy-comment-text">
                {deputyCommentInfo.comment}
              </div>
            </div>
          </div>
        )}
        
        {deputyCommentInfo && deputyCommentInfo.has_comment && !deputyCommentInfo.comment && (
          <div className="deputy-comment-section">
            <div className="deputy-comment-header">
              <h3>Нет комментария от заместителя</h3>
            </div>
            <div className="deputy-comment-content">
              <div className="deputy-comment-text">Заместитель не оставил комментарий при согласовании</div>
            </div>
          </div>
        )}
        
        <div className="action-section">
          <div className="selection-info">
            <span>Выбрано заявок: {selectedRows.length} из {requests.length}</span>
            <button onClick={handleSelectAll} className="select-all-btn">
              {selectedRows.length === requests.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>

          <button
            onClick={handleMarkAsPaid}
            disabled={selectedRows.length === 0}
            className="mark-paid-btn"
          >
            Отметить как оплаченные ({selectedRows.length})
          </button>
        </div>

        {loading ? (
          <div className="loading">Загрузка заявок...</div>
        ) : requests.length === 0 ? (
          <div className="no-data">Нет согласованных заявок</div>
        ) : (
          <DataTable
            columns={tableColumns}
            data={requests}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            currentUserRole={currentUserRole}
            columnSettings={columnSettings}
          />
        )}
      </div>
    </div>
  );
};

export default TreasuryApproved;
