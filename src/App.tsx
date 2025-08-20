import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
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
import { ReportViewPage } from './components/ReportViewPage';

// ScrollToTop component
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // List of routes that should scroll to top
    const scrollToTopRoutes = ['/reports', '/dashboard', '/login', '/signup', '/about', '/contact', '/payment', '/payment-success'];
    
    if (scrollToTopRoutes.includes(pathname)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname]);

  return null;
};

// Enhanced hook to prevent unnecessary tab reload behavior
const usePreventTabReload = () => {
  useEffect(() => {
    let isTabHidden = false;
    
    const handleVisibilityChange = () => {
      const wasHidden = isTabHidden;
      isTabHidden = document.hidden;
      
      if (wasHidden && !document.hidden) {
        // Tab became visible again
        console.log('Tab visible - preventing unnecessary reloads');
        
        // Set a flag to help components know tab was just restored
        sessionStorage.setItem('tabJustRestored', 'true');
        
        // Clear the flag after a short delay
        setTimeout(() => {
          sessionStorage.removeItem('tabJustRestored');
        }, 1000);
      } else if (!wasHidden && document.hidden) {
        // Tab became hidden
        console.log('Tab hidden - preserving application state');
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was loaded from cache (back/forward navigation)
        console.log('Page loaded from cache - preventing unnecessary data reloads');
        sessionStorage.setItem('pageFromCache', 'true');
        
        // Clear the flag after components have a chance to read it
        setTimeout(() => {
          sessionStorage.removeItem('pageFromCache');
        }, 500);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if there's actual unsaved data
      const hasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges');
      if (hasUnsavedChanges === 'true') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    // Prevent aggressive refresh on focus
    const handleFocus = () => {
      console.log('Window focused - maintaining current state');
      // Don't trigger any automatic data refreshes here
    };

    const handleBlur = () => {
      console.log('Window blurred - preserving state');
      // Mark that the window was blurred to prevent refresh on focus
      sessionStorage.setItem('windowWasBlurred', 'true');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
};

// Add a component wrapper to prevent unnecessary re-renders
const AppContent: React.FC = () => {
  usePreventTabReload();

  return (
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
          <Route path="/report-view" element={<ProtectedRoute><ReportViewPage /></ProtectedRoute>} />
          
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;