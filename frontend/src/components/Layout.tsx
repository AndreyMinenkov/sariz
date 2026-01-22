import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string>('employee');
  const [userName, setUserName] = useState<string>('Пользователь');

  useEffect(() => {
    // Проверяем авторизацию
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Получаем информацию о пользователе из localStorage
    const role = localStorage.getItem('userRole') || 'employee';
    const name = localStorage.getItem('userName') || 'Пользователь';
    setUserRole(role);
    setUserName(name);
  }, [navigate, location]);

  const handleLogout = () => {
    if (window.confirm('Вы действительно хотите выйти?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      navigate('/login');
    }
  };

  return (
    <div className="layout">
      <Header userName={userName} userRole={userRole} onLogout={handleLogout} />
      <div className="main-content">
        <div className="sidebar-container">
          <Sidebar userRole={userRole} />
        </div>
        <div className="work-area">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
