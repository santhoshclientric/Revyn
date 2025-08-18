import React, { useState } from 'react';
import { ReportSelection } from './ReportSelection';
import { ReportForm } from './ReportForm';
import { ReportViewer } from './ReportViewer';
import { ChatInterface } from './ChatInterface';
import { PaymentFlow } from './PaymentFlow';
import { reportTypes } from '../data/reportTypes';
import { ReportSubmission, GeneratedReport, ReportAnswer } from '../types/reports';
import { AIService } from '../services/aiService';
import { StripeService } from '../services/stripeService';
import { Brain, Loader, CheckCircle } from 'lucide-react';

type ViewState = 'selection' | 'payment' | 'form' | 'processing' | 'report' | 'chat';

export const ReportsDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('selection');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isBundle, setIsBundle] = useState(false);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [paymentId, setPaymentId] = useState<string>('');

  const aiService = AIService.getInstance();
  const stripeService = StripeService.getInstance();

  const handleReportSelection = (reportIds: string[], bundle: boolean) => {
    setSelectedReportIds(reportIds);
    setIsBundle(bundle);
    setCurrentView('payment');
  };

  const handlePaymentComplete = (paymentIntentId: string) => {
    setPaymentId(paymentIntentId);
    setCurrentReportIndex(0);
    setCurrentView('form');
  };

  const handleFormComplete = async (answers: ReportAnswer[]) => {
    const currentReportId = selectedReportIds[currentReportIndex];
    
    const submission: ReportSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'user_123', // In production, get from auth context
      reportTypeId: currentReportId,
      companyName: 'Demo Company', // Get from form
      email: 'demo@company.com', // Get from form
      answers,
      status: 'processing',
      createdAt: new Date().toISOString(),
      paymentId
    };

    setSubmissions(prev => [...prev, submission]);
    setCurrentView('processing');

    try {
      const report = await aiService.generateReport(submission);
      setGeneratedReports(prev => [...prev, report]);
      
      // Update submission status
      setSubmissions(prev => prev.map(sub => 
        sub.id === submission.id 
          ? { ...sub, status: 'completed', completedAt: new Date().toISOString(), reportData: report }
          : sub
      ));

      // Check if this was the last report
      if (currentReportIndex < selectedReportIds.length - 1) {
        setCurrentReportIndex(prev => prev + 1);
        setCurrentView('form');
      } else {
        setCurrentReport(report);
        setCurrentView('report');
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
    setCurrentView('chat');
  };

  const handleBackToReports = () => {
    setCurrentView('report');
  };

  const handleStartNew = () => {
    setSelectedReportIds([]);
    setIsBundle(false);
    setCurrentReportIndex(0);
    setSubmissions([]);
    setGeneratedReports([]);
    setCurrentReport(null);
    setPaymentId('');
    setCurrentView('selection');
  };

  const getCurrentReportType = () => {
    const currentReportId = selectedReportIds[currentReportIndex];
    return reportTypes.find(rt => rt.id === currentReportId);
  };

  if (currentView === 'selection') {
    return (
      <div className="py-8">
        <ReportSelection onSelectReports={handleReportSelection} />
      </div>
    );
  }

  if (currentView === 'payment') {
    return (
      <div className="py-8">
        <PaymentFlow
          reportIds={selectedReportIds}
          isBundle={isBundle}
          onPaymentComplete={handlePaymentComplete}
          onBack={() => setCurrentView('selection')}
        />
      </div>
    );
  }

  if (currentView === 'form') {
    const reportType = getCurrentReportType();
    if (!reportType) {
      return <div>Error: Report type not found</div>;
    }

    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Report {currentReportIndex + 1} of {selectedReportIds.length}
                </h2>
                <p className="text-gray-600">{reportType.name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(((currentReportIndex) / selectedReportIds.length) * 100)}%
                </div>
                <div className="text-sm text-gray-500">Complete</div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentReportIndex) / selectedReportIds.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <ReportForm
          reportType={reportType}
          onComplete={handleFormComplete}
          onBack={() => setCurrentView('payment')}
        />
      </div>
    );
  }

  if (currentView === 'processing') {
    return (
      <div className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-2xl p-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
                <Brain className="w-16 h-16 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              AI is Analyzing Your Data
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Our advanced AI is processing your responses and generating personalized insights. 
              This typically takes 2-3 minutes.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-600 font-medium">Processing...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'report' && currentReport) {
    return (
      <div className="py-8 px-4">
        <ReportViewer
          report={currentReport}
          onStartChat={handleStartChat}
        />
        
        <div className="max-w-7xl mx-auto mt-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready for More Insights?
            </h3>
            <p className="text-gray-600 mb-6">
              Generate additional reports or start a new analysis for your business.
            </p>
            <button
              onClick={handleStartNew}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Generate New Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'chat' && currentReport) {
    return (
      <div className="py-8 px-4">
        <ChatInterface
          report={currentReport}
          onBack={handleBackToReports}
        />
      </div>
    );
  }

  return <div>Loading...</div>;
};