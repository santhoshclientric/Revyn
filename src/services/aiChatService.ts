import { ReportSubmission, GeneratedReport, ReportSection, ActionPlan, OpportunityMap, RoleBasedAction, RevenueImpact } from '../types/reports';
import { reportTypes } from '../data/reportTypes';

// ========================================
// ENHANCED CHAT INTERFACES FOR NEW SYSTEM
// ========================================

interface StreamCallback {
  (token: string | null): void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  name: string;
  report_type: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview: string;
}

interface ChatSessionResponse {
  success: boolean;
  chat_session_id: string;
  report_type: string;
  messages: ChatMessage[];
}

interface AIResultsResponse {
  id: string;
  purchase_id: string;
  result_data: any;
  website_analysis: any;
  result_data_thread_id?: string;
  website_analysis_thread_id?: string;
  status: string;
}

interface SuggestedQuestionsResponse {
  questions: string[];
  report_type: string;
}

export class AIService {
  private static instance: AIService;
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }
  
  static getInstance(): AIService { 
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // ========================================
  // NEW SESSION-BASED CHAT METHODS
  // ========================================

  /**
   * Create a new chat session for a report type
   */
  async createChatSession(
    purchaseId: string, 
    initialMessage: string, 
    reportType: 'marketing' | 'website' = 'marketing'
  ): Promise<ChatSessionResponse> {
    try {
      console.log('Creating new chat session:', { purchaseId, reportType, initialMessage });
      const serverurl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${serverurl}/api/chat-sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_id: purchaseId,
          initial_message: initialMessage,
          report_type: reportType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create chat session: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  /**
   * Send message to existing chat session with streaming
   */
  async sendMessageToSession(
    sessionId: string,
    message: string,
    onToken: StreamCallback
  ): Promise<void> {
    try {
      console.log('Sending message to session:', sessionId);

      const response = await fetch(`${this.baseUrl}/api/chat-sessions/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                if (jsonStr === '[DONE]') {
                  onToken(null);
                  return;
                }
                
                const parsed = JSON.parse(jsonStr);
                if (parsed.token) {
                  onToken(parsed.token);
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', trimmed, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onToken(null);

    } catch (error) {
      console.error('Error in sendMessageToSession:', error);
      throw error;
    }
  }

  /**
   * Get all chat sessions for a purchase
   */
  async getChatSessions(purchaseId: string): Promise<{marketing: ChatSession[], website: ChatSession[], all: ChatSession[]}> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat-sessions?purchase_id=${purchaseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch chat sessions: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      throw error;
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string): Promise<{messages: ChatMessage[], session_info: any}> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat-sessions/${sessionId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch chat history: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  }

  /**
   * Get suggested questions dynamically from report data
   */
  async getSuggestedQuestions(purchaseId: string, reportType: 'marketing' | 'website'): Promise<SuggestedQuestionsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat-sessions/suggested-questions/${purchaseId}?report_type=${reportType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch suggested questions: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching suggested questions:', error);
      // Return fallback questions
      return {
        questions: this.getFallbackQuestions(reportType),
        report_type: reportType
      };
    }
  }

  // ========================================
  // UTILITY METHODS FOR NEW SYSTEM
  // ========================================

  /**
   * Get fallback questions if report data doesn't have follow_up
   */
  private getFallbackQuestions(reportType: 'marketing' | 'website'): string[] {
    const fallbackQuestions = {
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
    
    return fallbackQuestions[reportType] || fallbackQuestions.marketing;
  }

  /**
   * Format chat message for display with better typing
   */
  formatChatMessage(content: string, role: 'user' | 'assistant'): ChatMessage {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content: content.trim(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get welcome message for chat initialization
   */
  getWelcomeMessage(
    type: 'marketing' | 'website', 
    companyName: string, 
    overallScore?: number
  ): ChatMessage {
    const content = type === 'marketing' 
      ? `Hello! I'm here to help you understand your marketing audit results for ${companyName || 'your company'}${overallScore ? `. Your overall marketing score is ${overallScore}%` : ''}. You can ask me anything about your report, or click on one of the suggested questions below.`
      : `Hello! I'm here to help you understand your website analysis results for ${companyName || 'your company'}. I can explain your score, discuss specific issues, and help you prioritize improvements. You can ask me anything about your analysis, or click on one of the suggested questions below.`;

    return this.formatChatMessage(content, 'assistant');
  }

  /**
   * Enhanced error formatting for user-friendly messages
   */
  formatChatError(error: any): string {
    if (error.message?.includes('Session not found')) {
      return 'This chat session is no longer available. Please start a new conversation.';
    }
    
    if (error.message?.includes('Report not found')) {
      return 'Report data not found. Please contact support if this issue persists.';
    }
    
    if (error.message?.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    
    if (error.message?.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (error.message?.includes('assistant not configured')) {
      return 'Chat system is temporarily unavailable. Please try again later.';
    }

    return `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
  }

  // ========================================
  // EXISTING REPORT GENERATION METHODS (UNCHANGED)
  // ========================================

  async generateReport(submission: ReportSubmission): Promise<GeneratedReport> {
    const reportType = reportTypes.find(rt => rt.id === submission.reportTypeId);
    if (!reportType) {
      throw new Error('Report type not found');
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    const report: GeneratedReport = {
      id: `report_${Date.now()}`,
      reportTypeId: submission.reportTypeId,
      title: `${reportType.name} - ${submission.companyName}`,
      overallScore: this.calculateOverallScore(submission),
      sections: this.generateSections(submission, reportType),
      actionPlan: this.generateActionPlan(submission),
      opportunityMap: this.generateOpportunityMap(submission),
      roleBasedActions: this.generateRoleBasedActions(submission),
      revenueImpact: this.generateRevenueImpact(submission),
      generatedAt: new Date().toISOString()
    };

    return report;
  }

  private calculateOverallScore(submission: ReportSubmission): number {
    return Math.floor(Math.random() * 40) + 60; // 60-100 range
  }

  private generateSections(submission: ReportSubmission, reportType: any): ReportSection[] {
    const sections: ReportSection[] = [];
    
    if (reportType.id === 'marketing-audit') {
      sections.push(
        {
          title: 'Marketing Clarity Score',
          content: 'Your marketing strategy shows strong foundational elements with opportunities for optimization.',
          score: 78,
          insights: [
            'Brand messaging is consistent across most channels',
            'Social media presence needs more strategic focus',
            'Website SEO has significant improvement potential'
          ],
          recommendations: [
            'Develop a comprehensive content calendar',
            'Implement advanced SEO optimization',
            'Create targeted social media campaigns'
          ]
        },
        {
          title: 'Channel Effectiveness Analysis',
          content: 'Current marketing channels show varied performance with clear optimization opportunities.',
          score: 72,
          insights: [
            'Email marketing shows highest ROI potential',
            'Social media engagement rates below industry average',
            'Paid advertising needs better targeting'
          ],
          recommendations: [
            'Increase email marketing frequency and personalization',
            'Optimize social media posting schedule',
            'Refine paid advertising audience targeting'
          ]
        }
      );
    }

    return sections;
  }

  private generateActionPlan(submission: ReportSubmission): ActionPlan {
    return {
      threeMonth: [
        'Implement immediate quick-win optimizations',
        'Set up proper tracking and analytics',
        'Create standardized processes'
      ],
      sixMonth: [
        'Launch strategic initiatives',
        'Expand successful channels',
        'Implement automation systems'
      ],
      twelveMonth: [
        'Scale proven strategies',
        'Enter new markets or channels',
        'Develop advanced capabilities'
      ]
    };
  }

  private generateOpportunityMap(submission: ReportSubmission): OpportunityMap {
    return {
      highImpact: [
        'Optimize conversion funnel',
        'Implement marketing automation',
        'Improve customer retention'
      ],
      mediumImpact: [
        'Expand content marketing',
        'Enhance social media presence',
        'Develop partnership channels'
      ],
      lowImpact: [
        'Refine brand messaging',
        'Update website design',
        'Implement advanced analytics'
      ]
    };
  }

  private generateRoleBasedActions(submission: ReportSubmission): RoleBasedAction[] {
    return [
      {
        role: 'CEO/Leadership',
        actions: [
          'Approve budget for recommended initiatives',
          'Set strategic priorities and KPIs',
          'Champion organizational changes'
        ]
      },
      {
        role: 'Marketing Team',
        actions: [
          'Implement content calendar',
          'Optimize digital campaigns',
          'Set up tracking and reporting'
        ]
      },
      {
        role: 'Sales Team',
        actions: [
          'Align messaging with marketing',
          'Implement lead scoring',
          'Improve follow-up processes'
        ]
      }
    ];
  }

  private generateRevenueImpact(submission: ReportSubmission): RevenueImpact {
    return {
      potential: '15-30% revenue increase within 12 months',
      timeline: '3-6 months to see initial results',
      confidence: 'high'
    };
  }

  async analyzeWebsite(url: string): Promise<any> {
    return {
      seoScore: 72,
      performanceScore: 85,
      contentQuality: 68,
      recommendations: [
        'Improve meta descriptions',
        'Optimize images for faster loading',
        'Add more internal links'
      ]
    };
  }

  async analyzeSocialMedia(handles: string[]): Promise<any> {
    return {
      overallScore: 75,
      platforms: handles.map(handle => ({
        platform: handle,
        score: Math.floor(Math.random() * 40) + 60,
        recommendations: ['Post more consistently', 'Improve engagement']
      }))
    };
  }

  // ========================================
  // LEGACY METHODS (DEPRECATED - For backwards compatibility)
  // ========================================

  /**
   * @deprecated Use createChatSession instead
   */
  async getAIResults(purchaseId: string): Promise<AIResultsResponse> {
    console.warn('getAIResults is deprecated, use session-based methods instead');
    
    try {
      console.log('Fetching AI results for purchase:', purchaseId);

      // This could still be useful for getting raw report data
      const response = await fetch(`${this.baseUrl}/api/ai-results/${purchaseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch AI results: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching AI results:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use sendMessageToSession instead
   */
  async sendMessageToThread(
    threadId: string, 
    message: string, 
    onToken: StreamCallback,
    assistantType: 'marketing' | 'website' = 'marketing'
  ): Promise<void> {
    console.warn('sendMessageToThread is deprecated, use sendMessageToSession instead');
    
    try {
      console.log('Sending message to legacy thread:', threadId);

      const response = await fetch(`${this.baseUrl}/api/ai-chat/continue-thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: threadId,
          message: message,
          assistant_type: assistantType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Handle streaming response (same logic as before)
      const reader = response.body?.getReader();
      if (!reader) {
        const data = await response.json();
        if (data.response) {
          onToken(data.response);
        }
        onToken(null);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                if (jsonStr === '[DONE]') {
                  onToken(null);
                  return;
                }
                
                const parsed = JSON.parse(jsonStr);
                if (parsed.token) {
                  onToken(parsed.token);
                } else if (parsed.content) {
                  onToken(parsed.content);
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', trimmed, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onToken(null);

    } catch (error) {
      console.error('Error in sendMessageToThread:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use getSuggestedQuestions instead
   */
  extractFollowUpQuestions(aiResults: any, type: 'marketing' | 'website'): string[] {
    console.warn('extractFollowUpQuestions is deprecated, use getSuggestedQuestions instead');
    
    try {
      if (type === 'marketing' && aiResults.result_data?.follow_up) {
        return Array.isArray(aiResults.result_data.follow_up) 
          ? aiResults.result_data.follow_up 
          : [];
      }
      
      if (type === 'website' && aiResults.website_analysis?.follow_up) {
        return Array.isArray(aiResults.website_analysis.follow_up) 
          ? aiResults.website_analysis.follow_up 
          : [];
      }

      return this.getFallbackQuestions(type);
    } catch (error) {
      console.error('Error extracting follow-up questions:', error);
      return this.getFallbackQuestions(type);
    }
  }
}