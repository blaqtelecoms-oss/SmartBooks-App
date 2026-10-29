import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Companies from '@/pages/Companies';
import Transactions from '@/pages/Transactions';
import UploadStatement from '@/pages/UploadStatement';
import ChartOfAccounts from '@/pages/ChartOfAccounts';
import Reports from '@/pages/Reports';
import TaxModule from '@/pages/TaxModule';
import Documents from '@/pages/Documents';
import Team from '@/pages/Team';
import AuditLog from '@/pages/AuditLog';
import AIAssistant from '@/pages/AIAssistant';
import Settings from '@/pages/Settings';
import AllocationRules from '@/pages/AllocationRules';
import ScanReceipt from '@/pages/ScanReceipt';
import BankRules from '@/pages/BankRules';
import VAT201Report from '@/pages/VAT201Report';
import Inventory from '@/pages/Inventory';
import Invoices from '@/pages/Invoices';
import AgingReports from '@/pages/AgingReports';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/upload" element={<UploadStatement />} />
          <Route path="/rules" element={<AllocationRules />} />
          <Route path="/bank-rules" element={<BankRules />} />
          <Route path="/vat201" element={<VAT201Report />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/aging" element={<AgingReports />} />
          <Route path="/scan-receipt" element={<ScanReceipt />} />
          <Route path="/accounts" element={<ChartOfAccounts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/tax" element={<TaxModule />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/team" element={<Team />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App