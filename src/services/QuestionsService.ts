import { supabase } from '../config/supabase';

export interface Question {
  id: number;
  question_number: number;
  question_text: string;
  format_type: string;
  response_options: string[] | null;
  audit_section_tag: string;
  ai_component: string;
  created_at?: string;
}

export interface Answer {
  id?: number;
  user_id: string;
  question_id: number;
  purchase_id: string;
  answer_text?: string | null;
  answer_options?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface AnswerSubmission {
  question_id: number;
  answer_text?: string;
  answer_options?: string[];
}

export class QuestionsService {
  private static instance: QuestionsService;

  static getInstance(): QuestionsService {
    if (!QuestionsService.instance) {
      QuestionsService.instance = new QuestionsService();
    }
    return QuestionsService.instance;
  }

  /**
   * Load all questions from the database
   */
  async loadQuestions(): Promise<Question[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('question_number');

      if (error) {
        console.error('Error loading questions:', error);
        throw new Error('Failed to load questions');
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadQuestions:', error);
      throw error;
    }
  }

  /**
   * Load questions for a specific audit section
   */
  async loadQuestionsBySection(sectionTag: string): Promise<Question[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('audit_section_tag', sectionTag)
        .order('question_number');

      if (error) {
        console.error('Error loading questions by section:', error);
        throw new Error('Failed to load questions for section');
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadQuestionsBySection:', error);
      throw error;
    }
  }

  /**
   * Save or update an answer
   */
  async saveAnswer(userId: string, questionId: number, purchaseId: string, answerData: AnswerSubmission): Promise<Answer> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .upsert({
          user_id: userId,
          question_id: questionId,
          purchase_id: purchaseId,
          answer_text: answerData.answer_text || null,
          answer_options: answerData.answer_options || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,question_id,purchase_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving answer:', error);
        throw new Error('Failed to save answer');
      }

      return data;
    } catch (error) {
      console.error('Error in saveAnswer:', error);
      throw error;
    }
  }

  /**
   * Load existing answers for a user and purchase
   */
  async loadAnswers(userId: string, purchaseId: string): Promise<Answer[]> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('user_id', userId)
        .eq('purchase_id', purchaseId)
        .order('question_id');

      if (error) {
        console.error('Error loading answers:', error);
        throw new Error('Failed to load answers');
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadAnswers:', error);
      throw error;
    }
  }

  /**
   * Load answers with their corresponding questions
   */
  async loadAnswersWithQuestions(userId: string, purchaseId: string): Promise<Array<Answer & { question: Question }>> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          question:questions(*)
        `)
        .eq('user_id', userId)
        .eq('purchase_id', purchaseId)
        .order('question_id');

      if (error) {
        console.error('Error loading answers with questions:', error);
        throw new Error('Failed to load answers with questions');
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadAnswersWithQuestions:', error);
      throw error;
    }
  }

  /**
   * Get completion statistics for a purchase
   */
  async getCompletionStats(userId: string, purchaseId: string): Promise<{
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
    remainingSections: string[];
  }> {
    try {
      // Get total questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, audit_section_tag');

      if (questionsError) throw questionsError;

      // Get answered questions
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('question_id')
        .eq('user_id', userId)
        .eq('purchase_id', purchaseId);

      if (answersError) throw answersError;

      const totalQuestions = questions?.length || 0;
      const answeredQuestions = answers?.length || 0;
      const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

      // Find sections with unanswered questions
      const answeredQuestionIds = new Set(answers?.map(a => a.question_id) || []);
      const unansweredQuestions = questions?.filter(q => !answeredQuestionIds.has(q.id)) || [];
      const remainingSections = [...new Set(unansweredQuestions.map(q => q.audit_section_tag))];

      return {
        totalQuestions,
        answeredQuestions,
        completionPercentage,
        remainingSections
      };
    } catch (error) {
      console.error('Error getting completion stats:', error);
      throw error;
    }
  }

  /**
   * Check if user has already purchased and started this report type
   */
  async checkExistingProgress(userId: string, reportTypeId: string): Promise<{
    hasPurchase: boolean;
    purchaseId?: string;
    hasStarted: boolean;
    completionPercentage: number;
  }> {
    try {
      // Check for existing purchase
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select('id, report_ids')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .contains('report_ids', [reportTypeId]);

      if (purchaseError) throw purchaseError;

      if (!purchases || purchases.length === 0) {
        return {
          hasPurchase: false,
          hasStarted: false,
          completionPercentage: 0
        };
      }

      const purchase = purchases[0];
      
      // Check for existing answers
      const stats = await this.getCompletionStats(userId, purchase.id);

      return {
        hasPurchase: true,
        purchaseId: purchase.id,
        hasStarted: stats.answeredQuestions > 0,
        completionPercentage: stats.completionPercentage
      };
    } catch (error) {
      console.error('Error checking existing progress:', error);
      throw error;
    }
  }
}