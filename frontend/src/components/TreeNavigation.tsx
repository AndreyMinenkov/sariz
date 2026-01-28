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

// Типы для узлов дерева
interface TreeNode {
  id: string;
  name: string;
  type: 'root' | 'organization' | 'department' | 'user' | 'import';
  count: number;
  amount: number;
  children: TreeNode[];
  import_id?: string;
  user_id?: string;
  organization?: string;
  department?: string;
}

interface TreeNavigationProps {
  onNodeSelect: (node: TreeNode) => void;
  selectedNodeId?: string | null;
}

const TreeNavigation: React.FC<TreeNavigationProps> = ({ onNodeSelect, selectedNodeId }) => {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/treasury/pending/tree');
      setTreeData(response.data);
    } catch (error) {
      console.error('Ошибка загрузки дерева:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev =>
      prev.includes(nodeId)
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.includes(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 16;

    return (
      <div key={node.id} style={{ marginBottom: '2px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            backgroundColor: isSelected ? '#3b82f6' : (level === 0 ? '#334155' : 'transparent'),
            borderRadius: '4px',
            cursor: 'pointer',
            userSelect: 'none',
            marginLeft: `${indent}px`,
            transition: 'all 0.2s'
          }}
          onClick={() => onNodeSelect(node)}
        >
          {hasChildren && (
            <span
              style={{
                marginRight: '8px',
                fontSize: '10px',
                color: '#94a3b8',
                transform: isExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
                width: '12px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              ►
            </span>
          )}
          {!hasChildren && <span style={{ width: '20px' }}></span>}
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontWeight: level === 0 ? 500 : 400,
                color: isSelected ? '#ffffff' : (level === 0 ? '#f1f5f9' : '#cbd5e1'),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: level === 0 ? '13px' : '12.5px'
              }}>
                {node.name}
              </span>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div style={{ marginTop: '2px' }}>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        Загрузка дерева...
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
          Навигация по заявкам
        </h3>
      </div>

      <div style={{ fontSize: '13px' }}>
        {treeData && renderTreeNode(treeData)}
      </div>
    </div>
  );
};

export default TreeNavigation;
