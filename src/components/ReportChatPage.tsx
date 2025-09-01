import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Send, Bot, User, Loader, TrendingUp, Globe, Plus } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export const ReportChatPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get data from location state
  const { reportData, purchaseId, companyName } = location.state || {};
  
  // State management
  const [activeTab, setActiveTab] = useState<'marketing' | 'website'>('marketing');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionIds, setSessionIds] = useState<{marketing: string | null, website: string | null}>({
    marketing: null,
    website: null
  });

  // Check if website analysis data exists
  const hasWebsiteData = reportData?.website_analysis || 
    (reportData?.score && reportData?.analysis);

  // Load existing sessions and initialize chat
  useEffect(() => {
    if (purchaseId && user) {
      initializeChat();
    } else {
      setError('Missing purchase information');
      setIsLoading(false);
    }
  }, [purchaseId, user]); // Removed activeTab from dependencies

  // Load suggested questions only when needed
  useEffect(() => {
    if (purchaseId) {
      loadSuggestedQuestions();
    }
  }, [activeTab, purchaseId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      
      // Check for existing sessions first
      const existingSessions = await loadExistingSessions();
      
      // Load suggested questions for current tab
      await loadSuggestedQuestions();
      
      // If we have an existing session for the current tab, load it
      if (existingSessions[activeTab]) {
        await loadSessionHistory(existingSessions[activeTab]);
      } else {
        // Show welcome message for new conversation
        showWelcomeMessage();
      }
      
    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat');
      showWelcomeMessage(); // Fallback to welcome message
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingSessions = async (): Promise<{marketing: string | null, website: string | null}> => {
    try {
      const response = await fetch(`/api/chat-sessions?purchase_id=${purchaseId}`);
      
      if (response.ok) {
        const result = await response.json();
        const sessions = {
          marketing: result.marketing?.[0]?.id || null,
          website: result.website?.[0]?.id || null
        };
        setSessionIds(sessions);
        return sessions;
      }
      
      return { marketing: null, website: null };
    } catch (error) {
      console.error('Error loading existing sessions:', error);
      return { marketing: null, website: null };
    }
  };

  const loadSessionHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}/messages`);
      
      if (response.ok) {
        const result = await response.json();
        const formattedMessages = result.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
        setCurrentSessionId(sessionId);
      } else {
        throw new Error('Failed to load session history');
      }
    } catch (error) {
      console.error('Error loading session history:', error);
      showWelcomeMessage();
    }
  };

  const loadSuggestedQuestions = async () => {
    try {
      const response = await fetch(`/api/chat-sessions/suggested-questions/${purchaseId}?report_type=${activeTab}`);
      
      if (response.ok) {
        const result = await response.json();
        setSuggestedQuestions(result.questions || []);
      } else {
        // Use fallback questions
        setSuggestedQuestions(getFallbackQuestions(activeTab));
      }
    } catch (error) {
      console.error('Error loading suggested questions:', error);
      setSuggestedQuestions(getFallbackQuestions(activeTab));
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
    const content = activeTab === 'marketing' 
      ? `Hello! I'm here to help you understand your marketing audit results for ${companyName || 'your company'}. You can ask me anything about your report, or click on one of the suggested questions below.`
      : `Hello! I'm here to help you understand your website analysis results for ${companyName || 'your company'}. I can explain your score, discuss specific issues, and help you prioritize improvements. You can ask me anything about your analysis, or click on one of the suggested questions below.`;

    const welcomeMessage: ChatMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    setCurrentSessionId(null);
  };

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || inputMessage.trim();
    if (!content || isTyping) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Add assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      let response: Response;

      if (currentSessionId) {
        // Continue existing session
        response = await fetch(`/api/chat-sessions/${currentSessionId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content })
        });
      } else {
        // Create new session
        response = await fetch('/api/chat-sessions/create', {
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

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsTyping(false);
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessage.id
                  ? { ...msg, isStreaming: false }
                  : msg
              ));
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                streamedContent += parsed.token;
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: streamedContent }
                    : msg
                ));
              }
              if (parsed.chat_session_id && !currentSessionId) {
                setCurrentSessionId(parsed.chat_session_id);
                // Update session tracking
                setSessionIds(prev => ({
                  ...prev,
                  [activeTab]: parsed.chat_session_id
                }));
              }
            } catch (parseError) {
              // Ignore parsing errors for non-JSON data
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      const errorContent = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessage.id
          ? { ...msg, content: errorContent, isStreaming: false }
          : msg
      ));
    }
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
      return; // No change needed
    }
    
    setActiveTab(tab);
    setError('');
    setIsTyping(false);
    
    // Load suggested questions for new tab
    await loadSuggestedQuestions();
    
    // Check if we have an existing session for this report type
    const existingSessionId = sessionIds[tab];
    
    if (existingSessionId) {
      // Load existing session for this tab
      await loadSessionHistory(existingSessionId);
    } else {
      // Show welcome message for new report type
      showWelcomeMessage();
      setCurrentSessionId(null);
    }
  };

  const startNewChat = () => {
    // Clear current session for this tab, but preserve other tab's session
    setSessionIds(prev => ({
      ...prev,
      [activeTab]: null
    }));
    setCurrentSessionId(null);
    setMessages([]);
    showWelcomeMessage();
  };

  if (isLoading) {
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

  if (!purchaseId || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-4">Missing report data. Please return to your dashboard.</div>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AI Report Chat</h1>
              <p className="text-sm text-gray-500">{companyName || 'Your Company'}</p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleTabChange('marketing')}
                disabled={isTyping}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  activeTab === 'marketing'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Marketing Report
              </button>
              {hasWebsiteData && (
                <button
                  onClick={() => handleTabChange('website')}
                  disabled={isTyping}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                    activeTab === 'website'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Globe className="w-4 h-4 inline mr-2" />
                  Website Analysis
                </button>
              )}
            </div>
            
            {/* New Chat Button */}
            <button
              onClick={startNewChat}
              disabled={isTyping}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-blue-600' 
                    : activeTab === 'marketing'
                      ? 'bg-green-600'
                      : 'bg-purple-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* Message Content */}
                <div className={`px-4 py-3 rounded-2xl max-w-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white ml-3'
                    : 'bg-white text-gray-900 border border-gray-200 mr-3'
                }`}>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1 rounded" />
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Follow-up Question Bubbles */}
          {messages.length === 1 && suggestedQuestions.length > 0 && !isTyping && (
            <div className="flex justify-start">
              <div className="max-w-3xl ml-11">
                <div className="text-sm text-gray-500 mb-3">
                  Try asking:
                </div>
                <div className="space-y-2">
                  {suggestedQuestions.slice(0, 5).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleFollowUpClick(question)}
                      disabled={isTyping}
                      className={`block w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm ${
                        activeTab === 'marketing'
                          ? 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                      }`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  activeTab === 'marketing' ? 'bg-green-600' : 'bg-purple-600'
                }`}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 pb-2">
            <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask about your ${activeTab === 'marketing' ? 'marketing report' : 'website analysis'}...`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isTyping}
                />
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
                className={`px-4 py-3 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center ${
                  activeTab === 'marketing' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isTyping ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};