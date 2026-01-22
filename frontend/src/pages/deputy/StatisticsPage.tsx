import React from 'react';

const StatisticsPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Статистика согласований</h1>
      <p className="page-description">
        Аналитика по согласованным заявкам.
      </p>
      <div className="card">
        <div className="card-header">Функционал статистики будет реализован</div>
        <div className="card-content">
          <p>На этом этапе реализована базовая структура приложения.</p>
          <p>Аналитика по категориям заявок будет добавлена на следующем этапе разработки.</p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
