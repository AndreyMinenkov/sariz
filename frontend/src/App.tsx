import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ColumnSettingsProvider } from './contexts/ColumnSettingsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeImport from './pages/EmployeeImport';
import EmployeeRequests from './pages/EmployeeRequests';
import EmployeeStatistics from './pages/EmployeeStatistics';
import DeputyPending from './pages/DeputyPending';
import DeputyStatistics from './pages/DeputyStatistics';
import TreasuryApproved from './pages/TreasuryApproved';
import TreasurySpecialImport from './pages/TreasurySpecialImport';
import TreasuryStatistics from './pages/TreasuryStatistics';
import TreasuryPending from './pages/TreasuryPending';
import Notifications from './pages/Notifications';

const App: React.FC = () => {
  return (
    <ColumnSettingsProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<Layout />}>
            {/* Главная страница - редирект в зависимости от роли */}
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Кабинет сотрудника */}
            <Route path="employee/import" element={<EmployeeImport />} />
            <Route path="employee/requests" element={<EmployeeRequests />} />
            <Route path="employee/statistics" element={<EmployeeStatistics />} />

            {/* Кабинет заместителя ГД */}
            <Route path="deputy/pending" element={<DeputyPending />} />
            <Route path="deputy/statistics" element={<DeputyStatistics />} />

            {/* Кабинет казначейства */}
            <Route path="treasury/pending" element={<TreasuryPending />} />
            <Route path="treasury/approved" element={<TreasuryApproved />} />
            <Route path="treasury/special-import" element={<TreasurySpecialImport />} />
            <Route path="treasury/statistics" element={<TreasuryStatistics />} />

            {/* Страница уведомлений */}
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </Router>
    </ColumnSettingsProvider>
  );
};

export default App;
