import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PendingPage from './PendingPage';
import StatisticsPage from './StatisticsPage';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <Routes>
        <Route path="/" element={<Navigate to="pending" replace />} />
        <Route path="pending" element={<PendingPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
      </Routes>
    </div>
  );
};

export default Dashboard;
