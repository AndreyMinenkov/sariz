import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaArrowRight, FaFileExcel, FaUpload, FaExclamationTriangle } from 'react-icons/fa';
import AmountLimitModal from '../components/AmountLimitModal';
import * as XLSX from 'xlsx';

const EmployeeImport: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentDate, setPaymentDate] = useState('');
  const [comment, setComment] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAmountLimitModal, setShowAmountLimitModal] = useState(false);
  const [amountLimitData, setAmountLimitData] = useState<{fileName: string, actualAmount: number}>({ fileName: '', actualAmount: 0 });

  // Ограничения согласно ТЗ
  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ
  const MAX_ROWS = 200; // Максимальное количество строк согласно ТЗ
  const MAX_SUM = 500000; // 500,000 руб. согласно ТЗ

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Функция для чтения Excel и проверки суммы
  const validateFileSum = async (file: File): Promise<number> => {
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

          // Подсчет суммы
          let totalSum = 0;
          let hasAmountColumn = false;

          jsonData.forEach((row: any) => {
            // Ищем колонку "Сумма" (может быть с разным регистром)
            const amountKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('сумма')
            );
            
            if (amountKey) {
              hasAmountColumn = true;
              const amount = parseFloat(row[amountKey]);
              if (!isNaN(amount) && amount > 0) {
                totalSum += amount;
              }
            }
          });

          if (!hasAmountColumn) {
            reject(new Error('В файле отсутствует колонка "Сумма"'));
            return;
          }

          resolve(totalSum);
        } catch (err) {
          reject(new Error(`Ошибка при чтении файла: ${err}`));
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
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    
    // Проверка количества файлов
    if (files.length + fileArray.length > MAX_FILES) {
      setError(`Максимальное количество файлов: ${MAX_FILES}`);
      return;
    }

    // Проверка каждого файла
    for (const file of fileArray) {
      // Проверка размера файлов
      if (file.size > MAX_FILE_SIZE) {
        setError(`Файл ${file.name} превышает лимит 5 МБ`);
        return;
      }

      // Проверка формата
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setError(`Файл ${file.name} должен быть в формате Excel (.xlsx или .xls)`);
        return;
      }

      try {
        // Проверка суммы в файле
        const totalSum = await validateFileSum(file);
        
        if (totalSum > MAX_SUM) {
          setAmountLimitData({
            fileName: file.name,
            actualAmount: totalSum
          });
          setShowAmountLimitModal(true);
          return; // Прерываем обработку
        }

      } catch (err: any) {
        setError(`Ошибка в файле ${file.name}: ${err.message}`);
        return;
      }
    }

    setFiles(prev => [...prev, ...fileArray]);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    console.log('Files:', files.map(f => ({ name: f.name, size: f.size })));
    console.log('Payment date:', paymentDate);
    console.log('Comment:', comment);
    
    if (files.length === 0) {
      setError('Выберите хотя бы один файл');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('payment_date', paymentDate);
      formData.append('comment', comment || '');
      
      files.forEach(file => {
        console.log('Appending file:', file.name);
        formData.append('files', file);
      });

      // Логируем FormData
      console.log('FormData created, sending request...');
      
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      const response = await axios.post(
        '/api/imports/excel',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Response received:', response.status, response.data);
      
      if (response.status === 200) {
        console.log('Import successful, navigating to requests');
        alert('Файлы успешно загружены');
        navigate('/employee/requests');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      console.error('Error response:', err.response);
      
      const errorMessage = err.response?.data?.detail || 'Ошибка загрузки файлов';
      setError(errorMessage);
      
      // Если ошибка о превышении суммы, показываем модальное окно
      if (errorMessage.includes('500,000') || errorMessage.includes('500000')) {
        // Попробуем найти сумму из ошибки
        const match = errorMessage.match(/(\d+[.,]\d+)/);
        if (match && files.length > 0) {
          setAmountLimitData({
            fileName: files[0].name,
            actualAmount: parseFloat(match[1].replace(',', '.'))
          });
          setShowAmountLimitModal(true);
        }
      }
    } finally {
      setLoading(false);
      console.log('handleSubmit completed');
    }
  };

  // Шаг 1: Выбор платежного дня
  const renderStep1 = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333333', marginBottom: '24px' }}>
        Импорт заявок. Шаг 1 из 4: Выбор платежного дня
      </h2>
      
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333333', marginBottom: '8px' }}>
          Платежный день:
        </label>
        <input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #DDDDDD',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#333333'
          }}
          required
        />
        <div style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>
          Выберите дату, на которую планируется оплата заявок
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <button
          onClick={() => navigate('/employee/requests')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#F5F5F5',
            color: '#333333',
            border: '1px solid #DDDDDD',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaArrowLeft /> Отмена
        </button>
        
        <button
          onClick={goToNextStep}
          disabled={!paymentDate}
          style={{
            padding: '12px 24px',
            backgroundColor: paymentDate ? '#0078D4' : '#A6A6A6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: paymentDate ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Далее <FaArrowRight />
        </button>
      </div>
    </div>
  );

  // Шаг 2: Комментарий
  const renderStep2 = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333333', marginBottom: '24px' }}>
        Шаг 2 из 4: Комментарий к загрузке
      </h2>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333333', marginBottom: '8px' }}>
          Введите комментарий ко всем файлам этой загрузки:
        </label>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setCharCount(e.target.value.length);
          }}
          maxLength={1000}
          rows={5}
          placeholder="Например: Заявки на оплату аренды офиса за январь 2025"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #DDDDDD',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#333333',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#666666', marginTop: '4px' }}>
          {charCount}/1000 символов
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <button
          onClick={goToPrevStep}
          style={{
            padding: '12px 24px',
            backgroundColor: '#F5F5F5',
            color: '#333333',
            border: '1px solid #DDDDDD',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaArrowLeft /> Назад
        </button>
        
        <button
          onClick={goToNextStep}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0078D4',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Далее <FaArrowRight />
        </button>
      </div>
    </div>
  );

  // Шаг 3: Выбор файлов
  const renderStep3 = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333333', marginBottom: '24px' }}>
        Шаг 3 из 4: Выбор файлов Excel
      </h2>

      <div
        style={{
          border: '2px dashed #DDDDDD',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '24px',
          backgroundColor: '#F8F8F8',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px', color: '#107C10' }}>
          <FaFileExcel />
        </div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: '#333333', marginBottom: '8px' }}>
          Выберите файлы Excel
        </div>
        <div style={{ fontSize: '14px', color: '#666666' }}>
          Максимум {MAX_FILES} файлов, каждый до 5 МБ, сумма не более {MAX_SUM.toLocaleString('ru-RU')} руб.
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FFEBEE',
          border: '1px solid #D13438',
          borderRadius: '4px',
          padding: '12px 16px',
          color: '#D13438',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333333', marginBottom: '16px' }}>
            Выбранные файлы ({files.length}):
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {files.map((file, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDDDDD',
                  borderRadius: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '20px', color: '#107C10' }}>
                    <FaFileExcel />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333333' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666666' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} МБ
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#D13438',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <button
          onClick={goToPrevStep}
          style={{
            padding: '12px 24px',
            backgroundColor: '#F5F5F5',
            color: '#333333',
            border: '1px solid #DDDDDD',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaArrowLeft /> Назад
        </button>
        
        <button
          onClick={goToNextStep}
          disabled={files.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: files.length > 0 ? '#0078D4' : '#A6A6A6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: files.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Загрузить <FaUpload />
        </button>
      </div>
    </div>
  );

  // Шаг 4: Обработка
  const renderStep4 = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333333', marginBottom: '24px' }}>
        Шаг 4 из 4: Обработка файлов
      </h2>

      <div style={{ backgroundColor: '#F8F8F8', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: '#666666' }}>Платежный день:</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#333333' }}>{paymentDate}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: '#666666' }}>Количество файлов:</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#333333' }}>{files.length}</span>
        </div>
        {comment && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '14px', color: '#666666', marginBottom: '4px' }}>Комментарий:</div>
            <div style={{ fontSize: '14px', color: '#333333' }}>{comment}</div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '16px', color: '#666666', marginBottom: '16px' }}>
            Обработка файлов...
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: '#F0F0F0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', backgroundColor: '#0078D4', borderRadius: '2px' }} />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 32px',
              backgroundColor: loading ? '#A6A6A6' : '#0078D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
          >
            {loading ? 'Идет импорт...' : 'Начать импорт'}
          </button>
          <div style={{ fontSize: '12px', color: '#666666' }}>
            После начала импорта не закрывайте страницу
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#333333', margin: 0 }}>Импорт заявок</h1>
      </div>

      {/* Индикатор шагов */}
      <div style={{ display: 'flex', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map(step => (
          <div key={step} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step <= currentStep ? '#0078D4' : '#F0F0F0',
                color: step <= currentStep ? '#FFFFFF' : '#666666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                marginRight: '8px'
              }}
            >
              {step}
            </div>
            <div style={{ fontSize: '14px', color: step <= currentStep ? '#333333' : '#666666', fontWeight: step === currentStep ? 600 : 400 }}>
              {step === 1 && 'Дата оплаты'}
              {step === 2 && 'Комментарий'}
              {step === 3 && 'Файлы'}
              {step === 4 && 'Обработка'}
            </div>
            {step < 4 && (
              <div style={{ flex: 1, height: '2px', backgroundColor: step < currentStep ? '#0078D4' : '#F0F0F0', margin: '0 16px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Рендер текущего шага */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      {/* Модальное окно превышения суммы */}
      <AmountLimitModal
        isOpen={showAmountLimitModal}
        onClose={() => setShowAmountLimitModal(false)}
        fileName={amountLimitData.fileName}
        actualAmount={amountLimitData.actualAmount}
      />
    </div>
  );
};

export default EmployeeImport;
