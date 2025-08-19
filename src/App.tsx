import React from 'react';
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

function App() {
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
