import React from 'react';
import EmployeeStatistics from './EmployeeStatistics';

const DeputyStatistics: React.FC = () => {
  return (
    <div className="deputy-statistics">
      <div className="role-header">
        <h1>Статистика для заместителя генерального директора</h1>
        <p className="role-description">
          Отображается статистика по всем заявкам, согласованным вами и переведенным в статус "К оплате".
        </p>
      </div>
      <EmployeeStatistics />
    </div>
  );
};

export default DeputyStatistics;
