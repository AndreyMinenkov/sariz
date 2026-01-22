import React, { useState } from 'react';
import { FaKey, FaEye, FaEyeSlash } from 'react-icons/fa';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (oldPassword: string, newPassword: string) => Promise<void>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    if (newPassword.length < 6) {
      setError('Новый пароль должен содержать не менее 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают');
      return;
    }

    if (oldPassword === newPassword) {
      setError('Новый пароль должен отличаться от старого');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    onClose();
  };

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
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          maxWidth: '400px',
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
            backgroundColor: '#F8F8F8',
            gap: '12px'
          }}
        >
          <FaKey style={{ color: '#0078D4', fontSize: '20px' }} />
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#333333' }}>
            Смена пароля
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px' }}>
            {error && (
              <div style={{
                backgroundColor: '#FFEBEE',
                border: '1px solid #D13438',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#D13438'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                backgroundColor: '#E8F5E8',
                border: '1px solid #107C10',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#107C10'
              }}>
                Пароль успешно изменен!
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="oldPassword" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#333333',
                marginBottom: '6px'
              }}>
                Текущий пароль
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  id="oldPassword"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid #DDDDDD',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#333333'
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666666'
                  }}
                >
                  {showOldPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="newPassword" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#333333',
                marginBottom: '6px'
              }}>
                Новый пароль
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid #DDDDDD',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#333333'
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666666'
                  }}
                >
                  {showNewPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="confirmPassword" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#333333',
                marginBottom: '6px'
              }}>
                Подтверждение нового пароля
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid #DDDDDD',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#333333'
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666666'
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <div style={{
              backgroundColor: '#F8F9FA',
              border: '1px solid #E9ECEF',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '12px',
              color: '#666666',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 4px 0' }}>Требования к паролю:</p>
              <ul style={{ margin: '0', paddingLeft: '16px' }}>
                <li>Не менее 6 символов</li>
                <li>Не должен совпадать с текущим паролем</li>
              </ul>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid #DDDDDD',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#333333',
                border: '1px solid #DDDDDD',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
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
              disabled={loading}
            >
              {loading ? 'Смена пароля...' : 'Сменить пароль'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
