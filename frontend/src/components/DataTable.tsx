import React, { useState, useMemo } from 'react';
import type { ColumnSettings } from '../services/ColumnSettingsService';

interface Column {
  id: string;
  name: string;
  width: string;
  minWidth: string;
  maxWidth: string;
  align: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  visibleForRoles: string[];
}

interface RowData {
  [key: string]: any;
}

interface DataTableProps {
  columns: Column[];
  data: RowData[];
  selectedRows: string[];
  onRowSelect: (rowId: string) => void;
  onSelectAll: () => void;
  currentUserRole: string;
  columnSettings?: ColumnSettings; // Новый пропс для настроек столбцов
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  selectedRows,
  onRowSelect,
  onSelectAll,
  currentUserRole,
  columnSettings = {} // Значение по умолчанию - пустой объект
}) => {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Фильтруем колонки по роли пользователя и настройкам видимости
  const visibleColumns = useMemo(() => {
    return columns.filter(col => {
      // Проверяем доступность по роли
      const roleVisible = col.visibleForRoles.includes('all') ||
                         col.visibleForRoles.includes(currentUserRole);
      
      // Проверяем настройки пользователя (если настройки не заданы, столбец видим)
      const userVisible = columnSettings[col.id] !== false;
      
      return roleVisible && userVisible;
    });
  }, [columns, currentUserRole, columnSettings]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  const formatAmount = (value: number) => {
    // Формат: "9 100,00"
    const [integer, decimal] = value.toFixed(2).split('.');
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formattedInteger},${decimal}`;
  };

  const formatDateTime = (dateString: string) => {
    // Формат: "09.10.2025 23:59:59"
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#F5F5F5';
      case 'pending': return '#E3F2FD';
      case 'approved_for_payment': return '#E8F5E8';
      case 'for_payment': return '#4CAF50';
      case 'rejected': return '#FFEBEE';
      default: return '#FFFFFF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'pending': return 'На согласовании';
      case 'approved_for_payment': return 'Согласовано в оплату';
      case 'for_payment': return 'К оплате';
      case 'rejected': return 'Отклонено';
      default: return status;
    }
  };

  const renderCellValue = (column: Column, row: RowData) => {
    const value = row[column.id];

    if (column.format) {
      return column.format(value);
    }

    switch (column.id) {
      case 'amount':
        return formatAmount(parseFloat(value) || 0);
      case 'request_date':
        return formatDateTime(value);
      case 'status':
        return (
          <div
            style={{
              backgroundColor: getStatusColor(value),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              minWidth: '60px',
              textAlign: 'center',
              color: '#333333'
            }}
          >
            {getStatusText(value)}
          </div>
        );
      default:
        return value;
    }
  };

  const allSelected = data.length > 0 && selectedRows.length === data.length;

  // Возвращаем ТОЛЬКО таблицу, без контейнера
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '12px',
      tableLayout: 'fixed'
    }}>
      <thead>
        <tr>
          <th style={{
            width: '40px',
            minWidth: '40px',
            maxWidth: '40px',
            textAlign: 'center',
            backgroundColor: '#F8F8F8',
            fontWeight: 600,
            color: '#333333',
            padding: '12px',
            borderBottom: '2px solid #DDDDDD',
            position: 'sticky',
            top: 0,
            zIndex: 15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
              style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
            />
          </th>
          {visibleColumns.map(column => (
            <th
              key={column.id}
              style={{
                width: column.width,
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
                textAlign: column.align,
                backgroundColor: '#F8F8F8',
                fontWeight: 600,
                color: '#333333',
                padding: '12px',
                borderBottom: '2px solid #DDDDDD',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer'
              }}
              onClick={() => handleSort(column.id)}
            >
              {column.name}
              {sortColumn === column.id && (
                <span style={{ fontSize: '10px', color: '#0078D4', marginLeft: '4px' }}>
                  {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row, index) => (
          <tr
            key={row.id || index}
            style={{
              backgroundColor: selectedRows.includes(row.id) ? '#E3F2FD' : 'transparent'
            }}
          >
            <td style={{
              width: '40px',
              minWidth: '40px',
              maxWidth: '40px',
              textAlign: 'center',
              padding: '12px',
              borderBottom: '1px solid #F0F0F0',
              color: '#333333',
              verticalAlign: 'middle',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              position: 'sticky',
              left: 0,
              backgroundColor: selectedRows.includes(row.id) ? '#E3F2FD' : 'inherit',
              zIndex: 5
            }}>
              <input
                type="checkbox"
                checked={selectedRows.includes(row.id)}
                onChange={() => onRowSelect(row.id)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
              />
            </td>
            {visibleColumns.map(column => (
              <td
                key={`${row.id}-${column.id}`}
                style={{
                  textAlign: column.align,
                  width: column.width,
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                  padding: '12px',
                  borderBottom: '1px solid #F0F0F0',
                  color: '#333333',
                  verticalAlign: 'middle',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {renderCellValue(column, row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {sortedData.length === 0 && (
        <tfoot>
          <tr>
            <td colSpan={visibleColumns.length + 1} style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666666',
              fontSize: '14px',
              backgroundColor: '#FFFFFF'
            }}>
              Нет данных для отображения
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
};

export default DataTable;
