import React, { useState, useRef, useEffect } from 'react';
import { GeneratedReport } from '../types/reports';
import { Send, ArrowLeft, Download, Bot, User, Loader } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  report: GeneratedReport;
  onBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ report, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm here to help you understand and act on your ${report.title}. Your overall score is ${report.overallScore}%. What would you like to discuss about your results?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Mock AI responses based on common questions
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      return `Based on your report, here are the top 3 areas for improvement:

1. **${report.sections[0]?.title || 'Primary Focus Area'}**: ${report.sections[0]?.recommendations[0] || 'Focus on foundational improvements'}

2. **${report.sections[1]?.title || 'Secondary Focus Area'}**: ${report.sections[1]?.recommendations[0] || 'Optimize current processes'}

3. **Revenue Impact**: ${report.revenueImpact.potential} - ${report.revenueImpact.timeline}

Would you like me to elaborate on any of these areas or help you create a specific action plan?`;
    }
    
    if (lowerMessage.includes('action') || lowerMessage.includes('plan') || lowerMessage.includes('next')) {
      return `Here's your prioritized action plan:

**3-Month Quick Wins:**
${report.actionPlan.threeMonth.map(action => `• ${action}`).join('\n')}

**6-Month Strategic Initiatives:**
${report.actionPlan.sixMonth.map(action => `• ${action}`).join('\n')}

**12-Month Long-term Goals:**
${report.actionPlan.twelveMonth.map(action => `• ${action}`).join('\n')}

Which timeframe would you like to focus on first?`;
    }
    
    if (lowerMessage.includes('score') || lowerMessage.includes('rating')) {
      const sectionScores = report.sections
        .filter(section => section.score)
        .map(section => `• ${section.title}: ${section.score}%`)
        .join('\n');
      
      return `Your overall score of ${report.overallScore}% breaks down as follows:

${sectionScores}

${report.overallScore >= 80 ? 'Excellent performance! Focus on optimization and innovation.' : 
  report.overallScore >= 60 ? 'Good foundation with room for improvement in key areas.' : 
  'Significant opportunities for transformation. Let\'s prioritize the highest-impact changes.'}

What specific area would you like to improve first?`;
    }
    
    if (lowerMessage.includes('revenue') || lowerMessage.includes('money') || lowerMessage.includes('roi')) {
      return `Based on your analysis, here's the revenue impact potential:

**Projected Impact**: ${report.revenueImpact.potential}
**Timeline**: ${report.revenueImpact.timeline}
**Confidence Level**: ${report.revenueImpact.confidence}

The highest-impact opportunities for revenue growth are:
${report.opportunityMap.highImpact.map(opp => `• ${opp}`).join('\n')}

Would you like me to help you calculate the specific ROI for any of these initiatives?`;
    }
    
    if (lowerMessage.includes('team') || lowerMessage.includes('role') || lowerMessage.includes('who')) {
      return `Here's how different roles should approach these improvements:

${report.roleBasedActions.map(roleAction => 
  `**${roleAction.role}:**\n${roleAction.actions.map(action => `• ${action}`).join('\n')}`
).join('\n\n')}

Which role would you like to focus on, or do you need help with cross-team coordination?`;
    }
    
    // Default response
    return `That's a great question about your ${report.title}. Based on your ${report.overallScore}% score, I can help you with:

• Understanding your results in detail
• Creating specific action plans
• Prioritizing improvements by impact
• Role-based recommendations
• Revenue growth strategies

What specific aspect would you like to explore further?`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await generateAIResponse(userMessage.content);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const exportChat = () => {
    const chatContent = messages.map(msg => 
      `${msg.role === 'user' ? 'You' : 'AI Assistant'} (${msg.timestamp.toLocaleTimeString()}): ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revyn-chat-${report.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const suggestedQuestions = [
    "How can I improve my score?",
    "What should I focus on first?",
    "Show me the revenue impact",
    "What are my team's next steps?"
  ];

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden h-[80vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Chat About Your Results</h1>
              <p className="text-blue-100">{report.title} • Score: {report.overallScore}%</p>
            </div>
          </div>
          <button
            onClick={exportChat}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Chat</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-600 ml-3' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 mr-3'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={`px-6 py-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center mr-3">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="px-6 py-4 bg-gray-100 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(question)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your report results..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};