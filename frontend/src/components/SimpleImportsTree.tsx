import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface SimpleImportsTreeProps {
  onImportSelect?: (importItem: any) => void;
}

const SimpleImportsTree: React.FC<SimpleImportsTreeProps> = ({ onImportSelect }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Принудительно устанавливаем стили после рендеринга
    if (containerRef.current && !loading) {
      const nameElements = containerRef.current.querySelectorAll('.user-name-debug');
      nameElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.color = '#ffffff';
          el.style.fontSize = '14px';
          el.style.fontWeight = 'bold';
          el.style.lineHeight = '1.3';
          el.style.minHeight = '18px';
          el.style.display = 'block';
        }
      });
    }
  }, [data, loading]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/treasury/pending/imports-tree');
      setData(response.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div ref={containerRef} style={{
      backgroundColor: '#1e293b',
      color: '#e2e8f0',
      padding: '12px',
      borderRadius: '8px',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3>Простое дерево импортов</h3>
      {data.length === 0 ? (
        <div>Нет заявок</div>
      ) : (
        <div>
          {data.map(org => (
            <div key={org.organization} style={{ marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>
                {org.organization}
              </div>
              {org.departments.map((dept: any) => (
                <div key={dept.department} style={{ marginLeft: '15px', marginTop: '8px' }}>
                  <div style={{ color: '#cbd5e1' }}>
                    {dept.department}
                  </div>
                  {dept.imports.map((importItem: any) => (
                    <div 
                      key={importItem.id}
                      style={{
                        backgroundColor: '#374151',
                        padding: '10px',
                        margin: '5px 0',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: '60px'
                      }}
                      onClick={() => onImportSelect && onImportSelect(importItem)}
                    >
                      <div style={{ flex: 1 }}>
                        <div 
                          className="user-name-debug"
                          style={{
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            lineHeight: '1.3',
                            minHeight: '18px',
                            display: 'block'
                          }}
                        >
                          {importItem.user_name}
                        </div>
                        {importItem.comment && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            {importItem.comment.length > 30 
                              ? `"${importItem.comment.substring(0, 30)}..."`
                              : `"${importItem.comment}"`}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '50px' }}>
                        <div style={{ 
                          backgroundColor: '#475569',
                          color: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          marginBottom: '2px'
                        }}>
                          {importItem.pending_count}
                        </div>
                        <div style={{ fontSize: '11px', color: '#86efac', fontWeight: '500' }}>
                          {importItem.total_amount.toFixed(0)} ₽
                        </div>
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

export default SimpleImportsTree;
