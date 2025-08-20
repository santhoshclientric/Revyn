import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

import { UserDashboard } from './components/Dashboard/UserDashboard';

import { PaymentFlow } from './components/PaymentFlow';
import { ReportForm } from './components/ReportForm';
import { ProcessingPage } from './components/ProcessingPage';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { Login } from './components/Login';
import { SignUp } from './components/Auth/SignUp';
import { PaymentSuccess } from './components/PaymentSuccess';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ReportsDashboard } from './components/ReportsDashboard';
import { ReportsPage } from './components/ReportsPage';
import { Dashboard } from './components/Dashboard';

// Add this hook to prevent tab reload behavior
const usePreventTabReload = () => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible again - prevent unnecessary operations
        console.log('Tab visible - preventing unnecessary reloads');
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was loaded from cache (back/forward navigation)
        console.log('Page loaded from cache');
        // Prevent any reload operations
        e.preventDefault();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if there's unsaved data
      // Remove this if you don't want any prompts
      const hasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges');
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
};

function App() {
  // Use the hook to prevent tab reload behavior
  usePreventTabReload();

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <Header />
          <main>
            <Routes>
              <Route path="/dashboard" element={<ReportsDashboard />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/" element={<Dashboard />} /> 
              
              <Route path="/payment" element={<PaymentFlow />} />
              <Route path="/form/:reportId" element={<ReportForm />} />
              <Route path="/processing" element={<ProcessingPage />} />
             
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;