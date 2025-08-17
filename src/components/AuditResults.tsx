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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full ${getScoreColor(overallScore)}`}>
            {getScoreIcon(overallScore)}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Marketing AI Audit Results
        </h1>
        <p className="text-gray-600 mb-4">
          {submission.companyName} • Completed on {new Date(submission.completedAt).toLocaleDateString()}
        </p>
        <div className="text-6xl font-bold text-gray-900 mb-2">
          {overallScore}%
        </div>
        <p className="text-lg text-gray-600">Overall Marketing Maturity Score</p>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Category Breakdown</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryScores.map((category, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900">{category.category}</h3>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(category.score)}`}>
                  {category.score}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${category.score}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-600">
                {category.questionsCount} questions assessed
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommendations</h2>
        
        <div className="space-y-4">
          {getRecommendations(overallScore).map((recommendation, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-4 mt-0.5">
                {index + 1}
              </div>
              <p className="text-gray-700">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Next?</h2>
        <p className="text-gray-600 mb-6">
          Ready to improve your marketing performance? Take another audit or contact us for personalized recommendations.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onStartNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Take Another Audit
          </button>
          <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};