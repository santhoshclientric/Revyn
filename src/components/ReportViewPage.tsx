// Updated ReportViewPage.tsx - Fixed to prevent tab reload behavior

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { reportTypes } from '../data/reportTypes';
import { ArrowLeft, Download, MessageCircle, Loader, Brain, AlertTriangle, Eye } from 'lucide-react';
import { AIReportViewer } from '../components/AIReportViewer';

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

interface AIResult {
  id: string;
  purchase_id: string;
  result_data: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export const ReportViewPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseId } = location.state || {};
  
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Use refs to track if data has been loaded to prevent reloads
  const hasLoadedData = useRef(false);
  const currentPurchaseId = useRef<string | null>(null);

  // Load data only once when component mounts or purchaseId changes
  useEffect(() => {
    // Only load if we haven't loaded this purchase before
    if (!purchaseId || !user) {
      navigate('/dashboard');
      return;
    }

    // Check if we're loading the same purchase we already have
    if (currentPurchaseId.current === purchaseId && hasLoadedData.current && purchase && aiResult) {
      console.log('Data already loaded for this purchase, skipping reload');
      return;
    }

    // Check if tab is hidden - don't load data when tab is not visible
    if (document.hidden) {
      console.log('Tab is hidden, deferring data load');
      return;
    }

    loadReportData();
  }, [purchaseId, user]); // Removed navigate from dependencies to prevent reloads

  // Handle visibility change without reloading data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('ReportView tab hidden - preserving state');
      } else {
        console.log('ReportView tab visible - maintaining current data');
        // Don't reload data here - just log the visibility change
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadReportData = async () => {
    if (!user || !purchaseId) return;
    
    // Prevent multiple simultaneous loads
    if (isLoading && currentPurchaseId.current === purchaseId) {
      console.log('Already loading this purchase, skipping');
      return;
    }

    try {
      setIsLoading(true);
      currentPurchaseId.current = purchaseId;

      console.log('Loading report data for purchase:', purchaseId);

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

      console.log('Purchase loaded:', purchaseData);
      setPurchase(purchaseData);

      // Fetch AI results data
      const { data: aiResultsData, error: aiResultsError } = await supabase
        .from('ai_results')
        .select('*')
        .eq('purchase_id', purchaseId)
        .single();

      if (aiResultsError) {
        console.error('Error fetching AI results:', aiResultsError);
        setError('Report not yet available. AI analysis may still be in progress.');
        return;
      }

      if (aiResultsData) {
        console.log('AI results loaded:', aiResultsData);
        setAiResult(aiResultsData);
        hasLoadedData.current = true;
        setError(''); // Clear any previous errors
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

  const handleBack = () => {
    // Clear the loaded data tracking when navigating away
    hasLoadedData.current = false;
    currentPurchaseId.current = null;
    navigate('/dashboard');
  };

  const handleDownload = () => {
    console.log('Download report for purchase:', purchaseId);
    // Implement PDF download functionality here
    alert('PDF download functionality coming soon!');
  };

  const handleStartChat = () => {
    // Navigate to chat interface with report data
    navigate('/chat', { 
      state: { 
        reportData: aiResult?.result_data, 
        purchaseId,
        companyName: purchase?.company_name
      } 
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto w-fit mb-4">
            <Brain className="w-12 h-12 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Your AI Report</h2>
          <p className="text-gray-600">Please wait while we fetch your analysis...</p>
          <Loader className="w-6 h-6 animate-spin text-blue-600 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Report Not Available</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load report data'}</p>
          <div className="space-y-3">
            <button
              onClick={handleBack}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                hasLoadedData.current = false;
                setError('');
                loadReportData();
              }}
              className="block bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors mx-auto"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the report using AIReportViewer
  return (
    <AIReportViewer
    reportData={{
        ...aiResult?.result_data,
        website_analysis: aiResult?.website_analysis
      }}
      
      companyName={purchase.company_name || 'Your Company'}
      onBack={handleBack}
      onDownload={handleDownload}
      onStartChat={handleStartChat}
    />
  );
};