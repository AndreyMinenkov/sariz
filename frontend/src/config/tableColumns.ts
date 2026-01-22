// Конфигурация колонок таблицы согласно ТЗ (раздел 5.2)

export interface TableColumn {
  id: string;
  name: string;
  width: string;
  minWidth: string;
  maxWidth: string;
  align: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  visibleForRoles: string[];
}

export const getTableColumns = (): TableColumn[] => [
  {
    id: 'article',
    name: 'Статья ДДС',
    width: '180px',
    minWidth: '100px',
    maxWidth: '300px',
    align: 'left',
    visibleForRoles: ['all']
  },
  {
    id: 'amount',
    name: 'Сумма',
    width: '100px',
    minWidth: '80px',
    maxWidth: '150px',
    align: 'right',
    format: (value: number) => {
      // Форматирование: "9 100,00"
      const [integer, decimal] = value.toFixed(2).split('.');
      const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return `${formattedInteger},${decimal}`;
    },
    visibleForRoles: ['all']
  },
  {
    id: 'recipient',
    name: 'Получатель',
    width: '150px',
    minWidth: '100px',
    maxWidth: '250px',
    align: 'left',
    visibleForRoles: ['all']
  },
  {
    id: 'request_number',
    name: 'Номер заявки',
    width: '120px',
    minWidth: '100px',
    maxWidth: '150px',
    align: 'left',
    visibleForRoles: ['all']
  },
  {
    id: 'request_date',
    name: 'Дата заявки',
    width: '140px',
    minWidth: '120px',
    maxWidth: '180px',
    align: 'left',
    format: (value: string) => {
      // Формат: "09.10.2025 23:59:59"
      try {
        const date = new Date(value);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
      } catch {
        return value;
      }
    },
    visibleForRoles: ['all']
  },
  {
    id: 'status',
    name: 'Статус',
    width: '120px',
    minWidth: '100px',
    maxWidth: '150px',
    align: 'center',
    visibleForRoles: ['all']
  },
  {
    id: 'organization',
    name: 'Организация',
    width: '120px',
    minWidth: '100px',
    maxWidth: '150px',
    align: 'left',
    visibleForRoles: ['all']
  },
  {
    id: 'department',
    name: 'Подразделение',
    width: '120px',
    minWidth: '100px',
    maxWidth: '150px',
    align: 'left',
    visibleForRoles: ['all']
  },
  {
    id: 'priority',
    name: 'Приоритет',
    width: '80px',
    minWidth: '60px',
    maxWidth: '100px',
    align: 'center',
    visibleForRoles: ['treasury']
  },
  {
    id: 'purpose',
    name: 'Назначение',
    width: '200px',
    minWidth: '150px',
    maxWidth: '300px',
    align: 'left',
    visibleForRoles: ['all']
  },
  {
    id: 'payment_date',
    name: 'Дата оплаты',
    width: '120px',
    minWidth: '100px',
    maxWidth: '150px',
    align: 'left',
    format: (value: string) => {
      // Формат: "ДД.ММ.ГГГГ"
      try {
        const date = new Date(value);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      } catch {
        return value;
      }
    },
    visibleForRoles: ['treasury']
  },
  {
    id: 'applicant',
    name: 'Заявитель',
    width: '150px',
    minWidth: '100px',
    maxWidth: '200px',
    align: 'left',
    visibleForRoles: ['all']
  }
];

// Вспомогательные функции для работы с таблицей
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return '#F5F5F5';
    case 'pending': return '#E3F2FD';
    case 'approved_for_payment': return '#E8F5E8';
    case 'for_payment': return '#4CAF50';
    case 'rejected': return '#FFEBEE';
    default: return '#FFFFFF';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'draft': return 'Черновик';
    case 'pending': return 'На согласовании';
    case 'approved_for_payment': return 'Согласовано в оплату';
    case 'for_payment': return 'К оплате';
    case 'rejected': return 'Отклонено';
    default: return status;
  }
};
