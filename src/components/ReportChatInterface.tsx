import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { ArrowLeft, Send, Bot, User, Loader, TrendingUp, Globe } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  report_type: string;
  session_name: string;
  created_at: string;
  updated_at: string;
}

interface TabState {
  sessionId: string | null;
  messages: ChatMessage[];
  followUpQuestions: string[];
  isInitialized: boolean;
}

interface Purchase {
  id: string;
  company_name: string;
  company_email: string;
}

interface AIResult {
  id: string;
  purchase_id: string;
  result_data: any;
  website_analysis: any;
  status: string;
}

// Component to format AI messages with proper structure
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  // Convert content to formatted HTML-like structure
  const formatContent = (text: string) => {
    if (!text) return '';
    
    // Replace markdown-style formatting
    let formatted = text
      // Headers (### Header)
      .replace(/###\s+(.+)(?:\n|$)/g, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
      // Bold text (**bold**)  
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Numbered lists (1. item)
      .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-4 mb-2"><span class="font-medium text-gray-700">$1.</span> $2</li>')
      // Bullet points (- item)
      .replace(/^-\s+(.+)$/gm, '<li class="ml-4 mb-1">• $1</li>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    
    // Wrap consecutive list items in <ul> tags
    formatted = formatted.replace(/(<li[^>]*>.*?<\/li>)(\s*<li[^>]*>.*?<\/li>)*/g, (match) => {
      return `<ul class="my-3 space-y-1">${match}</ul>`;
    });
    
    return formatted;
  };

  const formattedContent = formatContent(content);

  return (
    <div 
      className="formatted-message"
      dangerouslySetInnerHTML={{ __html: formattedContent }}
    />
  );
};

export const ReportChatInterface: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  
  // Data loading flags to prevent unnecessary reloads
  const hasInitialized = useRef(false);
  const isCurrentlyLoading = useRef(false);
  
  // Get data from URL params first, then fallback to location state
  const purchaseIdFromUrl = searchParams.get('purchase_id');
  const reportTypeFromUrl = searchParams.get('report_type');
  const locationData = location.state || {};
  
  const purchaseId = purchaseIdFromUrl || locationData.purchaseId;
  
  // CRITICAL FIX: Don't override initialReportType with 'marketing' default
  const [activeTab, setActiveTab] = useState<'marketing' | 'website'>(() => {
    const urlReportType = searchParams.get('report_type');
    if (urlReportType === 'website' || urlReportType === 'marketing') {
      console.log('Setting initial tab from URL:', urlReportType);
      return urlReportType as 'marketing' | 'website';
    }
    console.log('Using default tab: marketing');
    return 'marketing';
  });
  
  const [tabStates, setTabStates] = useState<{marketing: TabState, website: TabState}>({
    marketing: {
      sessionId: null,
      messages: [],
      followUpQuestions: [],
      isInitialized: false
    },
    website: {
      sessionId: null,
      messages: [],
      followUpQuestions: [],
      isInitialized: false
    }
  });
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  
  // Persistent data that survives page refreshes
  const [companyName, setCompanyName] = useState<string>('');
  const [hasWebsiteData, setHasWebsiteData] = useState<boolean>(false);

  // Get current tab state
  const currentTabState = tabStates[activeTab];
  const messages = currentTabState.messages;
  const currentSessionId = currentTabState.sessionId;

  // CRITICAL FIX: Prevent all window focus/visibility reloads
  useEffect(() => {
    console.log('Chat interface mounted - visibility change handlers disabled for this component');
    
    // Store current state before page unload only
    const handleBeforeUnload = () => {
      sessionStorage.setItem('chatState', JSON.stringify({
        tabStates,
        activeTab,
        companyName,
        hasWebsiteData,
        timestamp: Date.now()
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tabStates, activeTab, companyName, hasWebsiteData]);

  // AUTHENTICATION AND INITIAL LOAD - Only run once
  useEffect(() => {
    if (isCurrentlyLoading.current || hasInitialized.current) {
      console.log('Skipping initialization - already done or in progress');
      return;
    }

    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user found, redirecting to login');
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?return=${encodeURIComponent(returnUrl)}`);
      return;
    }
    
    if (!purchaseId) {
      setError('No purchase ID provided. Please access chat from your report.');
      setIsLoading(false);
      return;
    }

    // CRITICAL FIX: Ensure URL parameters are properly set before initialization
    const urlParams = new URLSearchParams(location.search);
    const urlReportType = urlParams.get('report_type');
    const urlPurchaseId = urlParams.get('purchase_id');
    
    // Fix URL if parameters are missing or incorrect
    if (!urlReportType || !urlPurchaseId) {
      console.log('Fixing missing URL parameters');
      const newSearchParams = new URLSearchParams();
      newSearchParams.set('purchase_id', purchaseId);
      newSearchParams.set('report_type', activeTab);
      
      const newUrl = `${location.pathname}?${newSearchParams.toString()}`;
      window.history.replaceState(window.history.state, '', newUrl);
    }
    
    // Set loading flag to prevent duplicate initialization
    isCurrentlyLoading.current = true;
    console.log('Starting initialization for purchase:', purchaseId);
    
    initializePersistentData();
  }, [user, authLoading, purchaseId, location.search]);

  // Handle browser back/forward navigation for tab changes
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlReportType = urlParams.get('report_type') as 'marketing' | 'website' || 'marketing';
      
      if (urlReportType !== activeTab) {
        console.log('Browser navigation detected, switching to:', urlReportType);
        setActiveTab(urlReportType);
        
        // Initialize the tab if needed
        if (!tabStates[urlReportType].isInitialized) {
          initializeCurrentTab();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab, tabStates]);

  // RESTORE STATE FROM SESSION STORAGE - Only run once on mount
  useEffect(() => {
    if (!user || !purchaseId || hasInitialized.current) return;
    
    try {
      const savedState = sessionStorage.getItem('chatState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Only restore if saved within last 10 minutes and same purchase
        if (Date.now() - parsed.timestamp < 600000) {
          console.log('Restoring chat state from session storage');
          setTabStates(parsed.tabStates || tabStates);
          setActiveTab(parsed.activeTab || activeTab);
          setCompanyName(parsed.companyName || '');
          setHasWebsiteData(parsed.hasWebsiteData || false);
          
          // Update URL to match restored state
          if (parsed.activeTab && parsed.activeTab !== activeTab) {
            const newSearchParams = new URLSearchParams();
            newSearchParams.set('purchase_id', purchaseId);
            newSearchParams.set('report_type', parsed.activeTab);
            const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
            window.history.replaceState(window.history.state, '', newUrl);
          }
          
          // Skip full initialization if we have valid restored state
          if (parsed.tabStates?.marketing?.isInitialized || parsed.tabStates?.website?.isInitialized) {
            setIsLoading(false);
            hasInitialized.current = true;
            isCurrentlyLoading.current = false;
            console.log('Using restored state, skipping API initialization');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error restoring state:', error);
    }
  }, [user, purchaseId]);

  const initializePersistentData = async () => {
    try {
      setError('');
      console.log('Loading persistent data for purchase:', purchaseId);

      // Get purchase data
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select('id, company_name, company_email')
        .eq('id', purchaseId)
        .single();

      if (purchaseError || !purchase) {
        console.error('Purchase error:', purchaseError);
        throw new Error('Purchase not found');
      }

      console.log('Purchase found:', purchase);
      setCompanyName(purchase.company_name);

      // Get AI results to check data availability
      const { data: aiResult, error: aiError } = await supabase
        .from('ai_results')
        .select('result_data, website_analysis, status')
        .eq('purchase_id', purchaseId)
        .eq('status', 'completed')
        .single();

      if (aiError || !aiResult) {
        console.error('AI result error:', aiError);
        throw new Error('Report data not found');
      }

      console.log('AI result found, has website data:', !!aiResult.website_analysis);
      setHasWebsiteData(!!aiResult.website_analysis);

      // Initialize the current tab if not already done
      if (!currentTabState.isInitialized) {
        console.log('Current tab not initialized, initializing...');
        await initializeCurrentTab();
      } else {
        console.log('Current tab already initialized');
      }

      // Mark as initialized
      hasInitialized.current = true;
      console.log('Initialization completed successfully');

    } catch (error) {
      console.error('Error initializing persistent data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      isCurrentlyLoading.current = false;
    }
  };

  const initializeCurrentTab = async () => {
    // Use initializeSpecificTab with the current activeTab
    await initializeSpecificTab(activeTab);
  };

  // FIXED: New function that initializes a specific tab, not the current activeTab
  const initializeSpecificTab = async (tabToInitialize: 'marketing' | 'website') => {
    try {
      console.log(`Initializing ${tabToInitialize} tab`);

      const serverUrl = import.meta.env.VITE_API_URL;
      
      // Check for existing sessions
      const response = await fetch(`${serverUrl}/api/chat-sessions?purchase_id=${purchaseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
      }
      
      const result = await response.json();
      console.log('Chat sessions response:', result);
      
      const sessions = result[tabToInitialize] || [];
      console.log(`Found ${sessions.length} existing sessions for ${tabToInitialize}`);
      
      // Load suggested questions for the specific tab
      await loadSuggestedQuestions(tabToInitialize);
      
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        console.log(`Loading existing ${tabToInitialize} session:`, session.id);
        
        const sessionHistory = await loadSessionHistoryForTab(session.id);
        
        if (sessionHistory.length > 0) {
          console.log(`Setting ${sessionHistory.length} historical messages for ${tabToInitialize}`);
          setTabStates(prev => ({
            ...prev,
            [tabToInitialize]: {
              sessionId: session.id,
              messages: sessionHistory,
              followUpQuestions: prev[tabToInitialize].followUpQuestions,
              isInitialized: true
            }
          }));
        } else {
          console.log(`No actual messages found for ${tabToInitialize}, showing welcome message`);
          showWelcomeMessageForTab(tabToInitialize);
          setTabStates(prev => ({
            ...prev,
            [tabToInitialize]: {
              sessionId: session.id,
              messages: prev[tabToInitialize].messages,
              followUpQuestions: prev[tabToInitialize].followUpQuestions,
              isInitialized: true
            }
          }));
        }
        
      } else {
        console.log(`No existing sessions for ${tabToInitialize}, showing welcome message`);
        showWelcomeMessageForTab(tabToInitialize);
        
        setTabStates(prev => ({
          ...prev,
          [tabToInitialize]: {
            ...prev[tabToInitialize],
            sessionId: null,
            isInitialized: true
          }
        }));
      }

    } catch (error) {
      console.error(`Error initializing ${tabToInitialize} tab:`, error);
      showWelcomeMessageForTab(tabToInitialize);
      setTabStates(prev => ({
        ...prev,
        [tabToInitialize]: {
          ...prev[tabToInitialize],
          sessionId: null,
          followUpQuestions: getFallbackQuestions(tabToInitialize),
          isInitialized: true
        }
      }));
    }
  };

  const loadSessionHistoryForTab = async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      console.log('Loading session history for:', sessionId);

      const serverUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${serverUrl}/api/chat-sessions/${sessionId}/messages`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Session history response:', data);
      
      const formattedMessages = data.messages.map((msg: any) => ({
        id: msg.id || `msg_${msg.message_order}_${Date.now()}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || msg.created_at),
        messageOrder: msg.messageOrder || msg.message_order
      }));

      console.log(`Loaded ${formattedMessages.length} messages from session ${sessionId}`);
      console.log('Formatted messages preview:', formattedMessages.slice(0, 2));
      
      return formattedMessages;

    } catch (error) {
      console.error('Error loading session history:', error);
      return [];
    }
  };

  const loadSessionHistory = async (sessionId: string) => {
    try {
      const sessionHistory = await loadSessionHistoryForTab(sessionId);
      
      setTabStates(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          sessionId: sessionId,
          messages: sessionHistory
        }
      }));

      return sessionHistory;

    } catch (error) {
      console.error('Error loading session history:', error);
      showWelcomeMessage();
      return [];
    }
  };

  const loadSuggestedQuestions = async (forTab?: 'marketing' | 'website') => {
    const tabToLoad = forTab || activeTab;
    
    try {
      const serverUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${serverUrl}/api/chat-sessions/suggested-questions/${purchaseId}?report_type=${tabToLoad}`);
      if (response.ok) {
        const data = await response.json();
        
        setTabStates(prev => ({
          ...prev,
          [tabToLoad]: {
            ...prev[tabToLoad],
            followUpQuestions: data.questions || getFallbackQuestions(tabToLoad)
          }
        }));
        
        console.log(`Loaded ${data.questions?.length || 0} suggested questions for ${tabToLoad}`);
      } else {
        throw new Error('Failed to load suggested questions');
      }
    } catch (error) {
      console.error('Error loading suggested questions:', error);
      // Set fallback questions
      setTabStates(prev => ({
        ...prev,
        [tabToLoad]: {
          ...prev[tabToLoad],
          followUpQuestions: getFallbackQuestions(tabToLoad)
        }
      }));
    }
  };

  const getFallbackQuestions = (type: 'marketing' | 'website'): string[] => {
    const fallbacks = {
      marketing: [
        "What are my biggest marketing priorities right now?",
        "How should I allocate my marketing budget for maximum ROI?",
        "What tools do you recommend I implement first?",
        "How can I improve my customer acquisition strategy?",
        "What content strategy would work best for my business?"
      ],
      website: [
        "What website issues should I fix first?",
        "How can I improve my website's conversion rate?", 
        "What SEO improvements would have the biggest impact?",
        "How can I make my website more trustworthy to visitors?",
        "What design changes would improve user experience?"
      ]
    };
    
    return fallbacks[type] || fallbacks.marketing;
  };

  const showWelcomeMessage = () => {
    showWelcomeMessageForTab(activeTab);
  };

  const showWelcomeMessageForTab = (tabType: 'marketing' | 'website') => {
    const content = tabType === 'marketing' 
      ? `Hello! I'm here to help you understand your marketing audit results for ${companyName || 'your company'}. You can ask me anything about your report, or click on one of the suggested questions below.`
      : `Hello! I'm here to help you understand your website analysis results for ${companyName || 'your company'}. I can explain your score, discuss specific issues, and help you prioritize improvements. You can ask me anything about your analysis, or click on one of the suggested questions below.`;

    const welcomeMessage: ChatMessage = {
      id: `welcome_${tabType}_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date()
    };

    setTabStates(prev => ({
      ...prev,
      [tabType]: {
        ...prev[tabType],
        messages: [welcomeMessage]
      }
    }));
  };

  // COMPLETELY REWRITTEN: handleSendMessage without scope issues
  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || inputMessage.trim();
    if (!content || isTyping) return;

    const tempUserId = `user_${Date.now()}`;
    const tempAssistantId = `assistant_${Date.now()}`;

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: tempUserId,
      role: 'user',
      content,
      timestamp: new Date()
    };

    // Add assistant placeholder
    const assistantMessage: ChatMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    // Update UI state immediately
    setTabStates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        messages: [...prev[activeTab].messages, userMessage, assistantMessage]
      }
    }));

    setInputMessage('');
    setIsTyping(true);

    try {
      const serverUrl = import.meta.env.VITE_API_URL;
      let response: Response;

      if (currentSessionId) {
        response = await fetch(`${serverUrl}/api/chat-sessions/${currentSessionId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content })
        });
      } else {
        response = await fetch(`${serverUrl}/api/chat-sessions/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchase_id: purchaseId,
            initial_message: content,
            report_type: activeTab
          })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle response based on content type
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('text/event-stream')) {
        console.log('Processing streaming response');
        await processStreamingResponse(response, tempAssistantId);
      } else {
        console.log('Processing non-streaming response');
        await processNonStreamingResponse(response, tempAssistantId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      handleMessageError(tempAssistantId, error);
    }
  };

  // FIXED: Separate streaming handler with proper variable scope
  const processStreamingResponse = async (response: Response, tempAssistantId: string) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = ''; // Local variable with clear name
    let newSessionId = currentSessionId;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream reading completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            
            if (data === '[DONE]') {
              console.log('Received [DONE] - finalizing message');
              setIsTyping(false);
              
              setTabStates(prev => ({
                ...prev,
                [activeTab]: {
                  ...prev[activeTab],
                  messages: prev[activeTab].messages.map(msg =>
                    msg.id === tempAssistantId
                      ? { ...msg, isStreaming: false, content: accumulatedContent }
                      : msg
                  )
                }
              }));
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.token) {
                accumulatedContent += parsed.token;
                
                setTabStates(prev => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    messages: prev[activeTab].messages.map(msg =>
                      msg.id === tempAssistantId
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  }
                }));
              }
              
              if (parsed.chat_session_id && !newSessionId) {
                newSessionId = parsed.chat_session_id;
                
                setTabStates(prev => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    sessionId: newSessionId
                  }
                }));
              }
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              console.warn('Parse error (continuing):', parseError.message);
            }
          }
        }
      }
    } finally {
      // Ensure the message is always finalized
      setIsTyping(false);
      
      setTabStates(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          messages: prev[activeTab].messages.map(msg =>
            msg.id === tempAssistantId
              ? { ...msg, isStreaming: false, content: accumulatedContent || msg.content || 'Response completed' }
              : msg
          )
        }
      }));
    }
  };

  // Handle non-streaming responses
  const processNonStreamingResponse = async (response: Response, tempAssistantId: string) => {
    try {
      const data = await response.json();
      console.log('Non-streaming response received:', data);
      
      if (data.success && data.messages && Array.isArray(data.messages)) {
        // Replace temporary messages with real ones from server
        const realMessages = data.messages.map((msg: any) => ({
          id: msg.id || `msg_${msg.messageOrder}_${Date.now()}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          isStreaming: false
        }));
        
        setTabStates(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            messages: [...prev[activeTab].messages.slice(0, -2), ...realMessages],
            sessionId: data.chat_session_id
          }
        }));
        
        console.log('Updated UI with real messages from server');
      }
      
      setIsTyping(false);
      
    } catch (parseError) {
      console.error('Error parsing non-streaming response:', parseError);
      throw parseError;
    }
  };

  // Handle message errors
  const handleMessageError = (tempAssistantId: string, error: any) => {
    setIsTyping(false);
    
    const errorContent = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    
    setTabStates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        messages: prev[activeTab].messages.map(msg =>
          msg.id === tempAssistantId
            ? { ...msg, content: errorContent, isStreaming: false }
            : msg
        )
      }
    }));
  };

  const handleFollowUpClick = (question: string) => {
    handleSendMessage(question);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleTabChange = async (tab: 'marketing' | 'website') => {
    if (tab === 'website' && !hasWebsiteData) {
      setError('Website analysis data not available for this report');
      return;
    }
    
    if (tab === activeTab) {
      return;
    }
    
    console.log(`Switching from ${activeTab} to ${tab}`);
    
    setActiveTab(tab);
    setError('');
    setIsTyping(false);
    
    // Update URL parameters when tab changes
    if (purchaseId) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set('purchase_id', purchaseId);
      newSearchParams.set('report_type', tab);
      
      const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
      window.history.pushState({ ...window.history.state, activeTab: tab }, '', newUrl);
      
      console.log('Updated URL to:', newUrl);
    }
    
    // Initialize new tab if not done yet
    if (!tabStates[tab].isInitialized) {
      console.log(`${tab} tab not initialized, initializing...`);
      await initializeCurrentTab();
    } else {
      console.log(`${tab} tab already initialized with ${tabStates[tab].messages.length} messages`);
    }
  };

  const startNewChat = () => {
    // Clear current session for this tab
    setTabStates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        sessionId: null,
        messages: []
      }
    }));
    showWelcomeMessage();
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debug function to check current state
  useEffect(() => {
    if (messages.length > 0) {
      console.log(`=== ${activeTab.toUpperCase()} TAB STATE ===`);
      console.log('Current messages count:', messages.length);
      console.log('Current session ID:', currentSessionId);
      console.log('Messages preview:');
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.role}: ${msg.content.substring(0, 100)}...`);
      });
      console.log('=== END TAB STATE ===');
    }
  }, [messages, activeTab, currentSessionId]);

  // LOADING STATE - Only show if we're actually initializing AND don't have restored state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto w-fit mb-4">
            <Bot className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Don't show loading if we have any messages to display
  const hasAnyMessages = tabStates.marketing.messages.length > 0 || tabStates.website.messages.length > 0;
  const shouldShowLoading = isLoading && !hasInitialized.current && !hasAnyMessages;

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto w-fit mb-4">
            <Bot className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading chat interface...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Bot className="w-12 h-12 mx-auto mb-2" />
            <p className="font-semibold">Error Loading Chat</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add custom styles for formatted messages */}
      <style>{`
        .formatted-message h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.25;
        }
        .formatted-message ul {
          margin: 0.75rem 0;
          padding-left: 0;
        }
        .formatted-message li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
          padding-left: 1rem;
          position: relative;
        }
        .formatted-message strong {
          font-weight: 600;
          color: #111827;
        }
        .formatted-message br {
          display: block;
          margin: 0.5rem 0;
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AI Report Chat</h1>
              <p className="text-sm text-gray-500">{companyName}</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleTabChange('marketing')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'marketing'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Marketing Report</span>
            </button>
            <button
              onClick={() => handleTabChange('website')}
              disabled={!hasWebsiteData}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'website'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : hasWebsiteData
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Website Analysis</span>
            </button>
          </div>

          {/* <button
            onClick={startNewChat}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Chat
          </button> */}
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[70vh] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User className="w-5 h-5 mt-0.5 text-white flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className={`prose prose-sm max-w-none ${
                        message.role === 'user' ? 'prose-invert' : ''
                      }`}>
                        {message.role === 'assistant' ? (
                          <FormattedMessage content={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      {message.isStreaming && (
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-1"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-1 delay-75"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {currentTabState.followUpQuestions.length > 0 && messages.length <= 1 && !isTyping && (
            <div className="px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Try asking:</p>
              <div className="space-y-2">
                {currentTabState.followUpQuestions.slice(0, 5).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleFollowUpClick(question)}
                    className={`block w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 text-sm hover:shadow-sm ${
                      activeTab === 'marketing'
                        ? 'border-green-200 bg-green-50 hover:bg-green-100 text-green-800'
                        : 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800'
                    }`}
                    disabled={isTyping}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator for suggested questions */}
          {messages.length <= 1 && currentTabState.followUpQuestions.length === 0 && !isTyping && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading suggestions...</span>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask me anything about your ${activeTab} analysis...`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTyping ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};