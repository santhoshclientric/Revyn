import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { CheckCircle, ArrowRight, ArrowLeft, Loader, Save } from 'lucide-react';

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

export const ReportForm: React.FC = () => {
  console.log('=== REPORT FORM COMPONENT MOUNTED ===');
  
  const { reportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  console.log('Initial props:', {
    reportId,
    locationState: location.state,
    searchParams: Object.fromEntries(searchParams.entries()),
    user: user ? { id: user.id, email: user.email } : null
  });
  
  // Get data from either location.state or URL params
  const { reportIds, paymentId, purchaseId, source } = location.state || {};
  const purchaseIdFromUrl = searchParams.get('purchase_id');
  const paymentIntentFromUrl = searchParams.get('payment_intent');
  const currentPurchaseId = purchaseId || purchaseIdFromUrl;
  
  console.log('Purchase ID resolution:', {
    purchaseId,
    purchaseIdFromUrl,
    currentPurchaseId,
    paymentId,
    paymentIntentFromUrl,
    source
  });
  
  // State management
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [companyInfo, setCompanyInfo] = useState({ companyName: '', email: '' });
  const [showCompanyForm, setShowCompanyForm] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingSave, setPendingSave] = useState<{ questionId: number; answer: Answer } | null>(null);
  
  // Track if data has been loaded to prevent reloading on tab switch
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Load questions from database
  useEffect(() => {
    const loadQuestions = async () => {
      // Skip loading if we've already loaded data and just returned to tab
      if (hasLoadedInitialData && questions.length > 0 && !document.hidden) {
        console.log('Skipping reload - data already loaded');
        return;
      }

      console.log('=== LOADING QUESTIONS ===');
      console.log('User:', user ? { id: user.id, email: user.email } : 'No user');
      console.log('Current purchase ID:', currentPurchaseId);
      
      try {
        setIsLoading(true);
        const { data: questionsData, error } = await supabase
          .from('questions')
          .select('*')
          .order('question_number');

        console.log('Questions loaded:', { count: questionsData?.length, error });

        if (error) {
          console.error('Error loading questions:', error);
          setError('Failed to load questions. Please try again.');
          return;
        }

        setQuestions(questionsData || []);
        
        // Load existing answers if user is continuing a form
        if (user && currentPurchaseId) {
          console.log('Loading existing answers for user:', user.id, 'purchase:', currentPurchaseId);
          
          const { data: existingAnswers, error: answersError } = await supabase
            .from('answers')
            .select('*')
            .eq('user_id', user.id)
            .eq('purchase_id', currentPurchaseId);

          console.log('Existing answers loaded:', { 
            count: existingAnswers?.length, 
            error: answersError,
            answers: existingAnswers 
          });

          if (!answersError && existingAnswers) {
            const answersMap: Record<number, Answer> = {};
            existingAnswers.forEach(answer => {
              answersMap[answer.question_id] = {
                question_id: answer.question_id,
                answer_text: answer.answer_text,
                answer_options: answer.answer_options
              };
            });
            console.log('Setting existing answers:', answersMap);
            setAnswers(answersMap);
          }
        } else {
          console.log('Not loading existing answers - missing user or purchaseId');
        }
        
        // Mark that initial data has been loaded
        setHasLoadedInitialData(true);
      } catch (error) {
        console.error('Error in loadQuestions:', error);
        setError('Failed to load questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if we haven't loaded initial data yet
    if (!hasLoadedInitialData) {
      loadQuestions();
    }
  }, [user, currentPurchaseId, hasLoadedInitialData]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleCompanyInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyInfo.companyName && companyInfo.email) {
      setShowCompanyForm(false);
    }
  };

  const saveAnswerToDatabase = async (questionId: number, answerData: Answer) => {
    if (!user || !currentPurchaseId) {
      console.log('Cannot save answer - missing user or purchaseId');
      return;
    }

    try {
      setIsSaving(true);
      
      // Upsert answer (insert or update if exists)
      const { error } = await supabase
        .from('answers')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          purchase_id: (currentPurchaseId),
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

      console.log(`Answer saved to database for question ${questionId}:`, {
        answer_text: answerData.answer_text,
        answer_options: answerData.answer_options
      });
      
    } catch (error) {
      console.error('Error in saveAnswerToDatabase:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnswer = (answer: string | string[]) => {
    if (!currentQuestion) return;

    const answerData: Answer = {
      question_id: currentQuestion.id,
      ...(Array.isArray(answer) 
        ? { answer_options: answer }
        : { answer_text: answer }
      )
    };

    // Update local state immediately for responsive UI
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answerData }));
    
    // For non-text inputs (multiple choice, checkboxes, sliders), save immediately
    // For text inputs, just store the pending save
    const isTextInput = ['Short Text', 'Long Form', 'Multi-line Text'].includes(currentQuestion.format_type);
    
    if (!isTextInput) {
      // Save immediately for multiple choice, checkboxes, sliders, etc.
      if (user && currentPurchaseId) {
        saveAnswerToDatabase(currentQuestion.id, answerData).catch(error => {
          console.error('Failed to save answer:', error);
          setError('Failed to save answer. Please try again.');
          setTimeout(() => setError(''), 3000);
        });
      }
    } else {
      // For text inputs, just mark that we have a pending save
      setPendingSave({ questionId: currentQuestion.id, answer: answerData });
    }
  };

  const handleNext = async () => {
    // Save any pending answer before moving to next question
    if (pendingSave && user && currentPurchaseId) {
      try {
        await saveAnswerToDatabase(pendingSave.questionId, pendingSave.answer);
        setPendingSave(null);
      } catch (error) {
        console.error('Failed to save answer:', error);
        setError('Failed to save answer. Please try again.');
        return; // Don't proceed to next question if save failed
      }
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = async () => {
    // Save any pending answer before moving to previous question
    if (pendingSave && user && currentPurchaseId) {
      try {
        await saveAnswerToDatabase(pendingSave.questionId, pendingSave.answer);
        setPendingSave(null);
      } catch (error) {
        console.error('Failed to save answer:', error);
        setError('Failed to save answer. Please try again.');
        return; // Don't proceed to previous question if save failed
      }
    }

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Save any pending answer before submitting
      if (pendingSave && user && currentPurchaseId) {
        await saveAnswerToDatabase(pendingSave.questionId, pendingSave.answer);
        setPendingSave(null);
      }

      // Navigate to completion
      navigate('/processing', {
        state: {
          reportId,
          reportIds,
          paymentId: paymentId || paymentIntentFromUrl,
          purchaseId: currentPurchaseId,
          companyInfo,
          source,
          completedQuestions: questions.length
        }
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to submit form. Please try again.');
    }
  };

  const handleBack = () => {
    // Determine where to go back based on how user arrived
    if (source === 'dashboard' || purchaseIdFromUrl) {
      navigate('/dashboard');
    } else if (paymentId || paymentIntentFromUrl) {
      navigate('/payment');
    } else {
      navigate('/reports');
    }
  };

  const getCurrentAnswer = () => {
    if (!currentQuestion) return null;
    const answer = answers[currentQuestion.id];
    return answer?.answer_text || answer?.answer_options || null;
  };

  const isCurrentQuestionAnswered = () => {
    const answer = getCurrentAnswer();
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    return answer && answer.toString().trim().length > 0;
  };

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

  if (error) {
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
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-10">
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
              Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
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
              {isSaving && (
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <Save className="w-3 h-3 mr-1 animate-spin" />
                  Saving answer...
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

        {/* Question Content */}
        <div className="p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
              {currentQuestion?.question_text}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-4 mb-10">
            {(currentQuestion?.format_type === 'Multiple Choice' || currentQuestion?.format_type === 'Yes/No') && currentQuestion.response_options && (
              <div className="space-y-4">
                {currentQuestion.response_options.map((option, index) => {
                  const currentAnswer = getCurrentAnswer();
                  const isSelected = currentAnswer === option;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
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
                        <span className="font-medium">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion?.format_type === 'Multi-select' && currentQuestion.response_options && (
              <div className="space-y-4">
                {currentQuestion.response_options.map((option, index) => {
                  const currentAnswer = getCurrentAnswer() as string[] || [];
                  const isSelected = currentAnswer.includes(option);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        const currentSelections = (getCurrentAnswer() as string[]) || [];
                        if (isSelected) {
                          handleAnswer(currentSelections.filter(s => s !== option));
                        } else {
                          handleAnswer([...currentSelections, option]);
                        }
                      }}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
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
                        <span className="font-medium">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {(currentQuestion?.format_type === 'Short Text' || 
              currentQuestion?.format_type === 'Long Form' || 
              currentQuestion?.format_type === 'Multi-line Text') && (
              <div>
                {currentQuestion.format_type === 'Short Text' ? (
                  <input
                    type="text"
                    value={(getCurrentAnswer() as string) || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200"
                  />
                ) : (
                  <textarea
                    value={(getCurrentAnswer() as string) || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="Please provide your detailed answer..."
                    className="w-full p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-all duration-200"
                    rows={4}
                  />
                )}
              </div>
            )}

            {currentQuestion?.format_type === 'Slider' && (
              <div className="space-y-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={(getCurrentAnswer() as string) || '5'}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>1</span>
                  <span className="font-semibold text-blue-600">
                    Current: {(getCurrentAnswer() as string) || '5'}
                  </span>
                  <span>10</span>
                </div>
              </div>
            )}

            {/* Placeholder for other format types */}
            {!['Multiple Choice', 'Yes/No', 'Multi-select', 'Short Text', 'Long Form', 'Multi-line Text', 'Slider'].includes(currentQuestion?.format_type || '') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800">
                  Format type "{currentQuestion?.format_type}" not yet implemented. 
                  Please use the text area below:
                </p>
                <textarea
                  value={(getCurrentAnswer() as string) || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Please provide your answer..."
                  className="w-full p-3 mt-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-6 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 order-2 sm:order-1">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || isSaving}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <button
                onClick={handleBack}
                disabled={isSaving}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {source === 'dashboard' || purchaseIdFromUrl ? 'Dashboard' : 'Reports'}
              </button>
            </div>

            <div className="order-1 sm:order-2">
              {!isLastQuestion ? (
                <button
                  onClick={handleNext}
                  disabled={!isCurrentQuestionAnswered() || isSaving}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center transition-all duration-200"
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
                  disabled={!isCurrentQuestionAnswered() || isSaving}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center transition-all duration-200"
                >
                  {isSaving ? (
                    <>
                      <Save className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Audit
                      <CheckCircle className="w-4 h-4 ml-2" />
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