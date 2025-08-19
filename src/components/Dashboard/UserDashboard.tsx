import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { reportTypes } from '../../data/reportTypes';
import { GeneratedReport } from '../../types/reports';
import { ReportViewer } from '../ReportViewer';
import { ChatInterface } from '../ChatInterface';
import { Link } from 'react-router-dom';
import { BarChart3, Calendar, DollarSign, FileText, MessageCircle, Plus, Eye, Clock, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';

interface Purchase {
  id: string;
  report_ids: string[];
  amount: number;
  status: string;
  created_at: string;
  stripe_payment_id: string;
}

interface ReportSubmission {
  id: string;
  report_type_id: string;
  company_name: string;
  status: string;
  report_data: any;
  created_at: string;
  purchase_id: string;
}

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'report' | 'chat'>('dashboard');
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      // Fetch report submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('report_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      setPurchases(purchasesData || []);
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReportName = (reportTypeId: string) => {
    const reportType = reportTypes.find(rt => rt.id === reportTypeId);
    return reportType?.name || 'Unknown Report';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleViewReport = (submission: ReportSubmission) => {
    if (submission.report_data) {
      setSelectedReport(submission.report_data);
      setCurrentView('report');
    }
  };

  const handleStartChat = () => {
    setCurrentView('chat');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedReport(null);
  };

  if (loading) {
    return (
      <div className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 h-24 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'report' && selectedReport) {
    return (
      <div className="py-8 px-4">
        <ReportViewer
          report={selectedReport}
          onStartChat={handleStartChat}
        />
        <div className="max-w-7xl mx-auto mt-8">
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'chat' && selectedReport) {
    return (
      <div className="py-8 px-4">
        <ChatInterface
          report={selectedReport}
          onBack={handleBackToDashboard}
        />
      </div>
    );
  }

  const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const completedReports = submissions.filter(s => s.status === 'completed').length;
  const processingReports = submissions.filter(s => s.status === 'processing').length;

  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {user?.user_metadata?.name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600 text-lg">
            Here's an overview of your business reports and insights.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{purchases.length}</div>
                <div className="text-gray-600">Total Purchases</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{completedReports}</div>
                <div className="text-gray-600">Completed Reports</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{processingReports}</div>
                <div className="text-gray-600">Processing</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">${totalSpent}</div>
                <div className="text-gray-600">Total Spent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/reports"
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Purchase New Report
            </Link>
            <Link
              to="/about"
              className="flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Learn More
            </Link>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Reports</h2>
            {submissions.length > 0 && (
              <span className="text-sm text-gray-500">
                {submissions.length} report{submissions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full mx-auto w-fit mb-4">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h3>
              <p className="text-gray-600 mb-6">
                Purchase your first business report to get AI-powered insights.
              </p>
              <Link
                to="/reports"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Get Started
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getReportName(submission.report_type_id)}
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(submission.status)}
                            <span className="capitalize">{submission.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Company: {submission.company_name}</p>
                        <p>Created: {new Date(submission.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {submission.status === 'completed' && submission.report_data && (
                        <>
                          <button
                            onClick={() => handleViewReport(submission)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Report
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(submission.report_data);
                              setCurrentView('chat');
                            }}
                            className="flex items-center px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Chat
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        {purchases.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Purchase History</h2>
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="border border-gray-200 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {purchase.report_ids.length} Report{purchase.report_ids.length !== 1 ? 's' : ''}
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>
                          <span className="capitalize">{purchase.status}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Reports: {purchase.report_ids.map(id => getReportName(id)).join(', ')}</p>
                        <p>Date: {new Date(purchase.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">${purchase.amount}</div>
                      <div className="text-sm text-gray-500">Payment ID: {purchase.stripe_payment_id.slice(-8)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};