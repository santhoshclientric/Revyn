// Updated ReportForm.tsx with proper Checkboxes + % input handling

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { CheckCircle, ArrowRight, ArrowLeft, Loader, Save, Zap } from 'lucide-react';
import CheckboxPercentageInput from './CheckboxPercentageInput';

interface Question {
  id: number;
  question_number: number;
  question_text: string;
  format_type: string;
  response_options: string[] | null;
  audit_section_tag: string;
  ai_component: string;
}

interface Answer {
  question_id: number;
  answer_text?: string;
  answer_options?: string[];
}

// AI Service that calls your server endpoint
class AIAnalysisService {
  private static readonly SERVER_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  static async triggerAIAnalysis(purchaseId: string): Promise<boolean> {
    try {
      console.log('Triggering AI analysis via server for purchase:', purchaseId);
      
      const response = await fetch(`${this.SERVER_API_URL}/api/trigger-ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_id: purchaseId
        })
      });

      console.log('Server response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('AI analysis triggered successfully via server:', result);
      return true;
    } catch (error) {
      console.error('Error triggering AI analysis:', error);
      throw error;
    }
  }
}

export const ReportForm: React.FC = () => {
  console.log('=== REPORT FORM COMPONENT MOUNTED ===');
  
  const { reportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get data from either location.state or URL params
  const { reportIds, paymentId, purchaseId, source } = location.state || {};
  const purchaseIdFromUrl = searchParams.get('purchase_id');
  const paymentIntentFromUrl = searchParams.get('payment_intent');
  const currentPurchaseId = purchaseId || purchaseIdFromUrl;
  
  // State management
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [tempAnswer, setTempAnswer] = useState<Answer | null>(null);
  const [companyInfo, setCompanyInfo] = useState({ companyName: '', email: '' });
  const [showCompanyForm, setShowCompanyForm] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Initialize company info with user data and check if we should skip company form
  useEffect(() => {
    const loadCompanyInfo = async () => {
      if (user) {
        // Always try to load company info from purchases table first
        if (currentPurchaseId) {
          try {
            const { data: purchase, error } = await supabase
              .from('purchases')
              .select('company_name, company_email')
              .eq('id', currentPurchaseId)
              .eq('user_id', user.id)
              .single();

            if (!error && purchase && purchase.company_name && purchase.company_name !== 'Demo Company') {
              // Company info exists, skip company form
              setCompanyInfo({
                companyName: purchase.company_name,
                email: purchase.company_email || user.email || ''
              });
              console.log('Loaded existing company info from purchases:', purchase);
              setShowCompanyForm(false);
            } else {
              // Company info missing or is default, show company form
              setCompanyInfo({
                companyName: purchase?.company_name || '',
                email: purchase?.company_email || user.email || ''
              });
              console.log('Company info missing or default, showing company form');
              setShowCompanyForm(true);
            }
          } catch (error) {
            console.error('Error loading company info:', error);
            setCompanyInfo({
              companyName: '',
              email: user.email || ''
            });
            setShowCompanyForm(true);
          }
        } else {
          // No purchase ID, show company form
          setCompanyInfo({
            companyName: '',
            email: user.email || ''
          });
          setShowCompanyForm(true);
        }
      }
    };

    loadCompanyInfo();
  }, [user, currentPurchaseId]);

  // Load questions from database
  useEffect(() => {
    const loadQuestions = async () => {
      if (hasLoadedInitialData && questions.length > 0 && !document.hidden) {
        return;
      }

      try {
        setIsLoading(true);
        const { data: questionsData, error } = await supabase
          .from('questions')
          .select('*')
          .order('question_number');

        if (error) {
          setError('Failed to load questions. Please try again.');
          return;
        }

        setQuestions(questionsData || []);
        
        // Load existing answers if user is continuing a form
        if (user && currentPurchaseId) {
          const { data: existingAnswers, error: answersError } = await supabase
            .from('answers')
            .select('*')
            .eq('user_id', user.id)
            .eq('purchase_id', currentPurchaseId);

          if (!answersError && existingAnswers && existingAnswers.length > 0) {
            const answersMap: Record<number, Answer> = {};
            existingAnswers.forEach(answer => {
              answersMap[answer.question_id] = {
                question_id: answer.question_id,
                answer_text: answer.answer_text,
                answer_options: answer.answer_options
              };
            });
            setAnswers(answersMap);

            // Find the last answered question to resume from there
            if (questionsData) {
              const orderedQuestionIds = questionsData.map(q => q.id).sort((a, b) => a - b);
              
              let resumeIndex = 0;
              for (let i = 0; i < orderedQuestionIds.length; i++) {
                const questionId = orderedQuestionIds[i];
                if (!answersMap[questionId]) {
                  resumeIndex = i;
                  break;
                }
                if (i === orderedQuestionIds.length - 1) {
                  resumeIndex = i;
                }
              }
              
              setCurrentQuestionIndex(resumeIndex);
            }

            setShowCompanyForm(false);
          } else if (source === 'dashboard' && currentPurchaseId) {
            setShowCompanyForm(false);
          }
        }
        
        setHasLoadedInitialData(true);
      } catch (error) {
        setError('Failed to load questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!hasLoadedInitialData) {
      loadQuestions();
    }
  }, [user, currentPurchaseId, hasLoadedInitialData, source]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companyInfo.companyName && companyInfo.email) {
      if (user && currentPurchaseId && companyInfo.companyName !== 'Demo Company') {
        try {
          await supabase
            .from('purchases')
            .update({ 
              company_name: companyInfo.companyName,
              company_email: companyInfo.email 
            })
            .eq('id', currentPurchaseId)
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Error saving company info:', error);
        }
      }
      
      setShowCompanyForm(false);
    }
  };

  const saveAnswerToDatabase = async (questionId: number, answerData: Answer) => {
    if (!user || !currentPurchaseId) {
      return;
    }

    try {
      setIsSaving(true);
      
      console.log('Saving answer to database:', {
        questionId,
        answerData,
        questionType: currentQuestion?.format_type
      });
      
      const { error } = await supabase
        .from('answers')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          purchase_id: currentPurchaseId,
          answer_text: answerData.answer_text || null,
          answer_options: answerData.answer_options || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,question_id,purchase_id'
        });

      if (error) {
        console.error('Supabase error saving answer:', error);
        throw new Error('Database error: ' + error.message);
      }

      console.log(`Answer saved successfully for question ${questionId}`);
      
    } catch (error) {
      console.error('Error in saveAnswerToDatabase:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Updated answer change handler to handle percentage data
  const handleAnswerChange = (answer: string | string[] | Record<string, number>) => {
    if (!currentQuestion) return;

    let answerData: Answer = {
      question_id: currentQuestion.id
    };

    // Handle different answer types
    if (typeof answer === 'object' && !Array.isArray(answer)) {
      // Percentage data - store as JSON string in answer_text
      answerData.answer_text = JSON.stringify(answer);
    } else if (Array.isArray(answer)) {
      // Array data
      answerData.answer_options = answer;
    } else {
      // String data
      answerData.answer_text = answer;
    }

    setTempAnswer(answerData);
  };

  const handleNext = async () => {
    if (!tempAnswer && !answers[currentQuestion.id]) {
      setError('Please provide an answer before proceeding.');
      return;
    }

    const answerToSave = tempAnswer || answers[currentQuestion.id];
    
    if (answerToSave && user && currentPurchaseId) {
      try {
        await saveAnswerToDatabase(currentQuestion.id, answerToSave);
        
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: answerToSave }));
        setTempAnswer(null);
        setError('');

        const totalAnswered = Object.keys(answers).length + 1;
        if (totalAnswered === 1) {
          await supabase
            .from('purchases')
            .update({ report_status: 'form_started' })
            .eq('id', currentPurchaseId)
            .eq('user_id', user.id);
        }
        
      } catch (error) {
        setError('Failed to save answer. Please try again.');
        return;
      }
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = async () => {
    if (tempAnswer && user && currentPurchaseId) {
      try {
        await saveAnswerToDatabase(currentQuestion.id, tempAnswer);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: tempAnswer }));
        setTempAnswer(null);
      } catch (error) {
        setError('Failed to save answer. Please try again.');
        return;
      }
    }

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || !currentPurchaseId) {
      setError('Missing user or purchase information. Please try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Save the final answer
      if (tempAnswer) {
        await saveAnswerToDatabase(currentQuestion.id, tempAnswer);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: tempAnswer }));
      }

      // Update purchase status to form_completed
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ report_status: 'form_completed' })
        .eq('user_id', user.id)
        .eq('id', currentPurchaseId);

      if (updateError) {
        throw new Error('Failed to update completion status');
      }

      // Trigger AI analysis API call
      try {
        await AIAnalysisService.triggerAIAnalysis(currentPurchaseId);
      } catch (apiError) {
        console.error('AI analysis API call failed:', apiError);
      }

      // Navigate to processing page
      navigate('/processing', {
        state: {
          reportId,
          reportIds,
          paymentId: paymentId || paymentIntentFromUrl,
          purchaseId: currentPurchaseId,
          companyInfo,
          source,
          completedQuestions: questions.length,
          aiAnalysisTriggered: true
        }
      });

    } catch (error) {
      setError('Failed to submit form. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    // Always go to dashboard, regardless of how user got here
    navigate('/dashboard');
  };

  const getCurrentAnswer = () => {
    if (!currentQuestion) return null;
    
    if (tempAnswer && tempAnswer.question_id === currentQuestion.id) {
      // For percentage questions, parse JSON from answer_text
      if (currentQuestion.format_type === 'Checkboxes + % input' && tempAnswer.answer_text) {
        try {
          return JSON.parse(tempAnswer.answer_text);
        } catch {
          return {};
        }
      }
      return tempAnswer.answer_text || tempAnswer.answer_options || null;
    }
    
    const answer = answers[currentQuestion.id];
    if (!answer) return null;
    
    // For percentage questions, parse JSON from answer_text
    if (currentQuestion.format_type === 'Checkboxes + % input' && answer.answer_text) {
      try {
        return JSON.parse(answer.answer_text);
      } catch {
        return {};
      }
    }
    
    return answer.answer_text || answer.answer_options || null;
  };

  const isCurrentQuestionAnswered = () => {
    const answer = getCurrentAnswer();
    
    // Handle percentage answers
    if (currentQuestion?.format_type === 'Checkboxes + % input') {
      if (typeof answer === 'object' && !Array.isArray(answer) && answer !== null) {
        const percentageAnswer = answer as Record<string, number>;
        const total = Object.values(percentageAnswer).reduce((sum, val) => sum + val, 0);
        const hasSelections = Object.keys(percentageAnswer).length > 0;
        return hasSelections && Math.abs(total - 100) < 0.01;
      }
      return false;
    }
    
    // Handle array answers
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    
    // Handle string answers
    return answer && answer.toString().trim().length > 0;
  };

  // Loading states...
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No questions found. Please contact support.</p>
        </div>
      </div>
    );
  }

  if (showCompanyForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Marketing Audit</h2>
            <p className="text-gray-600 text-lg">Let's start with some basic information about your company</p>
            <div className="mt-4 text-sm text-gray-500">
              {questions.length} questions • Estimated time: 15-20 minutes
            </div>
          </div>
          
          <form onSubmit={handleCompanyInfoSubmit} className="space-y-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                value={companyInfo.companyName}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="Your Company Name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="your@company.com"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Start Audit ({questions.length} Questions)
            </button>
            
            <button
              type="button"
              onClick={handleBack}
              className="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-8 py-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-sm font-semibold text-gray-700">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="text-xs text-gray-500 mt-1">
                Section: {currentQuestion?.audit_section_tag}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-700">
                {Math.round(progress)}% Complete
              </span>
              {(isSaving || isSubmitting) && (
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <Save className="w-3 h-3 mr-1 animate-spin" />
                  {isSubmitting ? 'Submitting...' : 'Saving...'}
                </div>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-8 mt-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Question Content */}
        <div className="p-8 lg:p-12">
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 leading-tight">
              {currentQuestion?.question_text}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-4 mb-8 lg:mb-10">
            {/* Multiple Choice */}
            {(currentQuestion?.format_type === 'Multiple Choice' || currentQuestion?.format_type === 'Yes/No') && currentQuestion.response_options && (
              <div className="space-y-3 lg:space-y-4">
                {currentQuestion.response_options.map((option, index) => {
                  const currentAnswer = getCurrentAnswer();
                  const isSelected = currentAnswer === option;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerChange(option)}
                      disabled={isSaving || isSubmitting}
                      className={`w-full text-left p-4 lg:p-5 rounded-xl border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-900 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-sm lg:text-base">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi-select / Checkboxes */}
            {(currentQuestion?.format_type === 'Multi-select' || currentQuestion?.format_type === 'Checkboxes') && currentQuestion.response_options && (
              <div className="space-y-3 lg:space-y-4">
                {currentQuestion.response_options.map((option, index) => {
                  const currentAnswer = getCurrentAnswer() as string[] || [];
                  const isSelected = currentAnswer.includes(option);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        const currentSelections = (getCurrentAnswer() as string[]) || [];
                        if (isSelected) {
                          handleAnswerChange(currentSelections.filter(s => s !== option));
                        } else {
                          handleAnswerChange([...currentSelections, option]);
                        }
                      }}
                      disabled={isSaving || isSubmitting}
                      className={`w-full text-left p-4 lg:p-5 rounded-xl border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-900 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded border-2 mr-4 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-sm lg:text-base">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Checkboxes + % input - NEW QUESTION TYPE */}
            {currentQuestion?.format_type === 'Checkboxes + % input' && currentQuestion.response_options && (
              <CheckboxPercentageInput
                options={currentQuestion.response_options}
                value={getCurrentAnswer() as Record<string, number> || {}}
                onChange={handleAnswerChange}
                disabled={isSaving || isSubmitting}
              />
            )}

            {/* Text Input */}
            {(currentQuestion?.format_type === 'Short Text' || 
              currentQuestion?.format_type === 'Long Form' || 
              currentQuestion?.format_type === 'Multi-line Text') && (
              <div>
                {currentQuestion.format_type === 'Short Text' ? (
                  <input
                    type="text"
                    value={(getCurrentAnswer() as string) || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    disabled={isSaving || isSubmitting}
                    placeholder="Enter your answer..."
                    className="w-full p-4 lg:p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                ) : (
                  <textarea
                    value={(getCurrentAnswer() as string) || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    disabled={isSaving || isSubmitting}
                    placeholder="Please provide your detailed answer..."
                    className="w-full p-4 lg:p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-all duration-200 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={5}
                  />
                )}
              </div>
            )}

            {/* Slider */}
            {currentQuestion?.format_type === 'Slider' && (
              <div className="space-y-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={(getCurrentAnswer() as string) || '5'}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={isSaving || isSubmitting}
                  className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>1</span>
                  <span className="font-semibold text-blue-600 text-base lg:text-lg">
                    Current: {(getCurrentAnswer() as string) || '5'}
                  </span>
                  <span>10</span>
                </div>
              </div>
            )}

            {/* Fallback for unimplemented types */}
            {!['Multiple Choice', 'Yes/No', 'Multi-select', 'Checkboxes', 'Checkboxes + % input', 'Short Text', 'Long Form', 'Multi-line Text', 'Slider'].includes(currentQuestion?.format_type || '') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800">
                  Format type "{currentQuestion?.format_type}" not fully implemented. 
                  Please use the text area below:
                </p>
                <textarea
                  value={(getCurrentAnswer() as string) || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={isSaving || isSubmitting}
                  placeholder="Please provide your answer..."
                  className="w-full p-3 mt-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* SINGLE Navigation Section */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pt-6 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 order-2 lg:order-1">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || isSaving || isSubmitting}
                className="px-4 lg:px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-sm lg:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <button
                onClick={handleBack}
                disabled={isSaving || isSubmitting}
                className="px-4 lg:px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-sm lg:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
            </div>

            <div className="order-1 lg:order-2">
              {!isLastQuestion ? (
                <button
                  onClick={handleNext}
                  disabled={!isCurrentQuestionAnswered() || isSaving || isSubmitting}
                  className="w-full lg:w-auto px-6 lg:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center transition-all duration-200 text-sm lg:text-base"
                >
                  {isSaving ? (
                    <>
                      <Save className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!isCurrentQuestionAnswered() || isSaving || isSubmitting}
                  className="w-full lg:w-auto px-6 lg:px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center transition-all duration-200 text-sm lg:text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting & Starting AI Analysis...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Complete Audit & Start AI Analysis
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};