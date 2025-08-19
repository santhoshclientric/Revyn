import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReportSelection } from './ReportSelection';
import { ReportForm } from './ReportForm';
import { ReportViewer } from './ReportViewer';
import { ChatInterface } from './ChatInterface';
import { PaymentFlow } from './PaymentFlow';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { reportTypes } from '../data/reportTypes';
import { ReportSubmission, GeneratedReport, ReportAnswer } from '../types/reports';
import { AIService } from '../services/aiService';
import { StripeService } from '../services/stripeService';
import { Brain, Loader, CheckCircle, DollarSign, ShoppingCart } from 'lucide-react';

type ViewState = 'selection' | 'payment' | 'form' | 'processing' | 'report' | 'chat';

interface StoredSelection {
  reportIds: string[];
  isBundle: boolean;
  timestamp: number;
}

export const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('selection');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isBundle, setIsBundle] = useState(false);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [paymentId, setPaymentId] = useState<string>('');
  const [purchaseId, setPurchaseId] = useState<string>('');
  
  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    totalPurchases: 0,
    completedReports: 0,
    processingReports: 0,
    totalSpent: 0
  });
  const [userPurchases, setUserPurchases] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const aiService = AIService.getInstance();
  const stripeService = StripeService.getInstance();

  // Determine if we're on the dashboard page or reports selection page
  const isDashboardPage = location.pathname === '/dashboard';
  const isReportsPage = location.pathname === '/reports' || location.pathname === '/';

  // Load dashboard stats when user changes or component mounts
  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!user || !isDashboardPage) return;
      
      setIsLoadingStats(true);
      try {
        // Fetch user's purchases
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (purchasesError) {
          console.error('Error fetching purchases:', purchasesError);
          return;
        }

        // Fetch user's report submissions
        const { data: reportSubmissions, error: submissionsError } = await supabase
          .from('report_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (submissionsError) {
          console.error('Error fetching submissions:', submissionsError);
          return;
        }

        // Calculate stats
        const totalPurchases = purchases?.length || 0;
        const totalSpent = purchases?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0;
        const completedReports = reportSubmissions?.filter(sub => sub.status === 'completed').length || 0;
        const processingReports = reportSubmissions?.filter(sub => sub.status === 'processing').length || 0;

        setDashboardStats({
          totalPurchases,
          completedReports,
          processingReports,
          totalSpent
        });

        setUserPurchases(purchases || []);
        
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadDashboardStats();
  }, [user, isDashboardPage]);

  // Check for stored selections on component mount and when user changes
  useEffect(() => {
    // Only check for stored selections if we're on the reports page and user just logged in
    if (!isDashboardPage && user) {
      const storedSelection = localStorage.getItem('selectedReports');
      if (storedSelection) {
        try {
          const { reportIds, isBundle, timestamp }: StoredSelection = JSON.parse(storedSelection);
          
          // Check if selection is recent (within 1 hour)
          if (Date.now() - timestamp < 3600000) {
            setSelectedReportIds(reportIds);
            setIsBundle(isBundle);
            
            // Auto-proceed to payment if user is now logged in
            navigate('/payment', { 
              state: { 
                reportIds, 
                isBundle 
              } 
            });
            
            // Clear the stored selection
            localStorage.removeItem('selectedReports');
          } else {
            // Clear expired selection
            localStorage.removeItem('selectedReports');
          }
        } catch (error) {
          console.error('Error parsing stored selection:', error);
          localStorage.removeItem('selectedReports');
        }
      }
    }
  }, [user, navigate, isDashboardPage]);

  // Clear stored selection on component unmount
  useEffect(() => {
    return () => {
      // Only clear if we successfully processed the selection
      if (user && selectedReportIds.length > 0) {
        localStorage.removeItem('selectedReports');
      }
    };
  }, [user, selectedReportIds]);

  const handleReportSelection = useCallback((reportIds: string[], bundle: boolean) => {
    console.log('handleReportSelection called with:', { reportIds, bundle, user: !!user });
    
    if (!user) {
      // Store selection before redirecting to login
      const selectionData: StoredSelection = {
        reportIds,
        isBundle: bundle,
        timestamp: Date.now()
      };
      localStorage.setItem('selectedReports', JSON.stringify(selectionData));
      console.log('Stored selection and navigating to login');
      navigate('/login');
      return;
    }
    
    // Clear any stored selection since user is logged in
    localStorage.removeItem('selectedReports');
    
    setSelectedReportIds(reportIds);
    setIsBundle(bundle);
    navigate('/payment', { 
      state: { 
        reportIds, 
        isBundle: bundle 
      } 
    });
  }, [user, navigate]);

  const handlePaymentComplete = async (paymentIntentId: string) => {
    setPaymentId(paymentIntentId);
    
    // Record purchase in Supabase
    if (user) {
      try {
        const { data: purchase, error } = await supabase
          .from('purchases')
          .insert({
            user_id: user.id,
            report_ids: selectedReportIds,
            amount: selectedReportIds.length * 125, // $125 per report
            stripe_payment_id: paymentIntentId,
            status: 'completed'
          })
          .select()
          .single();

        if (error) throw error;
        setPurchaseId(purchase.id);
      } catch (error) {
        console.error('Error recording purchase:', error);
      }
    }
    
    setCurrentReportIndex(0);
    navigate(`/form/${selectedReportIds[0]}`, {
      state: {
        reportIds: selectedReportIds,
        paymentId: paymentIntentId,
        purchaseId
      }
    });
  };

  const handleFormComplete = async (answers: ReportAnswer[]) => {
    const currentReportId = selectedReportIds[currentReportIndex];
    
    const submission: ReportSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.id || 'user_123', // Use actual user ID from auth context
      reportTypeId: currentReportId,
      companyName: 'Demo Company', // Get from form
      email: user?.email || 'demo@company.com', // Get from auth context or form
      answers,
      status: 'processing',
      createdAt: new Date().toISOString(),
      paymentId
    };

    // Save submission to Supabase
    if (user && purchaseId) {
      try {
        await supabase
          .from('report_submissions')
          .insert({
            user_id: user.id,
            purchase_id: purchaseId,
            report_type_id: currentReportId,
            company_name: submission.companyName,
            email: submission.email,
            answers: submission.answers,
            status: 'processing'
          });
      } catch (error) {
        console.error('Error saving submission:', error);
      }
    }
    
    setSubmissions(prev => [...prev, submission]);
    navigate('/processing', {
      state: {
        submission,
        reportIds: selectedReportIds,
        currentIndex: currentReportIndex
      }
    });

    try {
      const report = await aiService.generateReport(submission);
      setGeneratedReports(prev => [...prev, report]);
      
      // Update submission in Supabase
      if (user) {
        try {
          await supabase
            .from('report_submissions')
            .update({
              status: 'completed',
              report_data: report
            })
            .eq('user_id', user.id)
            .eq('report_type_id', currentReportId);
        } catch (error) {
          console.error('Error updating submission:', error);
        }
      }
      
      // Update submission status
      setSubmissions(prev => prev.map(sub => 
        sub.id === submission.id 
          ? { ...sub, status: 'completed', completedAt: new Date().toISOString(), reportData: report }
          : sub
      ));

      // Check if this was the last report
      if (currentReportIndex < selectedReportIds.length - 1) {
        setCurrentReportIndex(prev => prev + 1);
        navigate(`/form/${selectedReportIds[currentReportIndex + 1]}`);
      } else {
        setCurrentReport(report);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setSubmissions(prev => prev.map(sub => 
        sub.id === submission.id 
          ? { ...sub, status: 'failed' }
          : sub
      ));
    }
  };

  const handleStartChat = () => {
    navigate('/chat');
  };

  const handleBackToReports = () => {
    navigate('/dashboard');
  };

  const handleStartNew = () => {
    // Clear all state and localStorage
    setSelectedReportIds([]);
    setIsBundle(false);
    setCurrentReportIndex(0);
    setSubmissions([]);
    setGeneratedReports([]);
    setCurrentReport(null);
    setPaymentId('');
    setPurchaseId('');
    localStorage.removeItem('selectedReports');
    navigate('/reports');
  };

  const getCurrentReportType = () => {
    const currentReportId = selectedReportIds[currentReportIndex];
    return reportTypes.find(rt => rt.id === currentReportId);
  };

  const handlePurchaseNewReport = () => {
    // Navigate to the reports selection page
    navigate('/reports');
  };

  // If we're on the dashboard page, show the dashboard content
  if (isDashboardPage) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? '...' : dashboardStats.totalPurchases}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Reports</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? '...' : dashboardStats.completedReports}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Loader className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? '...' : dashboardStats.processingReports}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${isLoadingStats ? '...' : dashboardStats.totalSpent}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handlePurchaseNewReport}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Purchase New Report
              </button>
              <button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors">
                Learn More
              </button>
            </div>
          </div>

          {/* Your Reports Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Reports</h2>
            
            {isLoadingStats ? (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading your reports...</p>
              </div>
            ) : userPurchases.length > 0 ? (
              <div className="space-y-4">
                {userPurchases.map((purchase) => (
                  <div key={purchase.id} className="border border-gray-200 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Purchase #{purchase.id.slice(-8)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {purchase.report_ids?.map((id: string) => 
                            reportTypes.find(rt => rt.id === id)?.name
                          ).filter(Boolean).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Purchased: {new Date(purchase.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">${purchase.amount}</p>
                        <div className="mt-2">
                          <button 
                            onClick={() => navigate(`/form/${purchase.report_ids[0]}?purchase_id=${purchase.id}`)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Start Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
                <p className="text-gray-500 mb-6">Get started by purchasing your first business report</p>
                <button
                  onClick={handlePurchaseNewReport}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Get Your First Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show the reports selection page
  return (
    <div className="py-8">
      <ReportSelection 
        onSelectReports={handleReportSelection}
        user={user}
      />
    </div>
  );
};