import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer, toast } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getProducts, warmUpServices } from './api';

import Login from './pages/Login';
import Home from './pages/Home';
import Predictions from './pages/Predictions';
import ReorderReport from './pages/ReorderReport';
import RecordSale from './pages/RecordSales';
import BatchPredictions from './pages/BatchPredictions';
import CategorySummary from './pages/CategorySummary';
import ManageSales from './pages/ManageSales';
import Users from './pages/Users';

// Layout for logged-in pages; runs the startup checks only once authenticated
function AppShell({ children }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    warmUpServices();

    getProducts()
      .then((res) => {
        const lowItems = res.data.filter((p) => p.stockStatus === 'LOW');
        setTimeout(() => {
          if (lowItems.length > 0) {
            toast.warning(
              `⚠️ ${lowItems.length} item(s) need reorder: ${lowItems
                .slice(0, 2).map((p) => p.name).join(', ')}${lowItems.length > 2 ? '...' : ''}`,
              6000
            );
          } else {
            toast.success('✅ All stock levels are sufficient!', 3000);
          }
        }, 1000);
      })
      .catch((err) => {
        if (err.response?.status !== 401) {
          toast.error('❌ Could not connect to backend server.', 5000);
        }
      });
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}

const page = (el, adminOnly = false) => (
  <ProtectedRoute adminOnly={adminOnly}>
    <AppShell>{el}</AppShell>
  </ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={page(<Home />)} />
          <Route path="/predictions" element={page(<Predictions />)} />
          <Route path="/reorder" element={page(<ReorderReport />)} />
          <Route path="/batch" element={page(<BatchPredictions />)} />
          <Route path="/category" element={page(<CategorySummary />)} />

          {/* Admin only */}
          <Route path="/record-sale" element={page(<RecordSale />, true)} />
          <Route path="/manage-sales" element={page(<ManageSales />, true)} />
          <Route path="/users" element={page(<Users />, true)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
