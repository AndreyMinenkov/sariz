import React from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/AuthService';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: 'employee' | 'deputy_director' | 'treasury';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== requiredRole) {
    return (
      <div className="access-denied">
        <h2>Доступ запрещен</h2>
        <p>У вас недостаточно прав для доступа к этой странице.</p>
        <p>Требуемая роль: {getRoleName(requiredRole)}</p>
        <p>Ваша роль: {getRoleName(user.role)}</p>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.href = '/login'}
        >
          Войти под другой учетной записью
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

const getRoleName = (role: string) => {
  switch (role) {
    case 'employee':
      return 'Сотрудник';
    case 'deputy_director':
      return 'Заместитель генерального директора';
    case 'treasury':
      return 'Казначейство';
    default:
      return role;
  }
};

export default ProtectedRoute;
