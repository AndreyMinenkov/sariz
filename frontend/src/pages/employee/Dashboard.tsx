import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ImportPage from './ImportPage';
import RequestsPage from './RequestsPage';
import StatisticsPage from './StatisticsPage';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <Routes>
        <Route path="/" element={<Navigate to="import" replace />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
      </Routes>
    </div>
  );
};

export default Dashboard;
