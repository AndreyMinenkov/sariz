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

const SimpleTestTree: React.FC = () => {
  const [data, setData] = useState<Organization[]>([]);

  useEffect(() => {
    api.get('/treasury/pending/imports-tree')
      .then(response => {
        console.log('SimpleTestTree: Данные:', response.data);
        setData(response.data);
      })
      .catch(error => {
        console.error('SimpleTestTree: Ошибка:', error);
      });
  }, []);

  if (data.length === 0) {
    return <div>Загрузка...</div>;
  }

  return (
    <div style={{ 
      backgroundColor: '#1e293b', 
      color: 'white', 
      padding: '20px',
      border: '5px solid red'
    }}>
      <h3>ТЕСТ: Импорты с заявками</h3>
      {data.map(org => (
        <div key={org.organization} style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'yellow' }}>
            Организация: {org.organization}
          </div>
          {org.departments.map((dept: Department) => (
            <div key={dept.department} style={{ marginLeft: '20px', marginTop: '10px' }}>
              <div style={{ color: 'lightblue', fontSize: '14px' }}>
                Подразделение: {dept.department}
              </div>
              <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                {dept.imports.map((imp: ImportItem) => (
                  <div 
                    key={imp.id}
                    style={{
                      backgroundColor: '#374151',
                      padding: '15px',
                      margin: '10px 0',
                      borderRadius: '8px',
                      border: '3px solid green'
                    }}
                  >
                    <div style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
                      ФИО: {imp.user_name}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      Комментарий: {imp.comment || 'Нет'}
                    </div>
                    <div style={{ color: '#86efac', fontSize: '14px', marginTop: '5px' }}>
                      {imp.pending_count} заявок / {imp.total_amount.toFixed(0)} ₽
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SimpleTestTree;
