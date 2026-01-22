import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface AmountLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  actualAmount: number;
}

const AmountLimitModal: React.FC<AmountLimitModalProps> = ({
  isOpen,
  onClose,
  fileName,
  actualAmount
}) => {
  if (!isOpen) return null;

  const limit = 500000;
  const excess = actualAmount - limit;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          width: '100%',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #DDDDDD',
            backgroundColor: '#FFF3CD',
            gap: '12px'
          }}
        >
          <FaExclamationTriangle style={{ color: '#856404', fontSize: '24px' }} />
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#856404' }}>
            Превышение лимита суммы
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', color: '#333333', marginBottom: '20px' }}>
            Сумма заявок в файле <strong>{fileName}</strong> превышает установленный лимит <strong>500 000,00 руб.</strong>
          </p>

          <div
            style={{
              backgroundColor: '#F8F9FA',
              border: '1px solid #E9ECEF',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#666666'
              }}
            >
              <span>Обнаруженная сумма:</span>
              <span style={{ fontWeight: 600, color: '#333333' }}>
                {actualAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
              </span>
            </div>
            
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#666666'
              }}
            >
              <span>Установленный лимит:</span>
              <span style={{ fontWeight: 600, color: '#333333' }}>500 000,00 руб.</span>
            </div>
            
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#666666'
              }}
            >
              <span>Превышение:</span>
              <span style={{ fontWeight: 600, color: '#D13438' }}>
                {excess.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#E8F5E8', padding: '16px', borderRadius: '4px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#107C10', marginBottom: '8px' }}>
              Пожалуйста:
            </p>
            <ol style={{ fontSize: '14px', color: '#333333', paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '6px' }}>Скорректируйте загружаемый файл</li>
              <li style={{ marginBottom: '6px' }}>Убедитесь, что общая сумма заявок не превышает 500 000,00 руб.</li>
              <li>Повторите попытку загрузки</li>
            </ol>
          </div>
        </div>

        <div
          style={{
            padding: '20px 24px',
            borderTop: '1px solid #DDDDDD',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#0078D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmountLimitModal;
