import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { reportTypes } from '../data/reportTypes';
import { ArrowLeft, Download, MessageCircle, Loader, Brain, BarChart3, TrendingUp, Users, Target } from 'lucide-react';

interface Purchase {
  id: string;
  user_id: string;
  report_ids: string[];
  amount: number;
  status: string;
  report_status: string;
  created_at: string;
  stripe_payment_id: string;
  company_name: string;
  company_email: string;
}

interface ReportData {
  // Define your report data structure here
  title: string;
  overallScore: number;
  sections: any[];
  actionPlan: any;
  // Add other fields as needed
}

export const ReportViewPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseId } = location.state || {};
  
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!purchaseId || !user) {
      navigate('/dashboard');
      return;
    }

    loadReportData();
  }, [purchaseId, user]);

  const loadReportData = async () => {
    if (!user || !purchaseId) return;

    try {
      setIsLoading(true);

      // Fetch purchase details
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .eq('user_id', user.id)
        .single();

      if (purchaseError) {
        console.error('Error fetching purchase:', purchaseError);
        setError('Failed to load purchase details');
        return;
      }

      setPurchase(purchaseData);

      // Fetch report submission data
      const { data: submissionData, error: submissionError } = await supabase
        .from('report_submissions')
        .select('report_data')
        .eq('purchase_id', purchaseId)
        .eq('user_id', user.id)
        .single();

      if (submissionError) {
        console.error('Error fetching report data:', submissionError);
        setError('Failed to load report data');
        return;
      }

      if (submissionData?.report_data) {
        setReportData(submissionData.report_data);
      } else {
        setError('Report data not found');
      }

    } catch (error) {
      console.error('Error loading report:', error);
      setError('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const getReportName = (reportTypeId: string) => {
    const reportType = reportTypes.find(rt => rt.id === reportTypeId);
    return reportType?.name || 'Business Report';
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleDownload = () => {
    // Implement PDF download functionality
    console.log('Download report for purchase:', purchaseId);
    // You can implement PDF generation here
  };

  const handleStartChat = () => {
    // Navigate to chat interface with report data
    navigate('/chat', { state: { reportData, purchaseId } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto w-fit mb-4">
            <Brain className="w-12 h-12 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Your Report</h2>
          <p className="text-gray-600">Please wait while we fetch your report data...</p>
          <Loader className="w-6 h-6 animate-spin text-blue-600 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Report Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load report data'}</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {reportData?.title || getReportName(purchase.report_ids[0])}
                </h1>
                <p className="text-gray-600">
                  {purchase.company_name} • Purchase #{purchase.stripe_payment_id?.slice(-8)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {reportData?.overallScore && (
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {reportData.overallScore}%
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Overall Score</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStartChat}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Chat About Results
            </button>
            
            <button
              onClick={handleDownload}
              className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
            >
              <Download className="w-5 h-5 mr-2" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Report Content Area */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center py-12">
            <div className="p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mx-auto w-fit mb-6">
              <BarChart3 className="w-16 h-16 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Report Dashboard Coming Soon
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              We're building an interactive report dashboard with detailed insights, 
              charts, and actionable recommendations. For now, you can chat about your results above.
            </p>
            
            {/* Placeholder sections to show what's coming */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Target className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600 mb-2">Detailed Analysis</h3>
                <p className="text-sm text-gray-500">In-depth breakdown of each audit section</p>
              </div>
              
              <div className="p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600 mb-2">Action Plans</h3>
                <p className="text-sm text-gray-500">Prioritized recommendations and next steps</p>
              </div>
              
              <div className="p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600 mb-2">Team Insights</h3>
                <p className="text-sm text-gray-500">Role-based recommendations for your team</p>
              </div>
            </div>
            
            {reportData && (
              <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-800">
                  <strong>Debug Info:</strong> Report data loaded successfully. 
                  Purchase ID: {purchaseId}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};