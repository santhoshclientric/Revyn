export interface AuditQuestion {
  id: number;
  category: string;
  question: string;
  type: 'multiple-choice' | 'scale' | 'text';
  options?: string[];
  required: boolean;
}

export interface AuditAnswer {
  questionId: number;
  answer: string | number;
  category: string;
}

export interface AuditSubmission {
  id?: string;
  userId?: string;
  companyName: string;
  email: string;
  answers: AuditAnswer[];
  completedAt: string;
  score?: number;
}