import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaCog, FaUser } from 'react-icons/fa';
import { getTableColumns } from '../config/tableColumns';
import { useColumnSettings } from '../contexts/ColumnSettingsContext';
import ChangePasswordModal from './ChangePasswordModal';
import UserGuideModal from './UserGuideModal';
import axios from 'axios';
import './Header.css';

interface HeaderProps {
  userName: string;
  userRole: string;
  onLogout: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

const Header: React.FC<HeaderProps> = ({ userName, userRole, onLogout }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allColumns, setAllColumns] = useState<any[]>([]);
  const { settings, updateSetting } = useColumnSettings();
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLDivElement>(null);
  const notificationsBtnRef = useRef<HTMLDivElement>(null);

  // Создаем инстанс axios для запросов
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

  // Загружаем список столбцов при монтировании
  useEffect(() => {
    const columns = getTableColumns();
    setAllColumns(columns);
  }, []);

  // Загружаем уведомления
  useEffect(() => {
    if (userName) {
      fetchNotifications();
      // Устанавливаем интервал для обновления уведомлений каждые 30 секунд
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userName]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsResponse, countResponse] = await Promise.all([
        api.get('/notifications/user-notifications?limit=10&unread_only=true'),
        api.get('/notifications/user-notifications/count')
      ]);

      setNotifications(notificationsResponse.data);
      setUnreadCount(countResponse.data.unread_count);
    } catch (error: any) {
      console.error('Ошибка при загрузке уведомлений:', error);
      // В случае ошибки показываем заглушку
      setUnreadCount(0);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await api.post(`/notifications/user-notifications/${notificationId}/mark-read`);
      
      // Обновляем локальное состояние
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
      
      // Обновляем счетчик
      if (unreadCount > 0) {
        setUnreadCount(prev => prev - 1);
      }
      
      // Закрываем попап уведомлений
      setShowNotifications(false);
      
      // В зависимости от типа уведомления выполняем действие
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        handleNotificationAction(notification);
      }
    } catch (error) {
      console.error('Ошибка при отметке уведомления как прочитанного:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/user-notifications/mark-all-read');
      
      // Обновляем локальное состояние
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      setUnreadCount(0);
      
      // Закрываем попап уведомлений
      setShowNotifications(false);
    } catch (error) {
      console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    // В зависимости от типа уведомления и роли пользователя
    // выполняем разные действия (переход на страницу заявок и т.д.)
    switch (notification.notification_type) {
      case 'request_approved':
      case 'request_rejected':
        // Для сотрудника - переход к его заявкам
        if (userRole === 'employee') {
          window.location.href = '/my-requests';
        }
        break;
      case 'new_requests_for_approval':
        // Для заместителя - переход к заявкам на согласование
        if (userRole === 'deputy_director') {
          window.location.href = '/approval';
        }
        break;
      case 'treasury_notification':
        // Для казначейства - переход к уведомлениям казначейства
        if (userRole === 'treasury') {
          window.location.href = '/treasury/notifications';
        }
        // Для заместителя - переход к истории согласований
        if (userRole === 'deputy_director') {
          window.location.href = '/approval/history';
        }
        break;
      default:
        break;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'employee': return 'Сотрудник';
      case 'deputy_director': return 'Заместитель ГД';
      case 'treasury': return 'Казначейство';
      default: return role;
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
      case 'treasury_notification':
        return '💰';
      default:
        return '🔔';
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettings &&
          settingsRef.current &&
          settingsBtnRef.current &&
          !settingsRef.current.contains(event.target as Node) &&
          !settingsBtnRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }

      if (showProfile &&
          profileRef.current &&
          profileBtnRef.current &&
          !profileRef.current.contains(event.target as Node) &&
          !profileBtnRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }

      if (showNotifications &&
          notificationsRef.current &&
          notificationsBtnRef.current &&
          !notificationsRef.current.contains(event.target as Node) &&
          !notificationsBtnRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings, showProfile, showNotifications]);

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
    if (showProfile) setShowProfile(false);
    if (showNotifications) setShowNotifications(false);
  };

  const handleProfileClick = () => {
    setShowProfile(!showProfile);
    if (showSettings) setShowSettings(false);
    if (showNotifications) setShowNotifications(false);
  };

  const handleNotificationsClick = () => {
    setShowNotifications(!showNotifications);
    if (showSettings) setShowSettings(false);
    if (showProfile) setShowProfile(false);
  };

  const handleColumnToggle = (columnId: string) => {
    const newVisible = !(settings[columnId] !== false);
    updateSetting(columnId, newVisible);
  };

  const handleChangePasswordClick = () => {
    setShowProfile(false);
    setShowChangePasswordModal(true);
  };

  const handleUserGuideClick = () => {
    setShowProfile(false);
    setShowUserGuideModal(true);
  };

  const handleChangePasswordSubmit = async (oldPassword: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });

      if (response.status === 200) {
        // Успешно
      } else {
        throw new Error(response.data?.detail || 'Ошибка при смене пароля');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Неверный текущий пароль');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.detail || 'Ошибка валидации');
      } else {
        throw new Error('Ошибка сервера. Попробуйте позже');
      }
    }
  };

  // Фильтруем столбцы для текущей роли пользователя
  const visibleColumnsForRole = allColumns.filter(col =>
    col.visibleForRoles.includes('all') || col.visibleForRoles.includes(userRole)
  );

  return (
    <>
      <header className="header">
        <div className="logo" onClick={() => window.location.href = '/'}>
          САРИЗ
        </div>

        <div className="header-spacer" />

        <div className="header-right">
          <div className="header-icons">
            <div 
              className="notification-icon"
              ref={notificationsBtnRef}
              onClick={handleNotificationsClick}
            >
              <FaBell size={20} color="#666666" />
              {unreadCount > 0 && (
                <div className="notification-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>

            <div
              className="settings-icon"
              ref={settingsBtnRef}
              onClick={handleSettingsClick}
            >
              <FaCog size={20} color="#666666" />
            </div>

            <div
              className="profile-section"
              ref={profileBtnRef}
              onClick={handleProfileClick}
            >
              <FaUser size={20} color="#666666" />
              <span className="profile-name">{userName}</span>
            </div>
          </div>

          <button className="logout-button" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      {/* Выпадающее меню уведомлений */}
      {showNotifications && (
        <>
          <div className="menu-overlay" onClick={() => setShowNotifications(false)} />
          <div className="notifications-dropdown" ref={notificationsRef}>
            <div className="notifications-header">
              <div className="notifications-title">Уведомления</div>
              {unreadCount > 0 && (
                <button 
                  className="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                >
                  Прочитать все
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="notifications-loading">Загрузка...</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                Нет непрочитанных уведомлений
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="notification-icon-small">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {formatNotificationTime(notification.created_at)}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="notification-unread-dot" />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {notifications.length > 0 && (
              <div 
                className="notifications-footer"
                onClick={() => {
                  setShowNotifications(false);
                  window.location.href = '/notifications';
                }}
              >
                Показать все уведомления
              </div>
            )}
          </div>
        </>
      )}

      {/* Выпадающее меню настроек */}
      {showSettings && (
        <>
          <div className="menu-overlay" onClick={() => setShowSettings(false)} />
          <div className="settings-dropdown" ref={settingsRef}>
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#666666', borderBottom: '1px solid #DDDDDD' }}>
              Настройка видимости столбцов:
            </div>
            {visibleColumnsForRole.map(column => (
              <div className="dropdown-item" key={column.id}>
                <input
                  type="checkbox"
                  id={`col_${column.id}`}
                  checked={settings[column.id] !== false}
                  onChange={() => handleColumnToggle(column.id)}
                />
                <label htmlFor={`col_${column.id}`}>{column.name}</label>
              </div>
            ))}
            <div className="divider" />
            <div className="dropdown-item contact">
              Контакты поддержки: Minenkov.a@s-int.ru
            </div>
          </div>
        </>
      )}

      {/* Выпадающее меню профиля */}
      {showProfile && (
        <>
          <div className="menu-overlay" onClick={() => setShowProfile(false)} />
          <div className="profile-dropdown" ref={profileRef}>
            <div className="dropdown-item info">
              {userName} ({getRoleName(userRole)})
            </div>
            <div className="dropdown-item" onClick={handleChangePasswordClick}>
              Сменить пароль
            </div>
            <div className="dropdown-item" onClick={handleUserGuideClick}>
              Руководство пользователя
            </div>
            <div className="divider" />
            <div className="dropdown-item contact">
              Контакты поддержки: Minenkov.a@s-int.ru
            </div>
          </div>
        </>
      )}

      {/* Модальное окно смены пароля */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handleChangePasswordSubmit}
      />

      {/* Модальное окно руководства пользователя */}
      <UserGuideModal
        isOpen={showUserGuideModal}
        onClose={() => setShowUserGuideModal(false)}
        userRole={userRole}
      />
    </>
  );
};

export default Header;
