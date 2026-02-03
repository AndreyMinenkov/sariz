import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { getTableColumns } from '../config/tableColumns';
import { useColumnSettings } from '../contexts/ColumnSettingsContext';
import "./TreasuryApproved.css";

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

  // Функция экспорта заявок в Excel
  const handleExportToExcel = async () => {
    if (requests.length === 0) {
      alert('Нет заявок для экспорта');
      return;
    }

    try {
      // Определяем, какие заявки экспортировать
      const exportData: any = {};

      if (selectedRows.length > 0) {
        // Экспорт только выбранных заявок
        exportData.request_ids = selectedRows;
        exportData.export_all = false;
      } else {
        // Экспорт всех заявок
        exportData.export_all = true;
      }

      // Отправляем запрос на экспорт
      const response = await api.post('/treasury/export', exportData, {
        responseType: 'blob'
      });

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');

      // Извлекаем имя файла из заголовков
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Заявки_к_оплате_${new Date().toLocaleDateString('ru-RU')}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename*=UTF-8''(.+)/) ||
                             contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Освобождаем URL
      window.URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('Ошибка экспорта в Excel:', error);
      alert(error.response?.data?.detail || 'Ошибка экспорта в Excel');
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
          </div>
          <div className="action-buttons">
            <button onClick={handleSelectAll} className="select-all-btn">
              {selectedRows.length === requests.length ? "Снять все" : "Выбрать все"}
            </button>
            <button
              onClick={handleExportToExcel}
              disabled={requests.length === 0}
              className="export-excel-btn"
            >
              Экспорт в Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Загрузка заявок...</div>
        ) : requests.length === 0 ? (
          <div className="no-data">Нет согласованных заявок</div>
        ) : (
          <div className="table-container">
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
  );
};

export default TreasuryApproved;
