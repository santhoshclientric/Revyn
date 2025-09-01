// Fixed ReportForm.tsx with comprehensive improvements

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  memo
} from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { CheckCircle, ArrowRight, ArrowLeft, Loader, Save, Zap, AlertCircle } from 'lucide-react';
import CheckboxPercentageInput from './CheckboxPercentageInput';

// Types
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
  file_url?: string;
}

interface CompanyInfo {
  companyName: string;
  email: string;
}

interface SocialAccount {
  platform: string;
  url: string;
}

type AnswerValue = string | string[] | Record<string, number>;

// Constants
const SOCIAL_PLATFORMS = [
  { value: '', label: 'Select Platform' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Pinterest', label: 'Pinterest' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Medium', label: 'Medium' }
] as const;

const SKIP_LOGIC = {
  34: {
    skipCondition: (answer: string) => answer === "No",
    skipToQuestion: 36
  }
} as const;

const CONDITIONAL_FILE_UPLOAD = {
  12: {
    condition: (answer: string) => answer === "Yes",
    prompt: "Please upload your brand colour guide"
  },
  13: {
    condition: (answer: string) => answer === "Yes",
    prompt: "Please upload your brand voice or tone guide"
  }
} as const;

const ACCEPTED_FILE_TYPES = {
  'image/*': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'text/plain': ['txt']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Utility functions
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const validateFileType = (file: File): boolean => {
  const validExtensions = Object.values(ACCEPTED_FILE_TYPES).flat();
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return validExtensions.includes(fileExtension || '');
};

const isArrayAnswer = (answer: AnswerValue): answer is string[] => {
  return Array.isArray(answer);
};

const isObjectAnswer = (answer: AnswerValue): answer is Record<string, number> => {
  return typeof answer === 'object' && !Array.isArray(answer) && answer !== null;
};

const isStringAnswer = (answer: AnswerValue): answer is string => {
  return typeof answer === 'string';
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ReportForm Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// AI Service with proper error handling
class AIAnalysisService {
  private static readonly SERVER_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  private static readonly TIMEOUT = 30000; // 30 seconds

  static async triggerAIAnalysis(purchaseId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      console.log('Triggering AI analysis via server for purchase:', purchaseId);
      
      const response = await fetch(`${this.SERVER_API_URL}/api/trigger-ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_id: purchaseId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('AI analysis triggered successfully:', result);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      console.error('Error triggering AI analysis:', error);
      throw error;
    }
  }
}

// Main component
export const ReportForm: React.FC = memo(() => {
  console.log('=== REPORT FORM COMPONENT MOUNTED ===');
  
  const { reportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Refs for cleanup and focus management
  const abortControllerRef = useRef<AbortController | null>(null);
  const focusRef = useRef<HTMLButtonElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get data from either location.state or URL params
  const { reportIds, paymentId, purchaseId, source } = location.state || {};
  const purchaseIdFromUrl = searchParams.get('purchase_id');
  const paymentIntentFromUrl = searchParams.get('payment_intent');
  const currentPurchaseId = purchaseId || purchaseIdFromUrl;
  
  // State management with better typing
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [tempAnswer, setTempAnswer] = useState<Answer | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ companyName: '', email: '' });
  const [showCompanyForm, setShowCompanyForm] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [companyInfoChecked, setCompanyInfoChecked] = useState(false);

  // Other option state
  const [otherInputValue, setOtherInputValue] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState<boolean>(false);
  
  // File upload state with better typing
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([{platform: '', url: ''}]);
  const [showConditionalUpload, setShowConditionalUpload] = useState<Record<number, boolean>>({});

  // Memoized values
  const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);
  const progress = useMemo(() => 
    questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0, 
    [currentQuestionIndex, questions.length]
  );
  const isLastQuestion = useMemo(() => 
    currentQuestionIndex === questions.length - 1, 
    [currentQuestionIndex, questions.length]
  );

  // Memoized current answer calculation
  const getCurrentAnswer = useCallback((): AnswerValue | null => {
    if (!currentQuestion) return null;
    
    if (tempAnswer && tempAnswer.question_id === currentQuestion.id) {
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
    
    // Handle question 53 social media data
    if (currentQuestion.question_number === 53 && answer.answer_text) {
      try {
        return JSON.parse(answer.answer_text);
      } catch {
        return answer.answer_text;
      }
    }
    
    if (currentQuestion.format_type === 'Checkboxes + % input' && answer.answer_text) {
      try {
        return JSON.parse(answer.answer_text);
      } catch {
        return {};
      }
    }
    
    return answer.answer_text || answer.answer_options || null;
  }, [currentQuestion, tempAnswer, answers]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Social media handlers with proper error handling
  const addSocialAccount = useCallback(() => {
    setSocialAccounts(prev => [...prev, {platform: '', url: ''}]);
  }, []);
  
  const removeSocialAccount = useCallback((index: number) => {
    if (index < 0 || index >= socialAccounts.length) return;
    setSocialAccounts(prev => prev.filter((_, i) => i !== index));
  }, [socialAccounts.length]);
  
  const updateSocialAccount = useCallback((index: number, field: keyof SocialAccount, value: string) => {
    if (index < 0 || index >= socialAccounts.length) return;
    setSocialAccounts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, [socialAccounts.length]);

  const handleSocialAccountsSubmit = useCallback(() => {
    const validAccounts = socialAccounts.filter(account => 
      account.platform && account.url.trim()
    );
  
    if (validAccounts.length === 0) {
      setError('Please add at least one social media account.');
      return;
    }
  
    // Validate URLs
    for (const account of validAccounts) {
      try {
        new URL(account.url);
      } catch {
        setError(`Invalid URL for ${account.platform}: ${account.url}`);
        return;
      }
    }
  
    const socialMediaData: Record<string, string> = {};
    validAccounts.forEach(account => {
      socialMediaData[account.platform] = account.url.trim();
    });
  
    const socialAnswer = JSON.stringify(socialMediaData);
    handleAnswerChange(socialAnswer, false);
  }, [socialAccounts]);

  // Initialize company info with better error handling
  useEffect(() => {
    let isMounted = true;

    const loadCompanyInfo = async () => {
      if (!user) {
        if (isMounted) setCompanyInfoChecked(true);
        return;
      }

      try {
        if (currentPurchaseId) {
          const { data: purchase, error } = await supabase
            .from('purchases')
            .select('company_name, company_email')
            .eq('id', currentPurchaseId)
            .eq('user_id', user.id)
            .single();

          if (!isMounted) return;

          if (!error && purchase) {
            setCompanyInfo({
              companyName: purchase.company_name || '',
              email: purchase.company_email || user.email || ''
            });

            const hasValidCompanyInfo = purchase.company_name && 
                purchase.company_name.trim() !== '' && 
                purchase.company_name !== 'Demo Company' &&
                purchase.company_email &&
                purchase.company_email.trim() !== '';

            setShowCompanyForm(!hasValidCompanyInfo);
            console.log(hasValidCompanyInfo ? 'Valid company info found' : 'Invalid company info', purchase);
          } else {
            console.log('No purchase found or error:', error);
            setCompanyInfo({
              companyName: '',
              email: user.email || ''
            });
            setShowCompanyForm(true);
          }
        } else {
          setCompanyInfo({
            companyName: '',
            email: user.email || ''
          });
          setShowCompanyForm(true);
        }
      } catch (error) {
        console.error('Error loading company info:', error);
        if (isMounted) {
          setCompanyInfo({
            companyName: '',
            email: user.email || ''
          });
          setShowCompanyForm(true);
        }
      } finally {
        if (isMounted) setCompanyInfoChecked(true);
      }
    };

    if (!companyInfoChecked) {
      loadCompanyInfo();
    }

    return () => {
      isMounted = false;
    };
  }, [user, currentPurchaseId, companyInfoChecked]);

  // Load questions with proper cleanup
  useEffect(() => {
    if (!companyInfoChecked) return;
    if (hasLoadedInitialData && questions.length > 0) return;

    let isMounted = true;
    abortControllerRef.current = new AbortController();

    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        setError('');

        const { data: questionsData, error } = await supabase
          .from('questions')
          .select('*')
          .order('question_number');

        if (!isMounted) return;

        if (error) {
          throw new Error('Failed to load questions');
        }

        setQuestions(questionsData || []);
        
        if (user && currentPurchaseId && !showCompanyForm && questionsData) {
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
                answer_options: answer.answer_options,
                file_url: answer.file_url
              };
            });
            
            if (isMounted) {
              setAnswers(answersMap);

              // Find resume point
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
          }
        }
        
        if (isMounted) setHasLoadedInitialData(true);
      } catch (error) {
        console.error('Error loading questions:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to load questions');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadQuestions();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, currentPurchaseId, companyInfoChecked, showCompanyForm, hasLoadedInitialData, questions.length]);

  // Load social accounts for question 53
  useEffect(() => {
    if (currentQuestion?.question_number === 53) {
      const existingAnswer = answers[currentQuestion.id];
      if (existingAnswer?.answer_text) {
        try {
          const socialData = JSON.parse(existingAnswer.answer_text);
          const loadedAccounts = Object.entries(socialData).map(([platform, url]) => ({
            platform,
            url: url as string
          }));
          setSocialAccounts(loadedAccounts.length > 0 ? loadedAccounts : [{platform: '', url: ''}]);
        } catch {
          setSocialAccounts([{platform: '', url: ''}]);
        }
      } else {
        setSocialAccounts([{platform: '', url: ''}]);
      }
    }
  }, [currentQuestion?.question_number, answers, currentQuestion?.id]);

  // Enhanced save function with debouncing and race condition protection
  const saveAnswerToDatabase = useCallback(async (questionId: number, answerData: Answer) => {
    if (!user || !currentPurchaseId) {
      console.log('Cannot save: missing user or purchaseId');
      throw new Error('Missing user or purchase information');
    }
  
    try {
      setIsSaving(true);
      
      console.log('Saving answer to database:', {
        questionId,
        answerData,
        questionType: currentQuestion?.format_type,
        userId: user.id,
        purchaseId: currentPurchaseId
      });
      
      const upsertData = {
        user_id: user.id,
        question_id: questionId,
        purchase_id: currentPurchaseId,
        answer_text: answerData.answer_text || null,
        answer_options: answerData.answer_options || null,
        file_url: answerData.file_url || null,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('answers')
        .upsert(upsertData, {
          onConflict: 'user_id,question_id,purchase_id'
        })
        .select();
  
      if (error) {
        console.error('Supabase error saving answer:', error);
        throw new Error('Database error: ' + error.message);
      }
  
      console.log('Answer saved successfully:', data);
        
    } catch (error) {
      console.error('Error in saveAnswerToDatabase:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user, currentPurchaseId, currentQuestion?.format_type]);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(saveAnswerToDatabase, 500),
    [saveAnswerToDatabase]
  );

  // Enhanced skip logic with proper type handling
  const findNextQuestionIndex = useCallback((currentIndex: number, currentAnswer: AnswerValue): number => {
    const question = questions[currentIndex];
    const skipRule = SKIP_LOGIC[question?.question_number as keyof typeof SKIP_LOGIC];
    
    if (skipRule && isStringAnswer(currentAnswer) && skipRule.skipCondition(currentAnswer)) {
      console.log(`Skip logic triggered for question ${question.question_number}`);
      
      const targetQuestionIndex = questions.findIndex(q => q.question_number === skipRule.skipToQuestion);
      
      if (targetQuestionIndex !== -1) {
        console.log(`Skipping to question index ${targetQuestionIndex}`);
        return targetQuestionIndex;
      }
    }
    
    return currentIndex + 1;
  }, [questions]);

  const getDisplayQuestionNumber = useCallback(() => {
    return currentQuestionIndex + 1;
  }, [currentQuestionIndex]);

  const getActualProgress = useCallback(() => {
    const answeredCount = Object.keys(answers).length;
    return ((answeredCount / questions.length) * 100);
  }, [answers, questions.length]);
  

  const handleFileUpload = useCallback(async (file: File, questionId: number) => {
    if (!validateFileType(file)) {
      throw new Error('Please upload images, PDF, Word, Excel, or text files only.');
    }
  
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 10MB.');
    }
  
    if (!user || !currentPurchaseId) {
      throw new Error('User session expired. Please refresh and try again.');
    }
  
    try {
      setUploadingFiles(prev => ({ ...prev, [questionId]: true }));
      setError('');
  
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${user.id}/${currentPurchaseId}/${questionId}/${fileName}`;
  
      console.log('Uploading file:', { fileName, fileSize: file.size, fileType: file.type });
  
      const { error: uploadError } = await supabase.storage
        .from('audit-files')
        .upload(filePath, file);
  
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
  
      const { data: { publicUrl } } = supabase.storage
        .from('audit-files')
        .getPublicUrl(filePath);
  
      const answerData: Answer = {
        question_id: questionId,
        answer_text: file.name,
        file_url: publicUrl
      };
  
      await saveAnswerToDatabase(questionId, answerData);
      
      setAnswers(prev => ({ ...prev, [questionId]: answerData }));
      setTempAnswer(null);
  
      console.log('File upload completed successfully');
  
      // CRITICAL FIX: Reset file input to allow re-upload after failure
      const fileInput = document.getElementById(`file-upload-${questionId}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
  
    } catch (error) {
      console.error('File upload error:', error);
      
      // CRITICAL FIX: Reset file input on error to allow retry
      const fileInput = document.getElementById(`file-upload-${questionId}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      throw error;
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionId]: false }));
    }
  }, [user, currentPurchaseId, saveAnswerToDatabase, supabase]);
  
  // Enhanced answer change handler with proper type guards
  const handleAnswerChange = useCallback((answer: AnswerValue, autoProgress: boolean = false) => {
    console.log('=== HANDLE ANSWER CHANGE ===');
    console.log('Raw answer:', answer);
    
    if (!currentQuestion) {
      console.error('No current question');
      return;
    }

    setError(''); // Clear any existing errors
  
    let answerData: Answer = {
      question_id: currentQuestion.id
    };
  
    // Handle "Other" selection for MCQ and Multi-select
    if (isStringAnswer(answer) && answer === 'Other') {
      console.log('Other option selected');
      setShowOtherInput(true);
      setOtherInputValue('');
      answerData.answer_text = answer;
      setTempAnswer(answerData);
      return;
    }

    // Check for conditional file upload trigger
    const conditionalUpload = CONDITIONAL_FILE_UPLOAD[currentQuestion.question_number as keyof typeof CONDITIONAL_FILE_UPLOAD];
    if (conditionalUpload && isStringAnswer(answer)) {
      if (conditionalUpload.condition(answer)) {
        console.log(`Conditional file upload triggered for question ${currentQuestion.question_number}`);
        setShowConditionalUpload(prev => ({ ...prev, [currentQuestion.id]: true }));
        answerData.answer_text = answer;
        setTempAnswer(answerData);
        return;
      } else {
        setShowConditionalUpload(prev => ({ ...prev, [currentQuestion.id]: false }));
      }
    }
  
    // Handle different answer types with proper type guards
    if (isObjectAnswer(answer)) {
      answerData.answer_text = JSON.stringify(answer);
    } else if (isArrayAnswer(answer)) {
      if (answer.includes('Other')) {
        setShowOtherInput(true);
        if (!otherInputValue) {
          answerData.answer_options = answer;
          setTempAnswer(answerData);
          return;
        } else {
          const otherIndex = answer.indexOf('Other');
          const modifiedAnswer = [...answer];
          modifiedAnswer[otherIndex] = otherInputValue.trim();
          answerData.answer_options = modifiedAnswer;
        }
      } else {
        setShowOtherInput(false);
        setOtherInputValue('');
        answerData.answer_options = answer;
      }
    } else if (isStringAnswer(answer)) {
      answerData.answer_text = answer;
      setShowOtherInput(false);
      setOtherInputValue('');
    }
  
    setTempAnswer(answerData);
    
    // Auto-progress logic with proper conditions
    if (autoProgress && 
        (currentQuestion?.format_type === 'Multiple Choice' || currentQuestion?.format_type === 'Yes/No') &&
        answer !== 'Other' &&
        !showConditionalUpload[currentQuestion.id]) {
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          if (user && currentPurchaseId) {
            await saveAnswerToDatabase(currentQuestion.id, answerData);
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: answerData }));
            setTempAnswer(null);
  
            const totalAnswered = Object.keys(answers).length + 1;
            if (totalAnswered === 1) {
              await supabase
                .from('purchases')
                .update({ report_status: 'form_started' })
                .eq('id', currentPurchaseId)
                .eq('user_id', user.id);
            }
            
            const nextQuestionIndex = findNextQuestionIndex(currentQuestionIndex, answer);
            
            if (nextQuestionIndex < questions.length) {
              setCurrentQuestionIndex(nextQuestionIndex);
              // Focus management for accessibility
              setTimeout(() => {
                focusRef.current?.focus();
              }, 100);
            }
          }
        } catch (error) {
          console.error('Auto-progress error:', error);
          setError('Failed to save answer. Please try again.');
        }
      }, 300);
    }
  }, [currentQuestion, showConditionalUpload, otherInputValue, user, currentPurchaseId, saveAnswerToDatabase, answers, findNextQuestionIndex, currentQuestionIndex, questions.length]);

  // Enhanced conditional file upload handler
  const handleConditionalFileUpload = useCallback(async (file: File, questionId: number) => {
    try {
      const yesAnswer: Answer = {
        question_id: questionId,
        answer_text: "Yes"
      };
      
      await saveAnswerToDatabase(questionId, yesAnswer);
      await handleFileUpload(file, questionId);

      setShowConditionalUpload(prev => ({ ...prev, [questionId]: false }));

      const nextQuestionIndex = findNextQuestionIndex(currentQuestionIndex, "Yes");
      if (nextQuestionIndex < questions.length) {
        setCurrentQuestionIndex(nextQuestionIndex);
      }

    } catch (error) {
      console.error('Conditional file upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    }
  }, [saveAnswerToDatabase, handleFileUpload, findNextQuestionIndex, currentQuestionIndex, questions.length]);

  const handleConditionalNo = useCallback(async (questionId: number) => {
    try {
      const noAnswer: Answer = {
        question_id: questionId,
        answer_text: "No"
      };

      await saveAnswerToDatabase(questionId, noAnswer);
      setAnswers(prev => ({ ...prev, [questionId]: noAnswer }));
      setShowConditionalUpload(prev => ({ ...prev, [questionId]: false }));
      setTempAnswer(null);
      setError('');

      const nextQuestionIndex = findNextQuestionIndex(currentQuestionIndex, "No");
      if (nextQuestionIndex < questions.length) {
        setCurrentQuestionIndex(nextQuestionIndex);
      }

    } catch (error) {
      console.error('Error saving No answer:', error);
      setError('Failed to save answer. Please try again.');
    }
  }, [saveAnswerToDatabase, findNextQuestionIndex, currentQuestionIndex, questions.length]);

  const handleFileRemove = useCallback(async (questionId: number) => {
    if (!user || !currentPurchaseId) return;

    try {
      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .eq('purchase_id', currentPurchaseId);

      if (error) {
        throw new Error('Failed to remove file from database');
      }

      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });

      console.log('File removed successfully');

    } catch (error) {
      console.error('File removal error:', error);
      setError('Failed to remove file. Please try again.');
    }
  }, [user, currentPurchaseId]);

  // Enhanced validation function - MOVED BEFORE handleNext
  const isCurrentQuestionAnswered = useCallback(() => {
    const answer = getCurrentAnswer();
    
    if (showOtherInput && !otherInputValue.trim()) {
      return false;
    }

    if (currentQuestion?.question_number === 53) {
      if (answers[currentQuestion.id]?.answer_text) {
        return true;
      }
      const validAccounts = socialAccounts.filter(account => 
        account.platform && account.url.trim()
      );
      return validAccounts.length > 0;
    }
      
    const conditionalUpload = CONDITIONAL_FILE_UPLOAD[currentQuestion?.question_number as keyof typeof CONDITIONAL_FILE_UPLOAD];
    if (conditionalUpload) {
      const currentAnswer = isStringAnswer(answer) ? answer : '';
      if (conditionalUpload.condition(currentAnswer)) {
        return !!answers[currentQuestion.id]?.file_url;
      } else {
        return !!answer;
      }
    }
    
    if (currentQuestion?.format_type === 'File Upload') {
      return !!answers[currentQuestion.id]?.file_url;
    }
    
    if (currentQuestion?.format_type === 'Checkboxes + % input') {
      if (isObjectAnswer(answer)) {
        const total = Object.values(answer).reduce((sum, val) => sum + val, 0);
        const hasSelections = Object.keys(answer).length > 0;
        return hasSelections && Math.abs(total - 100) < 0.01;
      }
      return false;
    }
    
    if (isArrayAnswer(answer)) {
      return answer.length > 0;
    }
    
    return answer !== null && answer !== undefined && String(answer).trim().length > 0;
  }, [getCurrentAnswer, showOtherInput, otherInputValue, currentQuestion, answers, socialAccounts]);

  // Enhanced navigation handlers
  const handleNext = useCallback(async () => {
    console.log('=== HANDLE NEXT CALLED ===');
    console.log('Current question index:', currentQuestionIndex);
    console.log('Total questions:', questions.length);
    console.log('Is last question:', isLastQuestion);
    
    if (!isCurrentQuestionAnswered()) {
      setError('Please answer this question before continuing.');
      return;
    }
  
    setError('');
  
    // Handle Q53 social media accounts - save on Next instead of button
    if (currentQuestion?.question_number === 53) {
      const validAccounts = socialAccounts.filter(account => 
        account.platform && account.url.trim()
      );
    
      if (validAccounts.length === 0) {
        setError('Please add at least one social media account.');
        return;
      }
  
      const accountsData = validAccounts.reduce((acc, account) => {
        acc[account.platform] = account.url.trim();
        return acc;
      }, {} as Record<string, string>);
  
      const socialAnswer: Answer = {
        question_id: currentQuestion.id,
        answer_text: JSON.stringify(accountsData)
      };
  
      try {
        await saveAnswerToDatabase(currentQuestion.id, socialAnswer);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: socialAnswer }));
        console.log('Social media accounts saved successfully');
      } catch (error) {
        console.error('Error saving social media accounts:', error);
        setError('Failed to save social media accounts. Please try again.');
        return;
      }
    }
  
    // Handle temporary answers
    if (tempAnswer && user && currentPurchaseId) {
      try {
        await saveAnswerToDatabase(currentQuestion.id, tempAnswer);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: tempAnswer }));
        setTempAnswer(null);
        setError('');
  
        // Update form started status on first answer
        const totalAnswered = Object.keys(answers).length + 1;
        if (totalAnswered === 1) {
          await supabase
            .from('purchases')
            .update({ report_status: 'form_started' })
            .eq('id', currentPurchaseId)
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error saving answer:', error);
        setError('Failed to save answer. Please try again.');
        return;
      }
    }
  
    // CRITICAL FIX: Handle last question (Q80) - trigger complete audit
    if (isLastQuestion) {
      console.log('Last question reached, triggering complete audit');
      await handleSubmit();
      return;
    }
  
    // Move to next question with skip logic
    const currentAnswer = getCurrentAnswer();
    const nextQuestionIndex = findNextQuestionIndex(currentQuestionIndex, currentAnswer);
    
    if (nextQuestionIndex < questions.length) {
      setCurrentQuestionIndex(nextQuestionIndex);
      setTimeout(() => {
        focusRef.current?.focus();
      }, 100);
    } else {
      // Fallback - if we somehow exceed questions length, trigger complete
      console.log('Exceeded questions length, triggering complete audit');
      await handleSubmit();
    }
  }, [
    isCurrentQuestionAnswered, 
    currentQuestion, 
    socialAccounts, 
    saveAnswerToDatabase, 
    tempAnswer, 
    user, 
    currentPurchaseId, 
    answers, 
    supabase,
    isLastQuestion,
    handleSubmit,
    getCurrentAnswer,
    findNextQuestionIndex,
    currentQuestionIndex,
    questions.length
  ]);
  const handleOtherTextSubmit = useCallback(() => {
    if (!otherInputValue.trim()) {
      setError('Please provide text for "Other" option.');
      return;
    }
  
    const currentAnswer = getCurrentAnswer();
    
    if (currentQuestion?.format_type === 'Multiple Choice' || currentQuestion?.format_type === 'Yes/No') {
      const finalAnswer = otherInputValue.trim();
      handleAnswerChange(finalAnswer, true);
    } else if (currentQuestion?.format_type === 'Multi-select' || currentQuestion?.format_type === 'Checkboxes') {
      const currentSelections = isArrayAnswer(currentAnswer) ? currentAnswer : [];
      const otherIndex = currentSelections.indexOf('Other');
      if (otherIndex !== -1) {
        const updatedSelections = [...currentSelections];
        updatedSelections[otherIndex] = otherInputValue.trim();
        handleAnswerChange(updatedSelections);
      }
    }
    
    setShowOtherInput(false);
    setOtherInputValue('');
  }, [otherInputValue, getCurrentAnswer, currentQuestion?.format_type, handleAnswerChange]);

  const handlePrevious = useCallback(async () => {
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
      setTimeout(() => {
        focusRef.current?.focus();
      }, 100);
    }
  }, [tempAnswer, user, currentPurchaseId, saveAnswerToDatabase, currentQuestion?.id, currentQuestionIndex]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    // Don't trigger on textarea with Ctrl+Enter or Shift+Enter
    if (e.target instanceof HTMLTextAreaElement && (e.ctrlKey || e.shiftKey)) {
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // For multi-select questions, save current selection first
      if (currentQuestion?.format_type === 'Multi-select' || currentQuestion?.format_type === 'Checkboxes') {
        const currentAnswer = getCurrentAnswer();
        if (currentAnswer && Array.isArray(currentAnswer) && currentAnswer.length > 0) {
          // Save the multi-select answer before proceeding
          handleAnswerChange(currentAnswer, false); // Don't auto-progress
          setTimeout(() => {
            handleNext();
          }, 100);
          return;
        }
      }
      
      // For Q53, validate social media accounts
      if (currentQuestion?.question_number === 53) {
        const validAccounts = socialAccounts.filter(account => 
          account.platform && account.url.trim()
        );
        if (validAccounts.length === 0) {
          setError('Please add at least one social media account.');
          return;
        }
      }
      
      handleNext();
    }
  }, [currentQuestion, getCurrentAnswer, handleAnswerChange, handleNext, socialAccounts]);
  
  const handleSubmit = useCallback(async () => {
    if (!user || !currentPurchaseId) {
      setError('Missing user or purchase information. Please try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      if (tempAnswer) {
        await saveAnswerToDatabase(currentQuestion.id, tempAnswer);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: tempAnswer }));
      }

      const { error: updateError } = await supabase
        .from('purchases')
        .update({ report_status: 'form_completed' })
        .eq('user_id', user.id)
        .eq('id', currentPurchaseId);

      if (updateError) {
        throw new Error('Failed to update completion status');
      }

      try {
        await AIAnalysisService.triggerAIAnalysis(currentPurchaseId);
      } catch (apiError) {
        console.error('AI analysis API call failed:', apiError);
      }

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
      console.error('Submit error:', error);
      setError('Failed to submit form. Please try again.');
      setIsSubmitting(false);
    }
  }, [user, currentPurchaseId, tempAnswer, saveAnswerToDatabase, currentQuestion?.id, navigate, reportId, reportIds, paymentId, paymentIntentFromUrl, companyInfo, source, questions.length]);

  const handleBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleCompanyInfoSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyInfo.companyName.trim() || !companyInfo.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyInfo.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (user && currentPurchaseId && companyInfo.companyName !== 'Demo Company') {
      try {
        const { error } = await supabase
          .from('purchases')
          .update({ 
            company_name: companyInfo.companyName,
            company_email: companyInfo.email 
          })
          .eq('id', currentPurchaseId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error saving company info:', error);
          setError('Failed to save company information. Please try again.');
          return;
        }
      } catch (error) {
        console.error('Error saving company info:', error);
        setError('Failed to save company information. Please try again.');
        return;
      }
    }
    
    setShowCompanyForm(false);
    setError('');
  }, [companyInfo, user, currentPurchaseId]);

  // Loading states with proper error boundaries
  if (isLoading || !companyInfoChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            {!companyInfoChecked ? 'Checking company information...' : 'Loading questions...'}
          </p>
        </div>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4 text-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No questions found. Please contact support.</p>
          <button 
            onClick={handleBack}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showCompanyForm) {
    return (
      <ErrorBoundary fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white rounded-2xl shadow-lg p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Something went wrong. Please refresh the page.</p>
          </div>
        </div>
      }>
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
                  aria-describedby="company-name-help"
                />
                <p id="company-name-help" className="mt-1 text-sm text-gray-500">
                  Enter your official company name
                </p>
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
                  aria-describedby="email-help"
                />
                <p id="email-help" className="mt-1 text-sm text-gray-500">
                  We'll use this to send your completed audit report
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg" role="alert">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin inline mr-2" />
                    Saving...
                  </>
                ) : (
                  `Start Audit (${questions.length} Questions)`
                )}
              </button>
              
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
            </form>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Something went wrong with the form.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
         
          {/* Progress Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-8 py-6">
  <div className="flex justify-between items-center mb-2">
    <div>
      <span className="text-sm font-semibold text-gray-700">
        Question {getDisplayQuestionNumber()} of {questions.length}
      </span>
      <div className="text-xs text-gray-500 mt-1">
        Section: {currentQuestion?.audit_section_tag}
      </div>
    </div>
    <div className="text-right">
      <span className="text-sm font-semibold text-gray-700">
        {Math.round(getActualProgress())}% Complete
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
      style={{ width: `${getActualProgress()}%` }}
      role="progressbar"
      aria-valuenow={Math.round(getActualProgress())}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${Math.round(getActualProgress())}% complete`}
    />
  </div>
</div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-8 mt-4" role="alert">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Question Content */}
          <div className="p-8 lg:p-12">
            <div className="mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 leading-tight">
                {currentQuestion?.question_text}
              </h2>
            </div>

            {/* Answer Options - Same as original but with enhanced error handling and accessibility */}
            <div className="space-y-4 mb-8 lg:mb-10">
              
              {/* Multiple Choice with Other Support and Conditional File Upload */}
              {(currentQuestion?.format_type === 'Multiple Choice' || currentQuestion?.format_type === 'Yes/No') && currentQuestion.response_options && (
                <div className="space-y-3 lg:space-y-4" role="radiogroup" aria-labelledby="question-title">
                  {currentQuestion.response_options.map((option, index) => {
                    const currentAnswer = getCurrentAnswer();
                    const isSelected = option === 'Other' 
                      ? (isStringAnswer(currentAnswer) && !currentQuestion.response_options?.includes(currentAnswer)) || currentAnswer === 'Other'
                      : currentAnswer === option;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerChange(option, true)}
                        disabled={isSaving || isSubmitting}
                        className={`w-full text-left p-4 lg:p-5 rounded-xl border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-900 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                        }`}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Select ${option}`}
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
                  
                  {/* Other Text Input for MCQ */}
                  {showOtherInput && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <label htmlFor="other-input" className="block text-sm font-medium text-gray-700 mb-2">
                        Please specify:
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="other-input"
                          type="text"
                          value={otherInputValue}
                          onChange={(e) => setOtherInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleOtherTextSubmit();
                            }
                          }}
                          placeholder="Enter your answer..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                          aria-describedby="other-help"
                        />
                        <button
                          onClick={handleOtherTextSubmit}
                          disabled={!otherInputValue.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          OK
                        </button>
                      </div>
                      <p id="other-help" className="mt-1 text-xs text-gray-500">
                        Press Enter or click OK to save your custom answer
                      </p>
                    </div>
                  )}

                  {/* Conditional File Upload Prompt - Enhanced with better accessibility */}
                  {showConditionalUpload[currentQuestion.id] && CONDITIONAL_FILE_UPLOAD[currentQuestion.question_number as keyof typeof CONDITIONAL_FILE_UPLOAD] && (
                    <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {CONDITIONAL_FILE_UPLOAD[currentQuestion.question_number as keyof typeof CONDITIONAL_FILE_UPLOAD].prompt}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Upload your file or skip this step to continue.
                      </p>
                      
                      {!answers[currentQuestion.id]?.file_url ? (
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                            <input
                              type="file"
                              id={`conditional-upload-${currentQuestion.id}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleConditionalFileUpload(file, currentQuestion.id).catch(error => {
                                    setError(error.message);
                                  });
                                }
                              }}
                              disabled={uploadingFiles[currentQuestion.id]}
                              className="hidden"
                              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                              aria-describedby="file-upload-help"
                            />
                            <label 
                              htmlFor={`conditional-upload-${currentQuestion.id}`}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                                  {uploadingFiles[currentQuestion.id] ? (
                                    <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                                  ) : (
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-blue-800">
                                  {uploadingFiles[currentQuestion.id] ? 'Uploading...' : 'Choose File'}
                                </span>
                              </div>
                            </label>
                            <p id="file-upload-help" className="mt-2 text-xs text-gray-500">
                              Max 10MB • Images, PDF, Word, Excel, Text files
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const yesAnswer: Answer = {
                                  question_id: currentQuestion.id,
                                  answer_text: "Yes"
                                };
                                saveAnswerToDatabase(currentQuestion.id, yesAnswer).then(() => {
                                  setAnswers(prev => ({ ...prev, [currentQuestion.id]: yesAnswer }));
                                  setShowConditionalUpload(prev => ({ ...prev, [currentQuestion.id]: false }));
                                  setTempAnswer(null);
                                  
                                  const nextQuestionIndex = findNextQuestionIndex(currentQuestionIndex, "Yes");
                                  if (nextQuestionIndex < questions.length) {
                                    setCurrentQuestionIndex(nextQuestionIndex);
                                  }
                                }).catch(error => {
                                  setError('Failed to save answer');
                                });
                              }}
                              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Skip Upload
                            </button>
                            <button
                              onClick={() => handleConditionalNo(currentQuestion.id)}
                              className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              Actually, No
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                              <div>
                                <p className="font-medium text-green-800">
                                  File uploaded successfully
                                </p>
                                <p className="text-sm text-green-600">
                                  {answers[currentQuestion.id].answer_text}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={answers[currentQuestion.id].file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                View
                              </a>
                              <button
                                onClick={() => handleFileRemove(currentQuestion.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                                disabled={isSaving}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Multi-select / Checkboxes with Other Support */}
              {(currentQuestion?.format_type === 'Multi-select' || currentQuestion?.format_type === 'Checkboxes') && currentQuestion.response_options && (
  <div className="space-y-3 lg:space-y-4" role="group" aria-labelledby="question-title">
    {currentQuestion.response_options.map((option, index) => {
      const currentAnswer = getCurrentAnswer();
      const isSelected = isArrayAnswer(currentAnswer) && currentAnswer.includes(option);
      
      return (
        <button
          key={index}
          type="button"
          onClick={() => {
            const newSelection = isArrayAnswer(currentAnswer) ? [...currentAnswer] : [];
            if (isSelected) {
              const updatedSelection = newSelection.filter(item => item !== option);
              handleAnswerChange(updatedSelection);
            } else {
              newSelection.push(option);
              handleAnswerChange(newSelection);
            }
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Handle selection
              const newSelection = isArrayAnswer(currentAnswer) ? [...currentAnswer] : [];
              if (isSelected) {
                const updatedSelection = newSelection.filter(item => item !== option);
                handleAnswerChange(updatedSelection);
              } else {
                newSelection.push(option);
                handleAnswerChange(newSelection);
              }
              // Then trigger save and next with delay
              setTimeout(() => {
                handleKeyPress(e);
              }, 100);
            }
          }}
          disabled={isSaving || isSubmitting}
          className={`w-full text-left p-4 lg:p-5 rounded-xl border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105'
              : 'bg-white text-gray-900 border-gray-200 hover:border-blue-300 hover:shadow-md'
          }`}
          role="checkbox"
          aria-checked={isSelected}
        >
          <div className="flex items-center">
            <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
              isSelected ? 'border-white bg-white' : 'border-gray-300'
            }`}>
              {isSelected && (
                <CheckCircle className="w-3 h-3 text-blue-600" />
              )}
            </div>
            <span className="font-medium text-sm lg:text-base">
              {option}
            </span>
          </div>
        </button>
      );
    })}
    
    {/* Enter key instruction for multi-select */}
    <p className="text-xs text-gray-500 mt-2">
      Select multiple options, then press Enter to continue
    </p>
  </div>
)}

              {/* Checkboxes + % input */}
              {currentQuestion?.format_type === 'Checkboxes + % input' && currentQuestion.response_options && (
                <div role="group" aria-labelledby="question-title" aria-describedby="percentage-help">
                  <CheckboxPercentageInput
                    options={currentQuestion.response_options}
                    value={isObjectAnswer(getCurrentAnswer()) ? getCurrentAnswer() as Record<string, number> : {}}
                    onChange={handleAnswerChange}
                    disabled={isSaving || isSubmitting}
                  />
                  <p id="percentage-help" className="mt-2 text-sm text-gray-500">
                    Select options and enter percentages that total 100%
                  </p>
                </div>
              )}

              {/* File Upload */}
              {currentQuestion?.format_type === 'File Upload' && (
                <div className="space-y-4">
                  {!answers[currentQuestion.id] ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        id={`file-upload-${currentQuestion.id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, currentQuestion.id).catch(error => {
                              setError(error.message);
                            });
                          }
                        }}
                        disabled={isSaving || isSubmitting || uploadingFiles[currentQuestion.id]}
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                        aria-describedby="file-upload-main-help"
                      />
                      <label 
                        htmlFor={`file-upload-${currentQuestion.id}`}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            {uploadingFiles[currentQuestion.id] ? (
                              <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                            ) : (
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {uploadingFiles[currentQuestion.id] ? 'Uploading...' : 'Upload File'}
                          </h3>
                          <p className="text-gray-600 mb-2">
                            Click to browse or drag and drop
                          </p>
                          <p id="file-upload-main-help" className="text-xs text-gray-500">
                            Supports: Images, PDF, Word, Excel, Text files (Max 10MB)
                          </p>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <div>
                            <p className="font-medium text-green-800">
                              File uploaded successfully
                            </p>
                            <p className="text-sm text-green-600">
                              {answers[currentQuestion.id].answer_text}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {answers[currentQuestion.id].file_url && (
                            <a
                              href={answers[currentQuestion.id].file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              View
                            </a>
                          )}
                          <button
                            onClick={() => handleFileRemove(currentQuestion.id)}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text Input */}
              {(currentQuestion?.format_type === 'Short Text' || 
                currentQuestion?.format_type === 'Long Form' || 
                currentQuestion?.format_type === 'Multi-line Text') && (
                <div>
                  {currentQuestion.format_type === 'Short Text' ? (
                    <input
                      type="text"
                      value={isStringAnswer(getCurrentAnswer()) ? getCurrentAnswer() as string : ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isSaving || isSubmitting}
                      placeholder="Enter your answer..."
                      className="w-full p-4 lg:p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-describedby="text-input-help"
                    />
                  ) : (
                    <textarea
                      value={isStringAnswer(getCurrentAnswer()) ? getCurrentAnswer() as string : ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isSaving || isSubmitting}
                      placeholder="Please provide your detailed answer..."
                      className="w-full p-4 lg:p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-all duration-200 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      rows={5}
                      aria-describedby="textarea-help"
                    />
                  )}
                  <p id={currentQuestion.format_type === 'Short Text' ? 'text-input-help' : 'textarea-help'} className="mt-1 text-sm text-gray-500">
                    {currentQuestion.format_type === 'Short Text' ? 'Enter a brief answer' : 'Provide a detailed response (Ctrl/Shift + Enter for new line)'}
                  </p>
                </div>
              )}

              {/* Slider */}
              {currentQuestion?.format_type === 'Slider' && (
                <div className="space-y-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={isStringAnswer(getCurrentAnswer()) ? getCurrentAnswer() as string : '5'}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    disabled={isSaving || isSubmitting}
                    className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-describedby="slider-help"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>1</span>
                    <span className="font-semibold text-blue-600 text-base lg:text-lg">
                      Current: {isStringAnswer(getCurrentAnswer()) ? getCurrentAnswer() as string : '5'}
                    </span>
                    <span>100</span>
                  </div>
                  <p id="slider-help" className="text-sm text-gray-500">
                    Move the slider to select your rating
                  </p>
                </div>
              )}

              {/* Social Media Accounts (Question 53) */}
              {currentQuestion?.question_number === 53 && (
  <div className="space-y-4">
    <div className="text-sm text-gray-600 mb-4">
      Add your active social media account URLs
    </div>
    
    {socialAccounts.map((account, index) => (
      <div key={index} className="flex gap-3 items-start">
        <div className="flex-1 space-y-3">
          <label htmlFor={`platform-${index}`} className="sr-only">
            Platform {index + 1}
          </label>
          <select
            id={`platform-${index}`}
            value={account.platform}
            onChange={(e) => updateSocialAccount(index, 'platform', e.target.value)}
            disabled={isSaving || isSubmitting}
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            onKeyPress={handleKeyPress}
          >
            {SOCIAL_PLATFORMS.map(platform => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </select>
          
          <label htmlFor={`url-${index}`} className="sr-only">
            URL {index + 1}
          </label>
          <input
            id={`url-${index}`}
            type="url"
            value={account.url}
            onChange={(e) => updateSocialAccount(index, 'url', e.target.value)}
            placeholder="https://..."
            disabled={isSaving || isSubmitting}
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            onKeyPress={handleKeyPress}
          />
        </div>
        
        {socialAccounts.length > 1 && (
          <button
            type="button"
            onClick={() => removeSocialAccount(index)}
            disabled={isSaving || isSubmitting}
            className="mt-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Remove social account ${index + 1}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    ))}

    <button
      type="button"
      onClick={addSocialAccount}
      disabled={isSaving || isSubmitting}
      className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus className="w-4 h-4 mr-2" />
      Add Another Account
    </button>

    {/* REMOVED: Save Social Media Accounts button */}
    {/* The accounts will be saved automatically when clicking Next */}
    
    {/* Preview of current accounts */}
    {socialAccounts.some(account => account.platform && account.url.trim()) && (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="font-semibold text-blue-800 mb-2">Social Media Accounts to Save:</h4>
        <div className="space-y-1">
          {socialAccounts
            .filter(account => account.platform && account.url.trim())
            .map((account, index) => (
              <div key={index} className="flex items-center text-sm text-blue-700">
                <span className="font-medium">{account.platform}:</span>
                <span className="ml-2 text-blue-600 truncate">{account.url}</span>
              </div>
            ))}
        </div>
      </div>
    )}

    {/* Show saved accounts if they exist */}
    {answers[currentQuestion.id] && (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <h4 className="font-semibold text-green-800 mb-2">Saved Social Media Accounts:</h4>
        <div className="space-y-1">
          {Object.entries(JSON.parse(answers[currentQuestion.id].answer_text || '{}')).map(([platform, url]) => (
            <div key={platform} className="flex items-center text-sm text-green-700">
              <span className="font-medium">{platform}:</span>
              <a href={url as string} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline truncate">
                {url as string}
              </a>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
              {/* Fallback for unimplemented types */}
              {!['Multiple Choice', 'Yes/No', 'Multi-select', 'Checkboxes', 'Checkboxes + % input', 'Short Text', 'Long Form', 'Multi-line Text', 'Slider', 'File Upload'].includes(currentQuestion?.format_type || '') && 
               currentQuestion?.question_number !== 53 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-800 font-medium mb-2">
                        Format type "{currentQuestion?.format_type}" not fully implemented
                      </p>
                      <p className="text-yellow-700 text-sm mb-3">
                        Please use the text area below to provide your answer:
                      </p>
                      <textarea
                        value={isStringAnswer(getCurrentAnswer()) ? getCurrentAnswer() as string : ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        disabled={isSaving || isSubmitting}
                        placeholder="Please provide your answer..."
                        className="w-full p-3 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Section */}
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
                    ref={focusRef}
                    onClick={handleNext}
                    disabled={!isCurrentQuestionAnswered() || isSaving || isSubmitting}
                    className="w-full lg:w-auto px-6 lg:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center transition-all duration-200 text-sm lg:text-base"
                    aria-describedby="next-button-help"
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
                    ref={focusRef}
                    onClick={handleSubmit}
                    disabled={!isCurrentQuestionAnswered() || isSaving || isSubmitting}
                    className="w-full lg:w-auto px-6 lg:px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center transition-all duration-200 text-sm lg:text-base"
                    aria-describedby="submit-button-help"
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
                <p id={isLastQuestion ? 'submit-button-help' : 'next-button-help'} className="sr-only">
                  {isLastQuestion 
                    ? 'Submit your completed audit and trigger AI analysis'
                    : 'Navigate to the next question in the audit'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
});

ReportForm.displayName = 'ReportForm';