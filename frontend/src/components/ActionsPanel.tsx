import React from 'react';
import {
  FaPaperPlane,
  FaTrash,
  FaCheck,
  FaFileExport,
  FaCalendarAlt,
  FaEye
} from 'react-icons/fa';
import './ActionsPanel.css';

interface ActionsPanelProps {
  selectedRows: any[];
  currentUserRole: 'employee' | 'deputy_director' | 'treasury';
  onSendForApproval?: () => void;
  onDeleteSelected?: () => void;
  onApprove?: () => void;
  onExportSelected?: () => void;
  onChangePaymentDate?: () => void;
  onViewDetails?: () => void;
}

const ActionsPanel: React.FC<ActionsPanelProps> = ({
  selectedRows,
  currentUserRole,
  onSendForApproval,
  onDeleteSelected,
  onApprove,
  onExportSelected,
  onChangePaymentDate,
  onViewDetails
}) => {
  const calculateSelectionInfo = () => {
    const count = selectedRows.length;
    const sum = selectedRows.reduce((total, row) => {
      // Преобразуем строку суммы в число
      let amount = 0;
      if (typeof row.amount === 'string') {
        amount = parseFloat(row.amount.replace(/\s/g, '').replace(',', '.')) || 0;
      } else if (typeof row.amount === 'number') {
        amount = row.amount;
      }
      return total + amount;
    }, 0);

    // Форматируем сумму
    const formattedSum = sum.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace(',', ',');

    return { count, sum: formattedSum };
  };

  const selectionInfo = calculateSelectionInfo();

  // Кнопки для сотрудника - БЕЗ кнопки "Редактировать"
  const employeeButtons = [
    {
      id: 'send',
      icon: <FaPaperPlane size={14} />,
      text: 'Отправить на согласование',
      onClick: onSendForApproval,
      variant: 'primary',
      disabled: selectedRows.length === 0
    },
    {
      id: 'delete',
      icon: <FaTrash size={14} />,
      text: 'Удалить выбранные',
      onClick: onDeleteSelected,
      variant: 'danger',
      disabled: selectedRows.length === 0
    }
  ];

  // Кнопки для заместителя ГД
  const deputyButtons = [
    {
      id: 'approve',
      icon: <FaCheck size={14} />,
      text: 'Согласовать',
      onClick: onApprove,
      variant: 'success',
      disabled: selectedRows.length === 0
    },
    {
      id: 'view',
      icon: <FaEye size={14} />,
      text: 'Просмотреть',
      onClick: onViewDetails,
      variant: 'secondary',
      disabled: selectedRows.length !== 1
    }
  ];

  // Кнопки для казначейства
  const treasuryButtons = [
    {
      id: 'send',
      icon: <FaPaperPlane size={14} />,
      text: 'Отправить на согласование',
      onClick: onSendForApproval,
      variant: 'primary',
      disabled: selectedRows.length === 0
    },
    {
      id: 'export',
      icon: <FaFileExport size={14} />,
      text: 'Экспортировать выбранные',
      onClick: onExportSelected,
      variant: 'primary',
      disabled: selectedRows.length === 0
    },
    {
      id: 'date',
      icon: <FaCalendarAlt size={14} />,
      text: 'Изменить дату оплаты',
      onClick: onChangePaymentDate,
      variant: 'secondary',
      disabled: selectedRows.length === 0
    },
    {
      id: 'view',
      icon: <FaEye size={14} />,
      text: 'Просмотреть комментарии',
      onClick: onViewDetails,
      variant: 'secondary',
      disabled: selectedRows.length !== 1
    }
  ];

  const getButtons = () => {
    switch (currentUserRole) {
      case 'employee':
        return employeeButtons;
      case 'deputy_director':
        return deputyButtons;
      case 'treasury':
        return treasuryButtons;
      default:
        return [];
    }
  };

  const buttons = getButtons();

  return (
    <div className="actions-panel">
      <div className="actions-left">
        <div className="selection-info">
          <span className="selection-count">
            Выбрано: <strong>{selectionInfo.count}</strong>
          </span>
          {selectionInfo.count > 0 && (
            <>
              <span className="separator">|</span>
              <span className="amount-sum">
                Сумма: <strong>{selectionInfo.sum} руб.</strong>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="actions-right">
        {buttons.map(button => (
          <button
            key={button.id}
            className={`action-button btn-${button.variant}`}
            onClick={button.onClick}
            disabled={button.disabled}
          >
            {button.icon}
            {button.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionsPanel;
