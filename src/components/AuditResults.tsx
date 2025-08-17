import React from 'react';
import { AuditSubmission } from '../types/audit';
import { auditQuestions } from '../data/auditQuestions';
import { BarChart3, TrendingUp, Award, AlertTriangle } from 'lucide-react';

interface AuditResultsProps {
  submission: AuditSubmission;
  onStartNew: () => void;
}

export const AuditResults: React.FC<AuditResultsProps> = ({ submission, onStartNew }) => {
  const getCategoryScores = () => {
    const categories = [...new Set(auditQuestions.map(q => q.category))];
    
    return categories.map(category => {
      const categoryQuestions = auditQuestions.filter(q => q.category === category);
      const categoryAnswers = submission.answers.filter(a => a.category === category);
      
      let totalScore = 0;
      let maxScore = 0;
      
      categoryAnswers.forEach(answer => {
        const question = categoryQuestions.find(q => q.id === answer.questionId);
        if (!question) return;
        
        maxScore += question.type === 'scale' ? 10 : 4;
        
        if (question.type === 'scale') {
          totalScore += typeof answer.answer === 'number' ? answer.answer : 0;
        } else if (question.type === 'multiple-choice' && question.options) {
          const optionIndex = question.options.indexOf(answer.answer as string);
          totalScore += optionIndex >= 0 ? (question.options.length - optionIndex) : 0;
        }
      });
      
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      
      return {
        category,
        score: percentage,
        questionsCount: categoryQuestions.length
      };
    });
  };

  const categoryScores = getCategoryScores();
  const overallScore = submission.score || 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Award className="w-5 h-5" />;
    if (score >= 60) return <TrendingUp className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getRecommendations = (score: number) => {
    if (score >= 80) {
      return [
        "Excellent marketing maturity! Focus on optimization and innovation.",
        "Consider advanced AI and automation tools to scale further.",
        "Share best practices with industry peers and thought leadership."
      ];
    } else if (score >= 60) {
      return [
        "Good foundation with room for improvement in key areas.",
        "Prioritize data analytics and measurement capabilities.",
        "Invest in marketing automation and personalization."
      ];
    } else {
      return [
        "Significant opportunities for marketing transformation.",
        "Start with foundational elements: strategy, analytics, and processes.",
        "Consider partnering with marketing experts or agencies."
      ];
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-6 rounded-3xl ${getScoreColor(overallScore)}`}>
            {getScoreIcon(overallScore)}
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Marketing AI Audit Results
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          {submission.companyName} • Completed on {new Date(submission.completedAt).toLocaleDateString()}
        </p>
        <div className="text-8xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          {overallScore}%
        </div>
        <p className="text-xl text-gray-600 font-medium">Overall Marketing Maturity Score</p>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl shadow-2xl p-10">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl mr-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Category Breakdown</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categoryScores.map((category, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-900 text-lg">{category.category}</h3>
                <span className={`px-3 py-2 rounded-full text-sm font-bold ${getScoreColor(category.score)}`}>
                  {category.score}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${category.score}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-600 font-medium">
                {category.questionsCount} questions assessed
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-2xl shadow-2xl p-10">
        <div className="flex items-center mb-8">
          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl mr-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Recommendations</h2>
        </div>
        
        <div className="space-y-6">
          {getRecommendations(overallScore).map((recommendation, index) => (
            <div key={index} className="flex items-start p-6 bg-gray-50 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-0.5">
                {index + 1}
              </div>
              <p className="text-gray-700 text-lg leading-relaxed">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-6">What's Next?</h2>
        <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
          Ready to improve your marketing performance? Take another audit or contact us for personalized recommendations.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={onStartNew}
            className="px-10 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Take Another Audit
          </button>
          <button className="px-10 py-4 border-2 border-white text-white rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-200">
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};