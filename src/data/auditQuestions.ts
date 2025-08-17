import { AuditQuestion } from '../types/audit';

export const auditQuestions: AuditQuestion[] = [
  // Strategy & Planning (10 questions)
  {
    id: 1,
    category: 'Strategy & Planning',
    question: 'Does your company have a clearly defined marketing strategy?',
    type: 'multiple-choice',
    options: ['Yes, comprehensive strategy', 'Basic strategy exists', 'Informal approach', 'No strategy'],
    required: true
  },
  {
    id: 2,
    category: 'Strategy & Planning',
    question: 'How well-defined are your target customer personas?',
    type: 'scale',
    required: true
  },
  {
    id: 3,
    category: 'Strategy & Planning',
    question: 'Do you have documented marketing goals and KPIs?',
    type: 'multiple-choice',
    options: ['Yes, detailed and tracked', 'Basic goals set', 'Informal goals', 'No clear goals'],
    required: true
  },
  {
    id: 4,
    category: 'Strategy & Planning',
    question: 'How often do you review and update your marketing strategy?',
    type: 'multiple-choice',
    options: ['Quarterly', 'Bi-annually', 'Annually', 'Rarely/Never'],
    required: true
  },
  {
    id: 5,
    category: 'Strategy & Planning',
    question: 'What percentage of your revenue is allocated to marketing?',
    type: 'multiple-choice',
    options: ['10%+', '5-10%', '2-5%', 'Less than 2%'],
    required: true
  },
  {
    id: 6,
    category: 'Strategy & Planning',
    question: 'Do you have a competitive analysis framework?',
    type: 'multiple-choice',
    options: ['Comprehensive framework', 'Basic analysis', 'Informal monitoring', 'No analysis'],
    required: true
  },
  {
    id: 7,
    category: 'Strategy & Planning',
    question: 'How aligned is your marketing with sales objectives?',
    type: 'scale',
    required: true
  },
  {
    id: 8,
    category: 'Strategy & Planning',
    question: 'Do you have a documented brand positioning statement?',
    type: 'multiple-choice',
    options: ['Yes, well-defined', 'Basic positioning', 'Informal understanding', 'No positioning'],
    required: true
  },
  {
    id: 9,
    category: 'Strategy & Planning',
    question: 'How do you prioritize marketing initiatives?',
    type: 'multiple-choice',
    options: ['Data-driven framework', 'ROI-based decisions', 'Management intuition', 'Ad-hoc decisions'],
    required: true
  },
  {
    id: 10,
    category: 'Strategy & Planning',
    question: 'What is your primary marketing objective?',
    type: 'multiple-choice',
    options: ['Lead generation', 'Brand awareness', 'Customer retention', 'Revenue growth'],
    required: true
  },

  // Digital Presence (15 questions)
  {
    id: 11,
    category: 'Digital Presence',
    question: 'How would you rate your website\'s user experience?',
    type: 'scale',
    required: true
  },
  {
    id: 12,
    category: 'Digital Presence',
    question: 'Is your website mobile-optimized?',
    type: 'multiple-choice',
    options: ['Fully responsive', 'Mostly optimized', 'Basic mobile view', 'Not optimized'],
    required: true
  },
  {
    id: 13,
    category: 'Digital Presence',
    question: 'How fast does your website load?',
    type: 'multiple-choice',
    options: ['Under 2 seconds', '2-3 seconds', '3-5 seconds', 'Over 5 seconds'],
    required: true
  },
  {
    id: 14,
    category: 'Digital Presence',
    question: 'Do you have SEO optimization in place?',
    type: 'multiple-choice',
    options: ['Comprehensive SEO', 'Basic optimization', 'Minimal SEO', 'No SEO'],
    required: true
  },
  {
    id: 15,
    category: 'Digital Presence',
    question: 'How often do you update your website content?',
    type: 'multiple-choice',
    options: ['Weekly', 'Monthly', 'Quarterly', 'Rarely'],
    required: true
  },
  {
    id: 16,
    category: 'Digital Presence',
    question: 'Do you have a blog or content hub?',
    type: 'multiple-choice',
    options: ['Active blog with regular posts', 'Occasional blog posts', 'Static content only', 'No blog'],
    required: true
  },
  {
    id: 17,
    category: 'Digital Presence',
    question: 'How effective is your website at converting visitors?',
    type: 'scale',
    required: true
  },
  {
    id: 18,
    category: 'Digital Presence',
    question: 'Do you have clear calls-to-action on your website?',
    type: 'multiple-choice',
    options: ['Strategic CTAs throughout', 'Some CTAs present', 'Minimal CTAs', 'No clear CTAs'],
    required: true
  },
  {
    id: 19,
    category: 'Digital Presence',
    question: 'Is your website accessible (WCAG compliant)?',
    type: 'multiple-choice',
    options: ['Fully compliant', 'Mostly accessible', 'Basic accessibility', 'Not considered'],
    required: true
  },
  {
    id: 20,
    category: 'Digital Presence',
    question: 'Do you have a search function on your website?',
    type: 'multiple-choice',
    options: ['Advanced search with filters', 'Basic search', 'Simple search', 'No search'],
    required: true
  },
  {
    id: 21,
    category: 'Digital Presence',
    question: 'How secure is your website?',
    type: 'multiple-choice',
    options: ['SSL + security measures', 'SSL certificate only', 'Basic security', 'Unsure about security'],
    required: true
  },
  {
    id: 22,
    category: 'Digital Presence',
    question: 'Do you have website analytics set up?',
    type: 'multiple-choice',
    options: ['Comprehensive analytics', 'Google Analytics', 'Basic tracking', 'No analytics'],
    required: true
  },
  {
    id: 23,
    category: 'Digital Presence',
    question: 'How well does your website represent your brand?',
    type: 'scale',
    required: true
  },
  {
    id: 24,
    category: 'Digital Presence',
    question: 'Do you have landing pages for campaigns?',
    type: 'multiple-choice',
    options: ['Dedicated landing pages', 'Some campaign pages', 'Generic pages', 'No landing pages'],
    required: true
  },
  {
    id: 25,
    category: 'Digital Presence',
    question: 'Is your contact information easily accessible?',
    type: 'multiple-choice',
    options: ['Multiple contact options', 'Basic contact info', 'Limited contact info', 'Hard to find'],
    required: true
  },

  // Social Media (10 questions)
  {
    id: 26,
    category: 'Social Media',
    question: 'How active is your company on social media?',
    type: 'scale',
    required: true
  },
  {
    id: 27,
    category: 'Social Media',
    question: 'Which social media platforms do you use?',
    type: 'text',
    required: true
  },
  {
    id: 28,
    category: 'Social Media',
    question: 'How often do you post on social media?',
    type: 'multiple-choice',
    options: ['Daily', 'Several times per week', 'Weekly', 'Rarely'],
    required: true
  },
  {
    id: 29,
    category: 'Social Media',
    question: 'Do you have a social media content strategy?',
    type: 'multiple-choice',
    options: ['Comprehensive strategy', 'Basic content plan', 'Informal approach', 'No strategy'],
    required: true
  },
  {
    id: 30,
    category: 'Social Media',
    question: 'How do you measure social media success?',
    type: 'multiple-choice',
    options: ['Comprehensive metrics', 'Basic engagement', 'Follower count', 'No measurement'],
    required: true
  },
  {
    id: 31,
    category: 'Social Media',
    question: 'Do you engage with your audience on social media?',
    type: 'scale',
    required: true
  },
  {
    id: 32,
    category: 'Social Media',
    question: 'Do you use social media for customer service?',
    type: 'multiple-choice',
    options: ['Dedicated support', 'Respond when possible', 'Rarely respond', 'No social support'],
    required: true
  },
  {
    id: 33,
    category: 'Social Media',
    question: 'How consistent is your brand voice across platforms?',
    type: 'scale',
    required: true
  },
  {
    id: 34,
    category: 'Social Media',
    question: 'Do you use social media advertising?',
    type: 'multiple-choice',
    options: ['Regular paid campaigns', 'Occasional ads', 'Boosted posts only', 'No paid social'],
    required: true
  },
  {
    id: 35,
    category: 'Social Media',
    question: 'Do you monitor social media mentions of your brand?',
    type: 'multiple-choice',
    options: ['Active monitoring tools', 'Manual monitoring', 'Occasional checks', 'No monitoring'],
    required: true
  },

  // Content Marketing (10 questions)
  {
    id: 36,
    category: 'Content Marketing',
    question: 'Do you have a content marketing strategy?',
    type: 'multiple-choice',
    options: ['Comprehensive strategy', 'Basic content plan', 'Informal approach', 'No strategy'],
    required: true
  },
  {
    id: 37,
    category: 'Content Marketing',
    question: 'How often do you create new content?',
    type: 'multiple-choice',
    options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
    required: true
  },
  {
    id: 38,
    category: 'Content Marketing',
    question: 'What types of content do you create?',
    type: 'text',
    required: true
  },
  {
    id: 39,
    category: 'Content Marketing',
    question: 'How do you measure content performance?',
    type: 'multiple-choice',
    options: ['Comprehensive analytics', 'Basic metrics', 'Views/downloads only', 'No measurement'],
    required: true
  },
  {
    id: 40,
    category: 'Content Marketing',
    question: 'Do you repurpose content across channels?',
    type: 'multiple-choice',
    options: ['Strategic repurposing', 'Some repurposing', 'Minimal repurposing', 'No repurposing'],
    required: true
  },
  {
    id: 41,
    category: 'Content Marketing',
    question: 'How well does your content address customer pain points?',
    type: 'scale',
    required: true
  },
  {
    id: 42,
    category: 'Content Marketing',
    question: 'Do you have a content calendar?',
    type: 'multiple-choice',
    options: ['Detailed calendar', 'Basic planning', 'Informal schedule', 'No calendar'],
    required: true
  },
  {
    id: 43,
    category: 'Content Marketing',
    question: 'How original is your content?',
    type: 'scale',
    required: true
  },
  {
    id: 44,
    category: 'Content Marketing',
    question: 'Do you optimize content for SEO?',
    type: 'multiple-choice',
    options: ['Full SEO optimization', 'Basic optimization', 'Minimal SEO', 'No SEO'],
    required: true
  },
  {
    id: 45,
    category: 'Content Marketing',
    question: 'How do you distribute your content?',
    type: 'multiple-choice',
    options: ['Multi-channel distribution', 'Website and social', 'Website only', 'Limited distribution'],
    required: true
  },

  // Email Marketing (8 questions)
  {
    id: 46,
    category: 'Email Marketing',
    question: 'Do you have an email marketing program?',
    type: 'multiple-choice',
    options: ['Comprehensive program', 'Basic email campaigns', 'Occasional emails', 'No email marketing'],
    required: true
  },
  {
    id: 47,
    category: 'Email Marketing',
    question: 'How do you segment your email list?',
    type: 'multiple-choice',
    options: ['Advanced segmentation', 'Basic segments', 'Minimal segmentation', 'No segmentation'],
    required: true
  },
  {
    id: 48,
    category: 'Email Marketing',
    question: 'What is your average email open rate?',
    type: 'multiple-choice',
    options: ['Above 25%', '20-25%', '15-20%', 'Below 15%'],
    required: true
  },
  {
    id: 49,
    category: 'Email Marketing',
    question: 'Do you personalize your email content?',
    type: 'scale',
    required: true
  },
  {
    id: 50,
    category: 'Email Marketing',
    question: 'How often do you send marketing emails?',
    type: 'multiple-choice',
    options: ['Weekly', 'Bi-weekly', 'Monthly', 'Rarely'],
    required: true
  },
  {
    id: 51,
    category: 'Email Marketing',
    question: 'Do you have automated email sequences?',
    type: 'multiple-choice',
    options: ['Multiple automations', 'Basic automation', 'Welcome series only', 'No automation'],
    required: true
  },
  {
    id: 52,
    category: 'Email Marketing',
    question: 'How mobile-friendly are your emails?',
    type: 'scale',
    required: true
  },
  {
    id: 53,
    category: 'Email Marketing',
    question: 'Do you A/B test your email campaigns?',
    type: 'multiple-choice',
    options: ['Regular testing', 'Occasional testing', 'Rarely test', 'No testing'],
    required: true
  },

  // Analytics & Data (12 questions)
  {
    id: 54,
    category: 'Analytics & Data',
    question: 'How comprehensive is your marketing analytics setup?',
    type: 'scale',
    required: true
  },
  {
    id: 55,
    category: 'Analytics & Data',
    question: 'Do you track customer acquisition costs?',
    type: 'multiple-choice',
    options: ['Detailed CAC tracking', 'Basic cost tracking', 'Rough estimates', 'No tracking'],
    required: true
  },
  {
    id: 56,
    category: 'Analytics & Data',
    question: 'How do you measure ROI on marketing activities?',
    type: 'multiple-choice',
    options: ['Comprehensive ROI analysis', 'Basic ROI tracking', 'Revenue attribution', 'No ROI measurement'],
    required: true
  },
  {
    id: 57,
    category: 'Analytics & Data',
    question: 'Do you have a customer data platform?',
    type: 'multiple-choice',
    options: ['Integrated CDP', 'CRM system', 'Basic database', 'No centralized data'],
    required: true
  },
  {
    id: 58,
    category: 'Analytics & Data',
    question: 'How often do you review marketing metrics?',
    type: 'multiple-choice',
    options: ['Daily', 'Weekly', 'Monthly', 'Quarterly'],
    required: true
  },
  {
    id: 59,
    category: 'Analytics & Data',
    question: 'Do you use predictive analytics?',
    type: 'multiple-choice',
    options: ['Advanced predictive models', 'Basic forecasting', 'Trend analysis', 'No predictive analytics'],
    required: true
  },
  {
    id: 60,
    category: 'Analytics & Data',
    question: 'How well do you understand your customer journey?',
    type: 'scale',
    required: true
  },
  {
    id: 61,
    category: 'Analytics & Data',
    question: 'Do you track lifetime value of customers?',
    type: 'multiple-choice',
    options: ['Detailed LTV analysis', 'Basic LTV tracking', 'Revenue per customer', 'No LTV tracking'],
    required: true
  },
  {
    id: 62,
    category: 'Analytics & Data',
    question: 'How do you attribute conversions across channels?',
    type: 'multiple-choice',
    options: ['Multi-touch attribution', 'Last-click attribution', 'First-click attribution', 'No attribution'],
    required: true
  },
  {
    id: 63,
    category: 'Analytics & Data',
    question: 'Do you have marketing dashboards?',
    type: 'multiple-choice',
    options: ['Real-time dashboards', 'Weekly reports', 'Monthly reports', 'No regular reporting'],
    required: true
  },
  {
    id: 64,
    category: 'Analytics & Data',
    question: 'How data-driven are your marketing decisions?',
    type: 'scale',
    required: true
  },
  {
    id: 65,
    category: 'Analytics & Data',
    question: 'Do you conduct marketing experiments?',
    type: 'multiple-choice',
    options: ['Regular A/B testing', 'Occasional testing', 'Informal experiments', 'No testing'],
    required: true
  },

  // Technology & Tools (8 questions)
  {
    id: 66,
    category: 'Technology & Tools',
    question: 'How integrated are your marketing tools?',
    type: 'scale',
    required: true
  },
  {
    id: 67,
    category: 'Technology & Tools',
    question: 'Do you use marketing automation?',
    type: 'multiple-choice',
    options: ['Advanced automation', 'Basic automation', 'Email automation only', 'No automation'],
    required: true
  },
  {
    id: 68,
    category: 'Technology & Tools',
    question: 'What CRM system do you use?',
    type: 'text',
    required: true
  },
  {
    id: 69,
    category: 'Technology & Tools',
    question: 'How satisfied are you with your current marketing tech stack?',
    type: 'scale',
    required: true
  },
  {
    id: 70,
    category: 'Technology & Tools',
    question: 'Do you use AI tools in your marketing?',
    type: 'multiple-choice',
    options: ['Multiple AI tools', 'Some AI assistance', 'Exploring AI', 'No AI tools'],
    required: true
  },
  {
    id: 71,
    category: 'Technology & Tools',
    question: 'How do you manage your marketing projects?',
    type: 'multiple-choice',
    options: ['Project management software', 'Spreadsheets', 'Email coordination', 'Informal management'],
    required: true
  },
  {
    id: 72,
    category: 'Technology & Tools',
    question: 'Do you have a centralized asset management system?',
    type: 'multiple-choice',
    options: ['Digital asset management', 'Cloud storage', 'Shared folders', 'No centralized system'],
    required: true
  },
  {
    id: 73,
    category: 'Technology & Tools',
    question: 'How do you handle marketing compliance and approvals?',
    type: 'multiple-choice',
    options: ['Automated workflows', 'Manual approval process', 'Informal reviews', 'No formal process'],
    required: true
  },

  // Team & Resources (7 questions)
  {
    id: 74,
    category: 'Team & Resources',
    question: 'How large is your marketing team?',
    type: 'multiple-choice',
    options: ['10+ people', '5-10 people', '2-5 people', '1 person or less'],
    required: true
  },
  {
    id: 75,
    category: 'Team & Resources',
    question: 'Do you work with external marketing agencies?',
    type: 'multiple-choice',
    options: ['Multiple agencies', 'One main agency', 'Freelancers', 'All in-house'],
    required: true
  },
  {
    id: 76,
    category: 'Team & Resources',
    question: 'How skilled is your team in digital marketing?',
    type: 'scale',
    required: true
  },
  {
    id: 77,
    category: 'Team & Resources',
    question: 'Do you have dedicated roles for different marketing functions?',
    type: 'multiple-choice',
    options: ['Specialized roles', 'Some specialization', 'Generalists', 'One person handles all'],
    required: true
  },
  {
    id: 78,
    category: 'Team & Resources',
    question: 'How often does your team receive marketing training?',
    type: 'multiple-choice',
    options: ['Regular training', 'Annual training', 'Occasional training', 'No formal training'],
    required: true
  },
  {
    id: 79,
    category: 'Team & Resources',
    question: 'How well-defined are marketing roles and responsibilities?',
    type: 'scale',
    required: true
  },
  {
    id: 80,
    category: 'Team & Resources',
    question: 'What is your biggest marketing resource constraint?',
    type: 'multiple-choice',
    options: ['Budget', 'Time', 'Skills/expertise', 'Technology'],
    required: true
  }
];