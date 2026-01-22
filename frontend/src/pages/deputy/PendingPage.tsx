import React from 'react';

const PendingPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Заявки на согласовании</h1>
      <p className="page-description">
        Просмотр и согласование заявок от сотрудников.
      </p>
      <div className="card">
        <div className="card-header">Функционал согласования будет реализован</div>
        <div className="card-content">
          <p>На этом этапе реализована базовая структура приложения.</p>
          <p>Сводные таблицы и процесс согласования будут добавлены на следующем этапе разработки.</p>
        </div>
      </div>
    </div>
  );
};

export default PendingPage;
