import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'employee';
  const userName = localStorage.getItem('userName') || 'Пользователь';

  const getRoleName = (role: string) => {
    switch (role) {
      case 'employee': return 'Сотрудник';
      case 'deputy_director': return 'Заместитель генерального директора';
      case 'treasury': return 'Казначейство';
      default: return role;
    }
  };

  const getQuickActions = () => {
    switch (userRole) {
      case 'employee':
        return [
          { label: 'Импорт заявок', path: '/employee/import' },
          { label: 'Мои заявки', path: '/employee/requests' },
          { label: 'Статистика', path: '/employee/statistics' }
        ];
      case 'deputy_director':
        return [
          { label: 'Заявки на согласовании', path: '/deputy/pending' },
          { label: 'Статистика', path: '/deputy/statistics' }
        ];
      case 'treasury':
        return [
          { label: 'Заявки к оплате', path: '/treasury/payment' },
          { label: 'Согласовано в оплату', path: '/treasury/approved' },
          { label: 'Импорт особых заявок', path: '/treasury/special-import' },
          { label: 'Статистика', path: '/treasury/statistics' }
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Добро пожаловать, {userName}!</h1>
        <p className="role-badge">{getRoleName(userRole)}</p>
      </div>

      <div className="dashboard-content">
        <div className="quick-actions">
          <h2>Быстрые действия</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="action-card"
                onClick={() => navigate(action.path)}
              >
                <div className="action-icon">
                  {index + 1}
                </div>
                <div className="action-label">
                  {action.label}
                </div>
                <div className="action-arrow">→</div>
              </button>
            ))}
          </div>
        </div>

        <div className="system-info">
          <h2>Информация о системе</h2>
          <div className="info-cards">
            <div className="info-card">
              <div className="info-title">Пользователей в системе</div>
              <div className="info-value">3</div>
            </div>
            <div className="info-card">
              <div className="info-title">Всего заявок</div>
              <div className="info-value">4</div>
            </div>
            <div className="info-card">
              <div className="info-title">Статус системы</div>
              <div className="info-value status-active">Активна</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
