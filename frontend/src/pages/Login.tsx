import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://31.130.155.16/api/auth/login', {
        username,
        password
      });

      const { access_token, user } = response.data;
      
      // Сохраняем токен и информацию о пользователе
      localStorage.setItem('token', access_token);
      if (user) {
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('userName', user.full_name);
      } else {
        // Если бэкенд не возвращает user, определяем по username
        let role = 'employee';
        if (username.includes('deputy')) role = 'deputy_director';
        if (username.includes('treasury')) role = 'treasury';
        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', username);
      }

      // Перенаправляем на главную страницу
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  // Тестовые данные для быстрого входа
  const handleTestLogin = (testUsername: string, testPassword: string) => {
    setUsername(testUsername);
    setPassword(testPassword);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>САРИЗ</h1>
          <p>Система автоматизации работы с заявками</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Логин</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите логин"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading || !username || !password}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <div className="test-users">
            <h3>Тестовые пользователи:</h3>
            <div className="test-buttons">
              <button
                type="button"
                className="test-button employee"
                onClick={() => handleTestLogin('employee_test', 'test123')}
              >
                Сотрудник
              </button>
              <button
                type="button"
                className="test-button deputy"
                onClick={() => handleTestLogin('deputy_test', 'test123')}
              >
                Зам. ГД
              </button>
              <button
                type="button"
                className="test-button treasury"
                onClick={() => handleTestLogin('treasury_test', 'test123')}
              >
                Казначейство
              </button>
            </div>
          </div>
        </form>

        <div className="login-footer">
          <p>Версия 5.3 • Сервер: 1 CPU, 2GB RAM, 30GB NVMe</p>
          <p>Максимальное количество пользователей: 100</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
