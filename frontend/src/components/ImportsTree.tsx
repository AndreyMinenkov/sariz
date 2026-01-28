import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ImportsTree.css';

// Создаем инстанс axios
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

// Типы для данных
interface ImportItem {
  id: string;
  type: 'import' | 'user';
  user_id: string;
  user_name: string;
  comment: string | null;
  file_name: string | null;
  pending_count: number;
  total_amount: number;
  created_at: string | null;
}

interface Department {
  department: string;
  imports: ImportItem[];
}

interface Organization {
  organization: string;
  departments: Department[];
}

interface ImportsTreeProps {
  onImportSelect?: (importItem: ImportItem) => void;
  selectedImportId?: string | null;
}

const ImportsTree: React.FC<ImportsTreeProps> = ({ onImportSelect, selectedImportId }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrgs, setExpandedOrgs] = useState<string[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

  // Загрузка данных
  useEffect(() => {
    loadImportsTree();
  }, []);

  const loadImportsTree = async () => {
    try {
      setLoading(true);
      const response = await api.get('/treasury/pending/imports-tree');
      setOrganizations(response.data);

      // Автоматически разворачиваем первые элементы для удобства
      if (response.data.length > 0) {
        setExpandedOrgs([response.data[0].organization]);
        if (response.data[0].departments.length > 0) {
          setExpandedDepts([response.data[0].departments[0].department]);
        }
      }
    } catch (error) {
      console.error('ImportsTree: Ошибка загрузки дерева импортов:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrganization = (orgName: string) => {
    setExpandedOrgs(prev =>
      prev.includes(orgName)
        ? prev.filter(name => name !== orgName)
        : [...prev, orgName]
    );
  };

  const toggleDepartment = (deptName: string) => {
    setExpandedDepts(prev =>
      prev.includes(deptName)
        ? prev.filter(name => name !== deptName)
        : [...prev, deptName]
    );
  };

  const handleImportClick = (importItem: ImportItem) => {
    if (onImportSelect) {
      onImportSelect(importItem);
    }
  };

  const handleRefresh = () => {
    loadImportsTree();
  };

  if (loading) {
    return (
      <div className="imports-tree-loading">
        <div className="loading-spinner"></div>
        <div>Загрузка импортов...</div>
      </div>
    );
  }

  return (
    <div className="imports-tree-sidebar">
      <div className="imports-tree-header">
        <h3>Импорты с заявками</h3>
        <button onClick={handleRefresh} className="refresh-btn" title="Обновить">
          ↻
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="no-imports">Нет заявок на согласовании</div>
      ) : (
        <div className="imports-tree-content">
          {organizations.map(org => (
            <div key={org.organization} className="organization-item">
              <div
                className="organization-header"
                onClick={() => toggleOrganization(org.organization)}
              >
                <span className={`expand-icon ${expandedOrgs.includes(org.organization) ? 'expanded' : ''}`}>
                  {expandedOrgs.includes(org.organization) ? '▼' : '►'}
                </span>
                <span className="organization-name" title={org.organization}>
                  {org.organization}
                </span>
              </div>

              {expandedOrgs.includes(org.organization) && (
                <div className="departments-list">
                  {org.departments.map(dept => (
                    <div key={dept.department} className="department-item">
                      <div
                        className="department-header"
                        onClick={() => toggleDepartment(dept.department)}
                      >
                        <span className={`expand-icon ${expandedDepts.includes(dept.department) ? 'expanded' : ''}`}>
                          {expandedDepts.includes(dept.department) ? '▼' : '►'}
                        </span>
                        <span className="department-name" title={dept.department}>
                          {dept.department}
                        </span>
                      </div>

                      {expandedDepts.includes(dept.department) && (
                        <div className="imports-list">
                          {dept.imports.map(importItem => (
                            <button
                              key={importItem.id}
                              className={`import-item ${selectedImportId === importItem.id ? 'selected' : ''}`}
                              onClick={() => handleImportClick(importItem)}
                              title={importItem.comment ? `"${importItem.comment}"` : 'Нет комментария'}
                              // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: добавляем стили для гарантии отображения
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: '60px'
                              }}
                            >
                              <div className="import-user-info" style={{ flex: 1 }}>
                                <div className="import-user-name" style={{
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.3',
                                  minHeight: '18px',
                                  display: 'block'
                                }}>
                                  {importItem.user_name}
                                </div>
                                {importItem.comment && (
                                  <div className="import-comment-preview">
                                    {importItem.comment.length > 30
                                      ? `"${importItem.comment.substring(0, 30)}..."`
                                      : `"${importItem.comment}"`}
                                  </div>
                                )}
                              </div>
                              <div className="import-stats">
                                <div className="import-count">{importItem.pending_count}</div>
                                <div className="import-amount">{importItem.total_amount.toFixed(0)} ₽</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImportsTree;
