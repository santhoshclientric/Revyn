export interface ReportType {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  estimatedTime: string;
  questions: ReportQuestion[];
}

export interface ReportQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'multi-select' | 'text' | 'textarea';
  options?: string[];
  required: boolean;
  prompt?: string; // AI prompt for processing this specific field
}

export interface ReportAnswer {
  questionId: string;
  answer: string | string[];
}

export interface ReportSubmission {
  id: string;
  userId: string;
  reportTypeId: string;
  companyName: string;
  email: string;
  answers: ReportAnswer[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  reportData?: GeneratedReport;
  paymentId?: string;
}

export interface GeneratedReport {
  id: string;
  reportTypeId: string;
  title: string;
  overallScore: number;
  sections: ReportSection[];
  actionPlan: ActionPlan;
  opportunityMap: OpportunityMap;
  roleBasedActions: RoleBasedAction[];
  revenueImpact: RevenueImpact;
  generatedAt: string;
}

export interface ReportSection {
  title: string;
  content: string;
  score?: number;
  insights: string[];
  recommendations: string[];
}

export interface ActionPlan {
  threeMonth: string[];
  sixMonth: string[];
  twelveMonth: string[];
}

export interface OpportunityMap {
  highImpact: string[];
  mediumImpact: string[];
  lowImpact: string[];
}

export interface RoleBasedAction {
  role: string;
  actions: string[];
}

export interface RevenueImpact {
  potential: string;
  timeline: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  purchasedReports: string[];
  createdAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  reportIds: string[];
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentId?: string;
  createdAt: string;
}