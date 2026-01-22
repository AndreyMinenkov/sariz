import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';


// Функция форматирования числа в русском формате (100 000,00)
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

import axios from 'axios';
import { FaFileExcel, FaUpload, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './TreasurySpecialImport.css';

const TreasurySpecialImport: React.FC = () => {
  const navigate = useNavigate();
  const [paymentDate, setPaymentDate] = useState('');
  const [importType, setImportType] = useState('non_transferable'); // non_transferable, schedules, approved_for_payment
  const [comment, setComment] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationResult, setValidationResult] = useState<{
    fileName: string;
    rowCount: number;
    totalAmount: number;
    isValid: boolean;
    error?: string;
  } | null>(null);

  // Ограничения
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ
  const MAX_ROWS = 200;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Описания типов импорта
  const importTypes = [
    {
      id: 'non_transferable',
      name: 'Непереносимые оплаты',
      description: 'Заявки, которые нельзя переносить на другие даты оплаты'
    },
    {
      id: 'schedules',
      name: 'Графики',
      description: 'Заявки по утвержденным графикам платежей'
    },
    {
      id: 'approved_for_payment',
      name: 'Утверждено генеральным директором',
      description: 'Заявки, утвержденные лично генеральным директором'
    }
  ];

  // Функция для чтения Excel и проверки
  const validateFile = async (file: File): Promise<{rowCount: number, totalAmount: number, error?: string}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Не удалось прочитать файл'));
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Проверка количества строк
          if (jsonData.length > MAX_ROWS) {
            reject(new Error(`Файл содержит более ${MAX_ROWS} строк`));
            return;
          }

                    // Проверка обязательных колонок (с поддержкой альтернативных названий)
          const columnMappings = {
            'Статья ДДС': ['Статья движения денежных средств', 'Статья ДДС'],
            'Сумма': ['Сумма'],
            'Получатель': ['Получатель'],
            'Номер заявки': ['Заявка', 'Номер заявки'],
            'Назначение': ['Назначение платежа', 'Назначение']
          };
          
          const firstRow = jsonData[0] as any;
          const rowKeys = Object.keys(firstRow || {});
          const missingColumns = [];
          
          for (const [requiredCol, possibleNames] of Object.entries(columnMappings)) {
            const found = possibleNames.some(name => 
              rowKeys.some(key => key.toLowerCase().includes(name.toLowerCase()))
            );
            if (!found) {
              missingColumns.push(requiredCol);
            }
          }

          if (missingColumns.length > 0) {
            reject(new Error(`Отсутствуют обязательные колонки: ${missingColumns.join(', ')}`));
            return;
          }
          // Подсчет суммы
          let totalSum = 0;
          let errorRows = 0;

          jsonData.forEach((row: any) => {
            const amount = parseFloat(row['Сумма']);
            if (isNaN(amount) || amount <= 0) {
              errorRows++;
            } else {
              totalSum += amount;
            }
          });

          if (errorRows > 0) {
            console.warn(`${errorRows} строк с некорректной суммой в файле ${file.name}`);
          }

          resolve({
            rowCount: jsonData.length,
            totalAmount: totalSum
          });

        } catch (err: any) {
          reject(new Error(`Ошибка при чтении файла: ${err.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Ошибка при чтении файла'));
      };

      reader.readAsBinaryString(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const selectedFile = selectedFiles[0];
    setError('');
    setSuccessMessage('');
    setValidationResult(null);

    // Проверка размера файла
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Файл превышает лимит ${MAX_FILE_SIZE / 1024 / 1024} МБ`);
      return;
    }

    // Проверка расширения
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('Поддерживаются только файлы Excel (.xlsx, .xls)');
      return;
    }

    try {
      const result = await validateFile(selectedFile);
      setValidationResult({
        fileName: selectedFile.name,
        rowCount: result.rowCount,
        totalAmount: result.totalAmount,
        isValid: true
      });
      
      setFile(selectedFile);
    } catch (err: any) {
      setValidationResult({
        fileName: selectedFile.name,
        rowCount: 0,
        totalAmount: 0,
        isValid: false,
        error: err.message
      });
      setFile(null);
    }

    // Сбрасываем значение input для возможности повторной загрузки того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = () => {
    setFile(null);
    setValidationResult(null);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 1000) {
      setComment(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Выберите файл для загрузки');
      return;
    }

    if (!paymentDate) {
      setError('Укажите дату оплаты');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      
      // Добавляем файл
      formData.append('file', file);
      
      // Добавляем данные
      formData.append('import_type', importType);
      formData.append('payment_date', paymentDate);
      if (comment) {
        formData.append('comment', comment);
      }

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/treasury/special-import', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccessMessage(`Успешно импортировано ${response.data.imported_count} заявок`);
      setFile(null);
      setValidationResult(null);
      setComment('');
      setCharCount(0);
      
      // Автоматический редирект через 3 секунды
      setTimeout(() => {
        navigate('/treasury/approved');
      }, 3000);

    } catch (err: any) {
      console.error('Ошибка импорта:', err);
      setError(err.response?.data?.detail || 'Ошибка при импорте файла');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      
      // Имитируем выбор файла через input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  return (
    <div className="treasury-special-import">
      <div className="page-header">
        <h1>Импорт особых заявок</h1>
        <p className="page-description">
          Загрузка заявок для казначейства с распределением по категориям
        </p>
      </div>

      <div className="import-container">
        {/* Выбор типа импорта */}
        <div className="import-type-section">
          <h3>Критерий загрузки:</h3>
          <div className="import-type-options">
            {importTypes.map(type => (
              <div 
                key={type.id}
                className={`import-type-card ${importType === type.id ? 'selected' : ''}`}
                onClick={() => setImportType(type.id)}
              >
                <div className="import-type-header">
                  <h4>{type.name}</h4>
                  {importType === type.id && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
                <p className="import-type-description">{type.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Дата оплаты */}
        <div className="form-section">
          <h3>Дата оплата:</h3>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="date-input"
            required
          />
          <p className="form-hint">
            Укажите планируемую дату оплаты заявок
          </p>
        </div>

        {/* Загрузка файла */}
        <div className="form-section">
          <h3>Загрузка файла:</h3>
          <div 
            className="file-drop-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FaUpload size={48} />
            <p>Перетащите файл сюда или нажмите для выбора</p>
            <p className="file-requirements">
              Поддерживаются файлы Excel (.xlsx, .xls), не более {MAX_FILE_SIZE / 1024 / 1024} МБ
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />
          </div>

          {/* Информация о загруженном файле */}
          {validationResult && (
            <div className="file-list">
              <h4>Загруженный файл:</h4>
              <div className={`file-item ${validationResult.isValid ? 'valid' : 'invalid'}`}>
                <div className="file-info">
                  <FaFileExcel />
                  <span className="file-name">{validationResult.fileName}</span>
                  {validationResult.isValid ? (
                    <span className="file-stats">
                      {validationResult.rowCount} строк, {formatNumber(validationResult.totalAmount)} руб.
                    </span>
                  ) : (
                    <span className="file-error">{validationResult.error}</span>
                  )}
                </div>
                <button 
                  onClick={removeFile}
                  className="remove-file-btn"
                  title="Удалить файл"
                >
                  ×
                </button>
              </div>
              
              {/* Статистика */}
              {validationResult.isValid && (
                <div className="total-stats">
                  <p>
                    <strong>Итого:</strong> {validationResult.rowCount} строк, {formatNumber(validationResult.totalAmount)} руб.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Комментарий */}
        <div className="form-section">
          <h3>Комментарий (необязательно):</h3>
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Дополнительная информация по заявкам..."
            rows={4}
            className="comment-textarea"
          />
          <div className="char-counter">
            {charCount}/1000 символов
          </div>
        </div>

        {/* Сообщения об ошибках и успехе */}
        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            ✓ {successMessage}
          </div>
        )}

        {/* Кнопка отправки */}
        <div className="submit-section">
          <button
            onClick={handleSubmit}
            disabled={loading || !file || !paymentDate || (validationResult && !validationResult.isValid) ? true : false}
            className="submit-btn"
          >
            {loading ? 'Импорт...' : 'Загрузить заявки'}
          </button>
          <p className="submit-hint">
            <FaInfoCircle /> Заявки будут отправлены на согласование заместителю генерального директора
          </p>
        </div>
      </div>
    </div>
  );
};

export default TreasurySpecialImport;
