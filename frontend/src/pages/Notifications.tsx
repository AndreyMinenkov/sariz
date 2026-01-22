import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Notifications.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

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
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/user-notifications?limit=50');
      setNotifications(response.data);
    } catch (error: any) {
      setError(error.message || 'Ошибка при загрузке уведомлений');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/user-notifications/${notificationId}/mark-read`);
      
      // Обновляем локальное состояние
      setNotifications(prev => prev.map(notif =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
    } catch (error) {
      console.error('Ошибка при отметке уведомления как прочитанного:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/user-notifications/mark-all-read');
      
      // Обновляем локальное состояние
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_approved':
        return '✅';
      case 'request_rejected':
        return '❌';
      case 'new_requests_for_approval':
        return '📋';
      case 'batch_requests_for_approval':
        return '📦';
      case 'batch_requests_approved':
        return '✅';
      case 'batch_requests_rejected':
        return '❌';
      case 'batch_requests_processed':
        return '📊';
      case 'treasury_notification':
        return '💰';
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'request_approved': 'Заявка согласована',
      'request_rejected': 'Заявка отклонена',
      'new_requests_for_approval': 'Новые заявки',
      'batch_requests_for_approval': 'Пакет заявок на согласование',
      'batch_requests_approved': 'Пакет заявок согласован',
      'batch_requests_rejected': 'Пакет заявок отклонен',
      'batch_requests_processed': 'Пакет заявок обработан',
      'treasury_notification': 'Уведомление казначейства'
    };
    return labels[type] || type;
  };

  const renderNotificationData = (notification: Notification) => {
    if (!notification.data) return null;

    const data = notification.data;
    
    switch (notification.notification_type) {
      case 'batch_requests_for_approval':
        return (
          <div className="notification-data">
            <p><strong>Детали пакета:</strong></p>
            <ul>
              <li>Количество заявок: {data.request_count || 'Н/Д'}</li>
              <li>Категории: {Array.isArray(data.categories) ? data.categories.join(', ') : data.categories || 'Н/Д'}</li>
              <li>Общая сумма: {data.total_amount ? `${data.total_amount.toLocaleString('ru-RU')} руб.` : 'Н/Д'}</li>
              <li>Загружено пользователем: {data.imported_by || 'Н/Д'}</li>
              {data.import_id && <li>ID импорта: {data.import_id}</li>}
            </ul>
          </div>
        );
      
      case 'batch_requests_processed':
      case 'batch_requests_approved':
      case 'batch_requests_rejected':
        return (
          <div className="notification-data">
            <p><strong>Результат обработки:</strong></p>
            <ul>
              <li>Согласовано: {data.approved_count || 0}</li>
              <li>Отклонено: {data.rejected_count || 0}</li>
              {data.total_amount && <li>Сумма согласованных: {data.total_amount.toLocaleString('ru-RU')} руб.</li>}
              {data.deputy_name && <li>Обработано: {data.deputy_name}</li>}
              {data.comment && <li>Комментарий: {data.comment}</li>}
              {data.import_id && <li>ID импорта: {data.import_id}</li>}
            </ul>
          </div>
        );
      
      case 'treasury_notification':
        return (
          <div className="notification-data">
            <p><strong>Информация для казначейства:</strong></p>
            <ul>
              <li>Согласовано заявок: {data.approved_count || 0}</li>
              <li>Общая сумма: {data.total_amount ? `${data.total_amount.toLocaleString('ru-RU')} руб.` : 'Н/Д'}</li>
              <li>Получил: {data.treasury_user || 'Н/Д'}</li>
              {data.comment && <li>Комментарий: {data.comment}</li>}
            </ul>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading">Загрузка уведомлений...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notifications-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Уведомления</h1>
        <div className="notifications-stats">
          <span className="unread-count">Непрочитанных: {unreadCount}</span>
          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
              Отметить все как прочитанные
            </button>
          )}
          <button className="back-btn" onClick={() => navigate(-1)}>
            Назад
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="no-notifications">
          Нет уведомлений
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-card ${notification.is_read ? 'read' : 'unread'}`}
            >
              <div className="notification-header">
                <div className="notification-icon">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className="notification-title-section">
                  <h3 className="notification-title">{notification.title}</h3>
                  <span className="notification-type">
                    {getNotificationTypeLabel(notification.notification_type)}
                  </span>
                  <span className="notification-time">
                    {formatDate(notification.created_at)}
                  </span>
                </div>
                <div className="notification-actions">
                  {!notification.is_read && (
                    <button
                      className="mark-read-btn"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Отметить прочитанным
                    </button>
                  )}
                  <div className={`status-dot ${notification.is_read ? 'read' : 'unread'}`} />
                </div>
              </div>
              
              <div className="notification-body">
                <p className="notification-message">{notification.message}</p>
                {renderNotificationData(notification)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
