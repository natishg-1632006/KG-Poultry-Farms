import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/common/Layout';

import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { UsersPage } from './pages/UsersPage';
import { BatchesPage } from './pages/BatchesPage';
import { DailyRecordsPage } from './pages/DailyRecordsPage';
import { FeedPage } from './pages/FeedPage';
import { MedicinePage } from './pages/MedicinePage';
import { DispatchPage } from './pages/DispatchPage';
import { CompanyTargetsPage } from './pages/CompanyTargetsPage';
import { ReportsPage } from './pages/ReportsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { BatchHistoryPage } from './pages/BatchHistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { ScrollToTop } from './components/common/ScrollToTop';

// Root redirect handler
const IndexRedirect = () => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/farmer/dashboard" replace />;
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<IndexRedirect />} />
              
              {/* Admin Only Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              {/* Shared Farm Operations Routes */}
              <Route path="farmer/dashboard" element={<FarmerDashboard />} />
              <Route path="admin/batches" element={<BatchesPage />} />
              <Route path="admin/targets" element={<CompanyTargetsPage />} />
              <Route path="batch-history" element={<BatchHistoryPage />} />
              <Route path="daily-records" element={<DailyRecordsPage />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="medicine" element={<MedicinePage />} />
              <Route path="dispatch" element={<DispatchPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="admin/audit-logs" element={<AuditLogsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
