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

// Функция для форматирования чисел без копеек (целые числа)
const formatNumberNoCents = (num: number): string => {
  // Форматируем как "1 000 000"
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

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

interface FinalImportsTreeProps {
  onImportSelect?: (importItem: ImportItem) => void;
  selectedImportId?: string | null;
}

const FinalImportsTree: React.FC<FinalImportsTreeProps> = ({ onImportSelect, selectedImportId }) => {
  const [data, setData] = useState<Organization[]>([]);
  const [expandedOrgs, setExpandedOrgs] = useState<string[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

  useEffect(() => {
    api.get('/treasury/pending/imports-tree')
      .then(response => {
        setData(response.data);
        // Автоматически разворачиваем первую организацию и первое подразделение
        if (response.data.length > 0) {
          setExpandedOrgs([response.data[0].organization]);
          if (response.data[0].departments.length > 0) {
            setExpandedDepts([response.data[0].departments[0].department]);
          }
        }
      })
      .catch(error => {
        console.error('FinalImportsTree: Ошибка:', error);
      });
  }, []);

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

  if (data.length === 0) {
    return (
      <div style={{ 
        backgroundColor: '#1e293b', 
        color: 'white', 
        padding: '20px',
        borderRadius: '8px'
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#1e293b', 
      color: '#e2e8f0', 
      padding: '12px',
      borderRadius: '8px',
      height: '100%',
      overflowY: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #334155'
      }}>
        <h3 style={{ 
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          color: '#f8fafc',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Импорты с заявками
        </h3>
      </div>

      <div style={{ fontSize: '13px' }}>
        {data.map(org => {
          const isOrgExpanded = expandedOrgs.includes(org.organization);
          
          return (
            <div key={org.organization} style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  backgroundColor: '#334155',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => toggleOrganization(org.organization)}
              >
                <span style={{ 
                  marginRight: '8px', 
                  fontSize: '10px',
                  color: '#94a3b8',
                  transform: isOrgExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                  width: '12px',
                  textAlign: 'center'
                }}>
                  ►
                </span>
                <span style={{ 
                  fontWeight: 500,
                  color: '#f1f5f9',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  fontSize: '13px'
                }}>
                  {org.organization}
                </span>
              </div>

              {isOrgExpanded && (
                <div style={{ 
                  marginLeft: '12px', 
                  marginTop: '4px',
                  borderLeft: '1px solid #475569',
                  paddingLeft: '12px'
                }}>
                  {org.departments.map(dept => {
                    const isDeptExpanded = expandedDepts.includes(dept.department);
                    
                    return (
                      <div key={dept.department} style={{ marginBottom: '6px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '5px 8px',
                            backgroundColor: '#2d3748',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            marginTop: '4px'
                          }}
                          onClick={() => toggleDepartment(dept.department)}
                        >
                          <span style={{ 
                            marginRight: '8px', 
                            fontSize: '10px',
                            color: '#94a3b8',
                            transform: isDeptExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s',
                            width: '12px',
                            textAlign: 'center'
                          }}>
                            ►
                          </span>
                          <span style={{ 
                            color: '#cbd5e1',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            fontSize: '12.5px'
                          }}>
                            {dept.department}
                          </span>
                        </div>

                        {isDeptExpanded && (
                          <div style={{ 
                            marginLeft: '12px', 
                            marginTop: '4px',
                            paddingLeft: '8px'
                          }}>
                            {dept.imports.map(imp => (
                              <button
                                key={imp.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  width: '100%',
                                  padding: '10px 8px',
                                  marginBottom: '6px',
                                  backgroundColor: selectedImportId === imp.id ? '#3b82f6' : '#374151',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  color: '#e2e8f0',
                                  fontSize: '12px',
                                  minHeight: '44px',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => onImportSelect && onImportSelect(imp)}
                                title={`${imp.user_name} - ${formatNumberNoCents(imp.pending_count)} заявок`}
                              >
                                <div style={{ 
                                  flex: 1, 
                                  marginRight: '8px',
                                  minWidth: 0
                                }}>
                                  <div style={{ 
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: '1.2'
                                  }}>
                                    {imp.user_name}
                                  </div>
                                </div>
                                <div style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  minWidth: '28px',
                                  height: '28px'
                                }}>
                                  <div style={{ 
                                    backgroundColor: selectedImportId === imp.id ? '#1d4ed8' : '#475569',
                                    color: '#f1f5f9',
                                    padding: '4px 8px',
                                    borderRadius: '14px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    lineHeight: '1',
                                    minWidth: '24px',
                                    textAlign: 'center'
                                  }}>
                                    {formatNumberNoCents(imp.pending_count)}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FinalImportsTree;
