import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PaymentPage from './PaymentPage';
import ApprovedPage from './ApprovedPage';
import SpecialImportPage from './SpecialImportPage';
import StatisticsPage from './StatisticsPage';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <Routes>
        <Route path="/" element={<Navigate to="payment" replace />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="approved" element={<ApprovedPage />} />
        <Route path="special-import" element={<SpecialImportPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
      </Routes>
    </div>
  );
};

export default Dashboard;
