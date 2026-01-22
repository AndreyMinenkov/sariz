import React from 'react';

const PaymentPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Заявки к оплате</h1>
      <p className="page-description">
        Управление заявками, готовыми к оплате.
      </p>
      <div className="card">
        <div className="card-header">Функционал оплаты будет реализован</div>
        <div className="card-content">
          <p>На этом этапе реализована базовая структура приложения.</p>
          <p>Таблица заявок к оплате с экспортом в Excel будет добавлена на следующем этапе разработки.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
