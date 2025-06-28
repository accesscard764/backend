import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import CustomersPage from './components/CustomersPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="rewards" element={<div className="p-6"><h1 className="text-2xl font-bold">Rewards</h1><p>Reward management coming soon...</p></div>} />
            <Route path="qr" element={<div className="p-6"><h1 className="text-2xl font-bold">QR Codes</h1><p>QR code management coming soon...</p></div>} />
            <Route path="staff" element={<div className="p-6"><h1 className="text-2xl font-bold">Staff</h1><p>Staff management coming soon...</p></div>} />
            <Route path="analytics" element={<div className="p-6"><h1 className="text-2xl font-bold">Analytics</h1><p>Advanced analytics coming soon...</p></div>} />
            <Route path="billing" element={<div className="p-6"><h1 className="text-2xl font-bold">Billing</h1><p>Billing management coming soon...</p></div>} />
            <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p>Settings coming soon...</p></div>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;