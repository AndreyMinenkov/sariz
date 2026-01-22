import React from 'react';

const ApprovedPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Согласовано в оплату</h1>
      <p className="page-description">
        Заявки, согласованные заместителем генерального директора.
      </p>
      <div className="card">
        <div className="card-header">Функционал будет реализован</div>
        <div className="card-content">
          <p>На этом этапе реализована базовая структура приложения.</p>
          <p>Просмотр уведомлений от заместителя ГД будет добавлен на следующем этапе разработки.</p>
        </div>
      </div>
    </div>
  );
};

export default ApprovedPage;
