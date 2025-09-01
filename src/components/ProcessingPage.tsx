import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brain, Loader } from 'lucide-react';
import { AIService } from '../services/aiChatService';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

export const ProcessingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { answers, reportId, reportIds, paymentId, purchaseId, companyInfo } = location.state || {};

  useEffect(() => {
    if (!answers || !reportId || !user) {
      navigate('/dashboard');
      return;
    }

    processReport();
  }, [answers, reportId, user]);

  const processReport = async () => {
    try {
      const aiService = AIService.getInstance();
      
      // Create submission object
      const submission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user!.id,
        reportTypeId: reportId,
        companyName: companyInfo?.companyName || 'Demo Company',
        email: companyInfo?.email || user!.email,
        answers,
        status: 'processing' as const,
        createdAt: new Date().toISOString(),
        paymentId
      };

      // Save submission to Supabase
      const { error: submissionError } = await supabase
        .from('report_submissions')
        .insert({
          user_id: user!.id,
          purchase_id: purchaseId,
          report_type_id: reportId,
          company_name: submission.companyName,
          email: submission.email,
          answers: submission.answers,
          status: 'processing'
        });

      if (submissionError) throw submissionError;

      // Update purchase status to form_completed first
      if (purchaseId) {
        const { error: purchaseUpdateError } = await supabase
          .from('purchases')
          .update({ report_status: 'form_completed' })
          .eq('id', purchaseId)
          .eq('user_id', user!.id);

        if (purchaseUpdateError) {
          console.error('Error updating purchase to form_completed:', purchaseUpdateError);
        }
      }

      // Short delay to show "Completed" status, then start generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate report
      const report = await aiService.generateReport(submission);

      // Update submission with report data
      const { error: updateError } = await supabase
        .from('report_submissions')
        .update({
          status: 'completed',
          report_data: report
        })
        .eq('user_id', user!.id)
        .eq('report_type_id', reportId)
        .eq('purchase_id', purchaseId);

      if (updateError) throw updateError;

      // Update purchase status to ai_audit_completed
      if (purchaseId) {
        const { error: purchaseCompleteError } = await supabase
          .from('purchases')
          .update({ report_status: 'ai_audit_completed' })
          .eq('id', purchaseId)
          .eq('user_id', user!.id);

        if (purchaseCompleteError) {
          console.error('Error updating purchase to ai_audit_completed:', purchaseCompleteError);
        }
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error processing report:', error);
      
      // Update submission status to failed
      if (user && purchaseId) {
        await supabase
          .from('report_submissions')
          .update({ status: 'failed' })
          .eq('user_id', user.id)
          .eq('report_type_id', reportId)
          .eq('purchase_id', purchaseId);

        // Update purchase status to failed
        await supabase
          .from('purchases')
          .update({ report_status: 'failed' })
          .eq('id', purchaseId)
          .eq('user_id', user.id);
      }
      
      navigate('/dashboard');
    }
  };

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
};