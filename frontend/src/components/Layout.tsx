import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

// Типы для узлов дерева
interface TreeNode {
  id: string;
  name: string;
  type: 'root' | 'organization' | 'department' | 'user' | 'import';
  count: number;
  amount: number;
  children: TreeNode[];
  import_id?: string;
  user_id?: string;
  organization?: string;
  department?: string;
}

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string>('employee');
  const [userName, setUserName] = useState<string>('Пользователь');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

    // Восстанавливаем выбранный узел из localStorage
    const savedNodeId = localStorage.getItem('selectedNodeId');
    if (savedNodeId) {
      setSelectedNodeId(savedNodeId);
    }
  }, [navigate, location]);

  const handleLogout = () => {
    if (window.confirm('Вы действительно хотите выйти?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('selectedNodeId');
      navigate('/login');
    }
  };

  const handleNodeSelect = (node: TreeNode) => {
    console.log('Layout: handleNodeSelect вызвана с узлом:', node);
    console.log('Layout: Устанавливаем selectedNodeId в:', node.id);
    setSelectedNodeId(node.id);
    // Сохраняем выбранный узел в localStorage для доступа из других компонентов
    localStorage.setItem('selectedNodeId', node.id);
    localStorage.setItem('selectedNode', JSON.stringify(node));
  };

  return (
    <div className="layout">
      <Header userName={userName} userRole={userRole} onLogout={handleLogout} />
      <div className="main-content">
        <div className="sidebar-container">
          <Sidebar
            userRole={userRole}
            onNodeSelect={handleNodeSelect}
            selectedNodeId={selectedNodeId}
          />
        </div>
        <div className="work-area">
          <Outlet context={{ selectedNodeId, setSelectedNodeId }} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
