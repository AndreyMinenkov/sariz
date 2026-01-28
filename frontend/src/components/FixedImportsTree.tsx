import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ImportsTree.css';

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

interface ImportItem {
  id: string;
  user_name: string;
  comment: string | null;
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

interface FixedImportsTreeProps {
  onImportSelect?: (importItem: ImportItem) => void;
  selectedImportId?: string | null;
}

const FixedImportsTree: React.FC<FixedImportsTreeProps> = ({ onImportSelect, selectedImportId }) => {
  const [data, setData] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/treasury/pending/imports-tree')
      .then(response => {
        console.log('FixedImportsTree: Данные получены');
        setData(response.data);
      })
      .catch(error => {
        console.error('FixedImportsTree: Ошибка:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="imports-tree-loading">
        <div className="loading-spinner"></div>
        <div>Загрузка импортов...</div>
      </div>
    );
  }

  return (
    <div className="imports-tree-sidebar" style={{ border: '2px solid #3b82f6' }}>
      <div className="imports-tree-header">
        <h3>Импорты с заявками</h3>
      </div>

      {data.length === 0 ? (
        <div className="no-imports">Нет заявок на согласовании</div>
      ) : (
        <div className="imports-tree-content">
          {data.map(org => (
            <div key={org.organization} className="organization-item">
              <div className="organization-header">
                <span className="expand-icon">▼</span>
                <span className="organization-name">
                  {org.organization}
                </span>
              </div>
              
              <div className="departments-list">
                {org.departments.map(dept => (
                  <div key={dept.department} className="department-item">
                    <div className="department-header">
                      <span className="expand-icon">▼</span>
                      <span className="department-name">
                        {dept.department}
                      </span>
                    </div>
                    
                    <div className="imports-list">
                      {dept.imports.map(imp => (
                        <div 
                          key={imp.id}
                          className={`import-item ${selectedImportId === imp.id ? 'selected' : ''}`}
                          onClick={() => onImportSelect && onImportSelect(imp)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px',
                            margin: '8px 0',
                            backgroundColor: '#374151',
                            borderRadius: '6px',
                            border: '2px solid #4b5563',
                            cursor: 'pointer',
                            minHeight: '70px'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              color: '#ffffff',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              lineHeight: '1.4',
                              marginBottom: '4px'
                            }}>
                              {imp.user_name}
                            </div>
                            {imp.comment && (
                              <div style={{
                                color: '#94a3b8',
                                fontSize: '12px',
                                fontStyle: 'italic'
                              }}>
                                {imp.comment.length > 40 
                                  ? `"${imp.comment.substring(0, 40)}..."`
                                  : `"${imp.comment}"`}
                              </div>
                            )}
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            minWidth: '60px'
                          }}>
                            <div style={{
                              backgroundColor: '#475569',
                              color: '#f1f5f9',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              marginBottom: '4px'
                            }}>
                              {imp.pending_count}
                            </div>
                            <div style={{
                              color: '#86efac',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {imp.total_amount.toFixed(0)} ₽
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FixedImportsTree;
