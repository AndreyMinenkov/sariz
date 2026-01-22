import React from 'react';
import EmployeeStatistics from './EmployeeStatistics';

const TreasuryStatistics: React.FC = () => {
  return (
    <div className="treasury-statistics">
      <div className="role-header">
        <h1>Статистика для казначейства</h1>
        <p className="role-description">
          Отображается статистика по всем оплаченным заявкам в системе.
        </p>
      </div>
      <EmployeeStatistics />
    </div>
  );
};

export default TreasuryStatistics;
