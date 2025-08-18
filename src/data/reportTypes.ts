import { ReportType } from '../types/reports';

export const reportTypes: ReportType[] = [
  {
    id: 'marketing-audit',
    name: 'Marketing Strategy & Brand Audit',
    description: 'Comprehensive analysis of your marketing strategy, brand alignment, and channel effectiveness',
    price: 125,
    category: 'Marketing',
    estimatedTime: '15-20 minutes',
    available: true,
    questions: [
      {
        id: 'website-url',
        question: 'What is your company website URL?',
        type: 'text',
        required: true,
        prompt: 'Analyze the provided website URL for SEO fundamentals, content quality, user experience, and brand consistency. Provide specific recommendations for improvement.'
      },
      {
        id: 'social-channels',
        question: 'What social media channels does your company use? (Select all that apply)',
        type: 'multi-select',
        options: ['Facebook', 'Instagram', 'Twitter/X', 'LinkedIn', 'TikTok', 'YouTube', 'Pinterest', 'Other'],
        required: true,
        prompt: 'Evaluate the social media presence across selected channels for consistency, engagement, and brand alignment.'
      },
      {
        id: 'social-handles',
        question: 'Please provide your social media handles/URLs (one per line)',
        type: 'textarea',
        required: false,
        prompt: 'Analyze the provided social media profiles for content strategy, posting frequency, engagement rates, and optimization opportunities.'
      },
      {
        id: 'target-audience',
        question: 'Who is your primary target audience?',
        type: 'textarea',
        required: true,
        prompt: 'Assess how well the current marketing strategy aligns with the described target audience and suggest improvements.'
      },
      {
        id: 'marketing-budget',
        question: 'What is your monthly marketing budget?',
        type: 'multiple-choice',
        options: ['Under $1,000', '$1,000 - $5,000', '$5,000 - $15,000', '$15,000 - $50,000', 'Over $50,000'],
        required: true,
        prompt: 'Provide budget allocation recommendations and ROI optimization strategies based on the budget range.'
      },
      {
        id: 'marketing-channels',
        question: 'Which marketing channels do you currently use? (Select all that apply)',
        type: 'multi-select',
        options: ['SEO', 'Google Ads', 'Facebook Ads', 'Email Marketing', 'Content Marketing', 'Social Media', 'Influencer Marketing', 'PR', 'Events', 'Direct Mail'],
        required: true,
        prompt: 'Analyze the current marketing channel mix and provide recommendations for optimization and expansion.'
      },
      {
        id: 'biggest-challenge',
        question: 'What is your biggest marketing challenge right now?',
        type: 'textarea',
        required: true,
        prompt: 'Provide specific solutions and strategies to address the identified marketing challenge.'
      },
      {
        id: 'marketing-goals',
        question: 'What are your primary marketing goals? (Select all that apply)',
        type: 'multi-select',
        options: ['Increase brand awareness', 'Generate more leads', 'Improve conversion rates', 'Boost customer retention', 'Expand market reach', 'Launch new products'],
        required: true,
        prompt: 'Create a strategic roadmap to achieve the selected marketing goals with specific tactics and timelines.'
      },
      {
        id: 'content-strategy',
        question: 'How would you describe your current content strategy?',
        type: 'multiple-choice',
        options: ['We have a comprehensive content strategy', 'We create content occasionally', 'We post randomly without strategy', 'We don\'t create much content'],
        required: true,
        prompt: 'Evaluate the content strategy maturity and provide recommendations for improvement and consistency.'
      },
      {
        id: 'marketing-team',
        question: 'How many people work on marketing in your company?',
        type: 'multiple-choice',
        options: ['Just me', '2-3 people', '4-10 people', '10+ people', 'We outsource everything'],
        required: true,
        prompt: 'Assess team structure and provide recommendations for roles, responsibilities, and potential team expansion or optimization.'
      }
    ]
  },
  {
    id: 'sales-performance',
    name: 'Sales Performance Snapshot',
    description: 'Deep dive into your sales funnel, processes, and performance metrics',
    price: 125,
    category: 'Sales',
    estimatedTime: '12-15 minutes',
    available: false,
    questions: [
      {
        id: 'sales-process',
        question: 'How would you describe your current sales process?',
        type: 'multiple-choice',
        options: ['Highly structured with clear stages', 'Somewhat structured', 'Informal process', 'No defined process'],
        required: true,
        prompt: 'Analyze the sales process maturity and provide recommendations for structure, stages, and optimization.'
      },
      {
        id: 'average-deal-size',
        question: 'What is your average deal size?',
        type: 'multiple-choice',
        options: ['Under $1,000', '$1,000 - $5,000', '$5,000 - $25,000', '$25,000 - $100,000', 'Over $100,000'],
        required: true,
        prompt: 'Provide strategies for deal size optimization and upselling opportunities based on the current average.'
      },
      {
        id: 'sales-cycle',
        question: 'How long is your typical sales cycle?',
        type: 'multiple-choice',
        options: ['Less than 1 week', '1-4 weeks', '1-3 months', '3-6 months', 'Over 6 months'],
        required: true,
        prompt: 'Analyze sales cycle efficiency and provide recommendations for acceleration and bottleneck removal.'
      },
      {
        id: 'lead-sources',
        question: 'What are your primary lead sources? (Select all that apply)',
        type: 'multi-select',
        options: ['Referrals', 'Website', 'Social Media', 'Cold Outreach', 'Networking Events', 'Paid Advertising', 'Content Marketing', 'Partnerships'],
        required: true,
        prompt: 'Evaluate lead source effectiveness and provide recommendations for diversification and optimization.'
      },
      {
        id: 'conversion-rate',
        question: 'What is your approximate lead-to-customer conversion rate?',
        type: 'multiple-choice',
        options: ['Under 5%', '5-15%', '15-30%', '30-50%', 'Over 50%'],
        required: true,
        prompt: 'Analyze conversion rate performance and provide specific strategies for improvement.'
      },
      {
        id: 'crm-usage',
        question: 'Do you use a CRM system?',
        type: 'multiple-choice',
        options: ['Yes, we use it extensively', 'Yes, but not consistently', 'We have one but rarely use it', 'No CRM system'],
        required: true,
        prompt: 'Assess CRM utilization and provide recommendations for implementation or optimization.'
      },
      {
        id: 'sales-team-size',
        question: 'How many people are involved in sales?',
        type: 'multiple-choice',
        options: ['Just me', '2-3 people', '4-10 people', '10+ people'],
        required: true,
        prompt: 'Evaluate sales team structure and provide recommendations for roles, territories, and scaling.'
      },
      {
        id: 'biggest-sales-challenge',
        question: 'What is your biggest sales challenge?',
        type: 'textarea',
        required: true,
        prompt: 'Provide specific solutions and strategies to overcome the identified sales challenge.'
      }
    ]
  },
  {
    id: 'financial-health',
    name: 'Financial Health Snapshot',
    description: 'Comprehensive analysis of your financial performance, cash flow, and profitability',
    price: 125,
    category: 'Finance',
    estimatedTime: '10-15 minutes',
    available: false,
    questions: [
      {
        id: 'annual-revenue',
        question: 'What is your approximate annual revenue?',
        type: 'multiple-choice',
        options: ['Under $100K', '$100K - $500K', '$500K - $1M', '$1M - $5M', '$5M - $10M', 'Over $10M'],
        required: true,
        prompt: 'Analyze revenue performance and provide benchmarking insights and growth strategies.'
      },
      {
        id: 'profit-margin',
        question: 'What is your approximate profit margin?',
        type: 'multiple-choice',
        options: ['Less than 5%', '5-15%', '15-25%', '25-40%', 'Over 40%', 'Not sure'],
        required: true,
        prompt: 'Evaluate profit margin health and provide recommendations for improvement and cost optimization.'
      },
      {
        id: 'cash-flow',
        question: 'How would you describe your cash flow situation?',
        type: 'multiple-choice',
        options: ['Always positive', 'Usually positive', 'Break even', 'Often negative', 'Always struggling'],
        required: true,
        prompt: 'Assess cash flow health and provide strategies for improvement and financial stability.'
      },
      {
        id: 'financial-tracking',
        question: 'How do you track your finances?',
        type: 'multiple-choice',
        options: ['Professional accounting software', 'Spreadsheets', 'Basic bookkeeping', 'Minimal tracking'],
        required: true,
        prompt: 'Evaluate financial tracking sophistication and recommend improvements for better financial management.'
      },
      {
        id: 'biggest-expenses',
        question: 'What are your biggest business expenses? (Select all that apply)',
        type: 'multi-select',
        options: ['Payroll', 'Rent/Facilities', 'Marketing', 'Technology', 'Inventory', 'Professional Services', 'Insurance', 'Other'],
        required: true,
        prompt: 'Analyze expense structure and provide cost optimization recommendations.'
      },
      {
        id: 'pricing-strategy',
        question: 'How confident are you in your pricing strategy?',
        type: 'multiple-choice',
        options: ['Very confident', 'Somewhat confident', 'Unsure', 'Need to review pricing'],
        required: true,
        prompt: 'Evaluate pricing strategy effectiveness and provide optimization recommendations.'
      },
      {
        id: 'financial-goals',
        question: 'What are your primary financial goals?',
        type: 'textarea',
        required: true,
        prompt: 'Create a strategic financial roadmap to achieve the stated goals with specific milestones and tactics.'
      }
    ]
  },
  {
    id: 'operations-audit',
    name: 'Operations & Production Health Audit',
    description: 'Analysis of your operational efficiency, workflows, and production capabilities',
    price: 125,
    category: 'Operations',
    estimatedTime: '12-18 minutes',
    available: false,
    questions: [
      {
        id: 'business-type',
        question: 'What type of business do you operate?',
        type: 'multiple-choice',
        options: ['Service-based', 'Product-based', 'SaaS/Software', 'E-commerce', 'Manufacturing', 'Consulting', 'Other'],
        required: true,
        prompt: 'Analyze operational requirements specific to the business type and provide tailored recommendations.'
      },
      {
        id: 'operational-processes',
        question: 'How would you rate your operational processes?',
        type: 'multiple-choice',
        options: ['Highly optimized', 'Well-structured', 'Somewhat organized', 'Mostly ad-hoc', 'Chaotic'],
        required: true,
        prompt: 'Evaluate operational maturity and provide specific recommendations for process improvement.'
      },
      {
        id: 'bottlenecks',
        question: 'What are your biggest operational bottlenecks?',
        type: 'textarea',
        required: true,
        prompt: 'Identify solutions and process improvements to eliminate the described bottlenecks.'
      },
      {
        id: 'automation-level',
        question: 'How much of your operations are automated?',
        type: 'multiple-choice',
        options: ['Highly automated', 'Some automation', 'Minimal automation', 'Mostly manual'],
        required: true,
        prompt: 'Assess automation opportunities and provide recommendations for efficiency improvements.'
      },
      {
        id: 'quality-control',
        question: 'Do you have quality control processes in place?',
        type: 'multiple-choice',
        options: ['Comprehensive QC system', 'Basic quality checks', 'Informal quality control', 'No formal QC'],
        required: true,
        prompt: 'Evaluate quality control effectiveness and recommend improvements for consistency and reliability.'
      },
      {
        id: 'capacity-utilization',
        question: 'How would you describe your current capacity utilization?',
        type: 'multiple-choice',
        options: ['At full capacity', 'Near capacity', 'Moderate utilization', 'Significant unused capacity'],
        required: true,
        prompt: 'Analyze capacity utilization and provide recommendations for optimization and scaling.'
      },
      {
        id: 'operational-tools',
        question: 'What tools do you use for operations management?',
        type: 'textarea',
        required: false,
        prompt: 'Evaluate current tool stack and recommend optimizations or additions for better operational efficiency.'
      }
    ]
  },
  {
    id: 'hr-team-readiness',
    name: 'HR & Team Readiness Snapshot',
    description: 'Assessment of your team structure, culture, and human resources effectiveness',
    price: 125,
    category: 'HR',
    estimatedTime: '10-15 minutes',
    available: false,
    questions: [
      {
        id: 'team-size',
        question: 'How many employees do you have?',
        type: 'multiple-choice',
        options: ['Just me', '2-5 employees', '6-15 employees', '16-50 employees', '50+ employees'],
        required: true,
        prompt: 'Analyze team size appropriateness and provide recommendations for structure and growth.'
      },
      {
        id: 'organizational-structure',
        question: 'How would you describe your organizational structure?',
        type: 'multiple-choice',
        options: ['Clear hierarchy and roles', 'Somewhat structured', 'Flat organization', 'Unclear structure'],
        required: true,
        prompt: 'Evaluate organizational structure effectiveness and recommend improvements for clarity and efficiency.'
      },
      {
        id: 'role-clarity',
        question: 'How clear are roles and responsibilities in your organization?',
        type: 'multiple-choice',
        options: ['Very clear', 'Mostly clear', 'Somewhat unclear', 'Very unclear'],
        required: true,
        prompt: 'Assess role clarity and provide recommendations for better definition and accountability.'
      },
      {
        id: 'team-performance',
        question: 'How would you rate your team\'s overall performance?',
        type: 'multiple-choice',
        options: ['Excellent', 'Good', 'Average', 'Below average', 'Poor'],
        required: true,
        prompt: 'Analyze team performance factors and provide strategies for improvement and motivation.'
      },
      {
        id: 'retention-challenges',
        question: 'Do you face employee retention challenges?',
        type: 'multiple-choice',
        options: ['No retention issues', 'Minor challenges', 'Moderate turnover', 'High turnover'],
        required: true,
        prompt: 'Identify retention risk factors and provide strategies for improving employee satisfaction and retention.'
      },
      {
        id: 'company-culture',
        question: 'How would you describe your company culture?',
        type: 'textarea',
        required: true,
        prompt: 'Evaluate culture health and provide recommendations for strengthening positive cultural elements.'
      },
      {
        id: 'hr-processes',
        question: 'What HR processes do you have in place? (Select all that apply)',
        type: 'multi-select',
        options: ['Formal hiring process', 'Performance reviews', 'Training programs', 'Employee handbook', 'Benefits administration', 'None of the above'],
        required: true,
        prompt: 'Assess HR process maturity and recommend implementations for better people management.'
      }
    ]
  }
];

export const bundlePrice = 550;
export const individualPrice = 125;