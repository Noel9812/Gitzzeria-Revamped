import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import Landing from './pages/Landing';
import LoginSignupPage from './pages/LoginSignupPage';
import AdminLogin from './pages/AdminLogin';
import AdminPage from './pages/AdminPage';
import { UserLayout } from './layouts/UserLayout';
import { AdminLayout } from './layouts/AdminLayout';
import AccountPage from './pages/AccountPage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import { AuthProvider } from './config/AuthContext';
import ProtectedRoute from './config/ProtectedRoute';
import AdminProtectedRoute from './config/AdminProtectedRoute';
import MyOrderPage from './pages/MyOrderPage';
import SupportPage from './pages/SupportPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import AdminSupportPage from './pages/AdminSupportPage';
import AdminMenuPage from './pages/AdminMenuPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import VerifyEmailPage from './pages/VerifyEmailPage';


function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<LoginSignupPage />} />
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Regular User Routes */}
            <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/myorder" element={<MyOrderPage/>} />
              <Route path="/support" element={<SupportPage/>} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
            </Route>

            {/* Admin Routes */}
              <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
              <Route path="/admin" element={<AdminPage />} />
               <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />
              <Route path="/admin/menu" element={<AdminMenuPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;