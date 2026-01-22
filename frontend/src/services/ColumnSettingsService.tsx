// Сервис для управления настройками видимости столбцов

import type { TableColumn } from '../config/tableColumns';

export interface ColumnSettings {
  [columnId: string]: boolean; // true = видим, false = скрыт
}

// Ключ для localStorage
const STORAGE_KEY = 'sariz_column_visibility';

// Получить настройки по умолчанию (все столбцы видимы)
const getDefaultSettings = (columns: TableColumn[]): ColumnSettings => {
  const settings: ColumnSettings = {};
  columns.forEach(column => {
    settings[column.id] = true; // По умолчанию все столбцы видны
  });
  return settings;
};

// Загрузить настройки из localStorage
export const loadColumnSettings = (columns: TableColumn[]): ColumnSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Убедимся, что для всех текущих столбцов есть настройки
      const settings = { ...getDefaultSettings(columns), ...parsed };
      return settings;
    }
  } catch (error) {
    console.error('Error loading column settings:', error);
  }
  return getDefaultSettings(columns);
};

// Сохранить настройки в localStorage
export const saveColumnSettings = (settings: ColumnSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving column settings:', error);
  }
};

// Обновить настройку для конкретного столбца
export const updateColumnSetting = (
  columnId: string,
  isVisible: boolean,
  columns: TableColumn[]
): ColumnSettings => {
  const currentSettings = loadColumnSettings(columns);
  const newSettings = { ...currentSettings, [columnId]: isVisible };
  saveColumnSettings(newSettings);
  return newSettings;
};

// Получить видимые столбцы с учетом настроек
export const getVisibleColumns = (
  columns: TableColumn[],
  settings: ColumnSettings,
  currentUserRole: string
): TableColumn[] => {
  return columns.filter(column => {
    // Фильтр по роли
    const roleVisible = column.visibleForRoles.includes('all') || 
                       column.visibleForRoles.includes(currentUserRole);
    // Фильтр по настройкам пользователя
    const userVisible = settings[column.id] !== false; // По умолчанию true, если нет настройки
    return roleVisible && userVisible;
  });
};
