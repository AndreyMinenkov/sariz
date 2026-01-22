import React, { useState, useEffect, useRef } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import StatisticsService, { type StatisticsData, type GroupingOption } from '../services/StatisticsService';
import './EmployeeStatistics.css';

// Регистрация компонентов Chart.js
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
  '#8884D8', '#82CA9D', '#FF6384', '#36A2EB',
  '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
];

const EmployeeStatistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [groupings, setGroupings] = useState<GroupingOption[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<GroupingOption[]>([]);
  const [selectedGrouping, setSelectedGrouping] = useState('article');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Загрузка доступных группировок и статусов
  useEffect(() => {
    loadGroupings();
    loadAvailableStatuses();
  }, []);

  // Загрузка данных при изменении фильтров
  useEffect(() => {
    if (groupings.length > 0) {
      loadStatisticsData();
    }
  }, [selectedGrouping, selectedStatus, startDate, endDate]);

  const loadGroupings = async () => {
    try {
      const data = await StatisticsService.getAvailableGroupings();
      setGroupings(data);
    } catch (err) {
      setError('Ошибка загрузки группировок');
      console.error(err);
    }
  };

  const loadAvailableStatuses = async () => {
    try {
      const response = await fetch('/api/statistics/available-statuses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableStatuses(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки статусов:', err);
    }
  };

  const loadStatisticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Собираем параметры запроса
      const params: any = {
        group_by: selectedGrouping
      };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedStatus) params.status = selectedStatus;

      const response = await fetch(`/api/statistics/dashboard?${new URLSearchParams(params)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatisticsData(data);
    } catch (err) {
      setError('Ошибка загрузки статистики');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await StatisticsService.exportToExcel(
        startDate || undefined,
        endDate || undefined,
        selectedGrouping
      );
    } catch (err) {
      setError('Ошибка экспорта данных');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedGrouping('article');
    setSelectedStatus('');
    if (startDateRef.current) startDateRef.current.value = '';
    if (endDateRef.current) endDateRef.current.value = '';
  };

  // Подготовка данных для круговой диаграммы
  const getPieChartData = () => {
    if (!statisticsData || statisticsData.data.length === 0) {
      return {
        labels: ['Нет данных'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e0e0e0']
        }]
      };
    }

    return {
      labels: statisticsData.data.map(item => item.group),
      datasets: [{
        data: statisticsData.data.map(item => item.count),
        backgroundColor: COLORS.slice(0, statisticsData.data.length),
        borderWidth: 1
      }]
    };
  };

  // Подготовка данных для столбчатой диаграммы
  const getBarChartData = () => {
    if (!statisticsData || statisticsData.data.length === 0) {
      return {
        labels: ['Нет данных'],
        datasets: [{
          label: 'Сумма',
          data: [0],
          backgroundColor: '#e0e0e0'
        }]
      };
    }

    return {
      labels: statisticsData.data.map(item => item.group),
      datasets: [{
        label: 'Сумма (руб.)',
        data: statisticsData.data.map(item => item.total_amount),
        backgroundColor: COLORS.slice(0, statisticsData.data.length),
        borderWidth: 1
      }]
    };
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 12
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          // Увеличиваем максимальную ширину текста в легенде
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const backgroundColor = data.datasets[0].backgroundColor[i];
                return {
                  text: label.length > 50 ? label.substring(0, 50) + '...' : label,
                  fillStyle: backgroundColor,
                  strokeStyle: backgroundColor,
                  lineWidth: 1,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Сумма: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value)
        }
      }
    }
  };

  return (
    <div className="employee-statistics">
      <h1>Статистика заявок</h1>

      {error && (
        <div className="error-alert">
          <strong>Ошибка:</strong> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Фильтры */}
      <div className="filters-card">
        <h2>Фильтры</h2>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Период с:</label>
            <input
              type="date"
              ref={startDateRef}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>по:</label>
            <input
              type="date"
              ref={endDateRef}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Группировка:</label>
            <select
              value={selectedGrouping}
              onChange={(e) => setSelectedGrouping(e.target.value)}
            >
              {groupings.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Статус:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Все статусы (кроме черновика)</option>
              {availableStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-buttons">
            <button
              className="btn btn-primary"
              onClick={loadStatisticsData}
              disabled={loading}
            >
              {loading ? 'Загрузка...' : 'Обновить'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Экспорт...' : 'Экспорт в Excel'}
            </button>
            <button
              className="btn btn-outline"
              onClick={handleResetFilters}
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Общая статистика */}
      {statisticsData && (
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Количество заявок</h3>
            <div className="summary-value">{statisticsData.total.count}</div>
          </div>
          <div className="summary-card">
            <h3>Общая сумма</h3>
            <div className="summary-value">{formatCurrency(statisticsData.total.amount)}</div>
          </div>
          <div className="summary-card">
            <h3>Период</h3>
            <div className="summary-value">
              {statisticsData.period.start_date
                ? formatDate(statisticsData.period.start_date)
                : 'Не указано'}
              {' - '}
              {statisticsData.period.end_date
                ? formatDate(statisticsData.period.end_date)
                : 'Не указано'}
            </div>
          </div>
          <div className="summary-card">
            <h3>Группировка</h3>
            <div className="summary-value">
              {groupings.find(g => g.value === statisticsData.group_by)?.label || statisticsData.group_by}
            </div>
          </div>
        </div>
      )}

      {/* Диаграммы */}
      {statisticsData && statisticsData.data.length > 0 && (
        <div className="charts-container">
          <div className="chart-card">
            <h3>Распределение по группам (количество заявок)</h3>
            <div className="chart-wrapper">
              <Pie data={getPieChartData()} options={pieChartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Распределение по группам (сумма)</h3>
            <div className="chart-wrapper">
              <Bar data={getBarChartData()} options={barChartOptions} />
            </div>
          </div>
        </div>
      )}

      {statisticsData && statisticsData.data.length === 0 && !loading && (
        <div className="no-data">
          <p>За выбранный период нет заявок для отображения статистики.</p>
        </div>
      )}

      {/* Таблица с детализацией */}
      {statisticsData && statisticsData.data.length > 0 && (
        <div className="details-table">
          <h3>Детализация по группам</h3>
          <table>
            <thead>
              <tr>
                <th>Группа</th>
                <th>Количество заявок</th>
                <th>Общая сумма</th>
                <th>Средняя сумма</th>
              </tr>
            </thead>
            <tbody>
              {statisticsData.data.map((item, index) => (
                <tr key={index}>
                  <td title={item.group}>{item.group.length > 50 ? item.group.substring(0, 50) + '...' : item.group}</td>
                  <td>{item.count}</td>
                  <td>{formatCurrency(item.total_amount)}</td>
                  <td>{formatCurrency(item.total_amount / item.count)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Итого:</strong></td>
                <td><strong>{statisticsData.total.count}</strong></td>
                <td><strong>{formatCurrency(statisticsData.total.amount)}</strong></td>
                <td><strong>
                  {statisticsData.total.count > 0
                    ? formatCurrency(statisticsData.total.amount / statisticsData.total.count)
                    : formatCurrency(0)
                  }
                </strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeeStatistics;
