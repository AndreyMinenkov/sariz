import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getTableColumns } from '../config/tableColumns';
import { loadColumnSettings, updateColumnSetting } from '../services/ColumnSettingsService';
import type { ColumnSettings } from '../services/ColumnSettingsService';

interface ColumnSettingsContextType {
  settings: ColumnSettings;
  updateSetting: (columnId: string, isVisible: boolean) => void;
  resetSettings: () => void;
}

const ColumnSettingsContext = createContext<ColumnSettingsContextType | undefined>(undefined);

export const useColumnSettings = () => {
  const context = useContext(ColumnSettingsContext);
  if (!context) {
    throw new Error('useColumnSettings must be used within ColumnSettingsProvider');
  }
  return context;
};

interface ColumnSettingsProviderProps {
  children: ReactNode;
}

export const ColumnSettingsProvider: React.FC<ColumnSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<ColumnSettings>({});
  const [allColumns, setAllColumns] = useState<any[]>([]);

  // Загружаем столбцы и настройки при монтировании
  useEffect(() => {
    const columns = getTableColumns();
    setAllColumns(columns);
    const loadedSettings = loadColumnSettings(columns);
    setSettings(loadedSettings);
  }, []);

  const updateSetting = (columnId: string, isVisible: boolean) => {
    const newSettings = updateColumnSetting(columnId, isVisible, allColumns);
    setSettings(newSettings);
  };

  const resetSettings = () => {
    // Сбрасываем все настройки (все столбцы видимы)
    const defaultSettings: ColumnSettings = {};
    allColumns.forEach(column => {
      defaultSettings[column.id] = true;
    });
    updateColumnSetting('', true, allColumns); // Только для сохранения
    setSettings(defaultSettings);
  };

  return (
    <ColumnSettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </ColumnSettingsContext.Provider>
  );
};
