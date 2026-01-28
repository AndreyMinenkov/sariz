import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface ImportItem {
  id: string;
  user_name: string;
  comment: string;
  pending_count: number;
  total_amount: number;
}

interface Department {
  department: string;
  imports: ImportItem[];
}

interface Organization {
  organization: string;
  departments: Department[];
}

const MinimalTree: React.FC = () => {
  const [data, setData] = useState<Organization[]>([]);

  useEffect(() => {
    api.get('/treasury/pending/imports-tree')
      .then(response => {
        console.log('MinimalTree: Данные получены:', response.data);
        setData(response.data);
      })
      .catch(error => {
        console.error('MinimalTree: Ошибка:', error);
      });
  }, []);

  // Просто выведем данные как текст
  return (
    <div style={{
      backgroundColor: '#1e293b', 
      color: 'white', 
      padding: '20px',
      border: '5px solid red',
      fontSize: '14px',
      fontFamily: 'monospace'
    }}>
      <h3>МИНИМАЛЬНЫЙ КОМПОНЕНТ</h3>
      
      {data.length === 0 ? (
        <div>Загрузка...</div>
      ) : (
        <div>
          <div style={{ color: 'yellow', fontWeight: 'bold', marginBottom: '10px' }}>
            Данные из API:
          </div>
          <pre style={{ 
            backgroundColor: '#2d3748', 
            padding: '10px', 
            borderRadius: '5px',
            overflow: 'auto'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
          
          <div style={{ color: 'lightgreen', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px' }}>
            Все ФИО пользователей:
          </div>
          {data.map(org => (
            <div key={org.organization} style={{ marginBottom: '15px' }}>
              <div style={{ color: 'cyan' }}>Организация: {org.organization}</div>
              {org.departments.map((dept: Department) => (
                <div key={dept.department} style={{ marginLeft: '20px', marginTop: '5px' }}>
                  <div style={{ color: 'lightblue' }}>Подразделение: {dept.department}</div>
                  {dept.imports.map((imp: ImportItem) => (
                    <div 
                      key={imp.id} 
                      style={{
                        marginLeft: '40px',
                        marginTop: '5px',
                        padding: '10px',
                        backgroundColor: '#374151',
                        borderRadius: '5px',
                        border: '2px solid green'
                      }}
                    >
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                        👤 {imp.user_name}
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        Комментарий: {imp.comment || 'нет'}
                      </div>
                      <div style={{ color: '#86efac' }}>
                        Заявок: {imp.pending_count}, Сумма: {imp.total_amount.toFixed(0)} ₽
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MinimalTree;
