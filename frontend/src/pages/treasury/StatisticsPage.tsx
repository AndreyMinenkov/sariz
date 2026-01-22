import React from 'react';

const StatisticsPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Статистика казначейства</h1>
      <p className="page-description">
        Аналитика по оплатам и заявкам.
      </p>
      <div className="card">
        <div className="card-header">Функционал статистики будет реализован</div>
        <div className="card-content">
          <p>На этом этапе реализована базовая структура приложения.</p>
          <p>Статистика по оплатам и категориям будет добавлена на следующем этапе разработки.</p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
