import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaUpload, FaFile, FaChartBar, FaClipboardList,
  FaCheck, FaFileImport
} from 'react-icons/fa';
import './Sidebar.css';

interface SidebarProps {
  userRole: string;
}

interface NavButton {
  id: string;
  icon: React.ReactNode;
  text: string;
  counter: string | null;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeButton, setActiveButton] = useState<string>('');

  // Тестовые счетчики
  const draftCount = 1;
  const pendingCount = 1;
  const paymentCount = 1;
  const approvedCount = 1;

  // Определение кнопок навигации для каждой роли
  const employeeButtons: NavButton[] = [
    {
      id: 'import',
      icon: <FaUpload size={18} />,
      text: 'Импорт заявок',
      counter: null,
      path: '/employee/import'
    },
    {
      id: 'requests',
      icon: <FaFile size={18} />,
      text: 'Заявки',
      counter: 'draftCount',
      path: '/employee/requests'
    },
    {
      id: 'statistics',
      icon: <FaChartBar size={18} />,
      text: 'Статистика',
      counter: null,
      path: '/employee/statistics'
    }
  ];

  const deputyButtons: NavButton[] = [
    {
      id: 'pending',
      icon: <FaClipboardList size={18} />,
      text: 'На согласовании',
      counter: 'pendingCount',
      path: '/deputy/pending'
    },
    {
      id: 'statistics',
      icon: <FaChartBar size={18} />,
      text: 'Статистика',
      counter: null,
      path: '/deputy/statistics'
    }
  ];

  const treasuryButtons: NavButton[] = [
    {
      id: 'approved_for_payment',
      icon: <FaCheck size={18} />,
      text: 'Заявки',
      counter: 'approvedCount',
      path: '/treasury/approved'
    },
    {
      id: 'special_import',
      icon: <FaFileImport size={18} />,
      text: 'Импорт особых заявок',
      counter: null,
      path: '/treasury/special-import'
    },
    {
      id: 'statistics',
      icon: <FaChartBar size={18} />,
      text: 'Статистика',
      counter: null,
      path: '/treasury/statistics'
    }
  ];

  const getButtons = (): NavButton[] => {
    switch (userRole) {
      case 'employee':
        return employeeButtons;
      case 'deputy_director':
        return deputyButtons;
      case 'treasury':
        return treasuryButtons;
      default:
        return employeeButtons;
    }
  };

  const getCounterValue = (counter: string | null): number => {
    if (!counter) return 0;
    switch (counter) {
      case 'draftCount': return draftCount;
      case 'pendingCount': return pendingCount;
      case 'paymentCount': return paymentCount;
      case 'approvedCount': return approvedCount;
      default: return 0;
    }
  };

  const buttons = getButtons();

  useEffect(() => {
    // Устанавливаем активную кнопку на основе текущего пути
    const currentPath = location.pathname;
    const activeBtn = buttons.find(btn => btn.path === currentPath);
    if (activeBtn) {
      setActiveButton(activeBtn.id);
    }
  }, [location.pathname, buttons]);

  const handleButtonClick = (button: NavButton) => {
    setActiveButton(button.id);
    navigate(button.path);
  };

  return (
    <div className="sidebar">
      {buttons.map(button => (
        <button
          key={button.id}
          className={`nav-button ${activeButton === button.id ? 'active' : ''}`}
          onClick={() => handleButtonClick(button)}
        >
          <div className="nav-icon">
            {button.icon}
          </div>
          <div className="nav-text">
            {button.text}
          </div>
          {button.counter && getCounterValue(button.counter) > 0 && (
            <div className="nav-counter">
              {getCounterValue(button.counter)}
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default Sidebar;
