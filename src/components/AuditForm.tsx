import React, { useState } from 'react';
import { auditQuestions } from '../data/auditQuestions';
import { AuditAnswer, AuditSubmission } from '../types/audit';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';

interface AuditFormProps {
  onComplete: (submission: AuditSubmission) => void;
}

export const AuditForm: React.FC<AuditFormProps> = ({ onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [companyInfo, setCompanyInfo] = useState({ companyName: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(true);

  const currentQuestion = auditQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / auditQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === auditQuestions.length - 1;

  const handleCompanyInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyInfo.companyName && companyInfo.email) {
      setShowCompanyForm(false);
    }
  };

  const handleAnswer = (answer: string | number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < auditQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const auditAnswers: AuditAnswer[] = Object.entries(answers).map(([questionId, answer]) => {
        const question = auditQuestions.find(q => q.id === parseInt(questionId));
        return {
          questionId: parseInt(questionId),
          answer,
          category: question?.category || ''
        };
      });

      const submission: AuditSubmission = {
        id: Date.now().toString(),
        companyName: companyInfo.companyName,
        email: companyInfo.email,
        answers: auditAnswers,
        completedAt: new Date().toISOString(),
        score: calculateScore(auditAnswers)
      };

      // For now, we'll just simulate saving to localStorage
      // In production, this would save to your database
      const savedSubmissions = JSON.parse(localStorage.getItem('auditSubmissions') || '[]');
      savedSubmissions.push(submission);
      localStorage.setItem('auditSubmissions', JSON.stringify(savedSubmissions));

      onComplete(submission);
    } catch (error) {
      console.error('Error submitting audit:', error);
      alert('There was an error submitting your audit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = (auditAnswers: AuditAnswer[]): number => {
    let totalScore = 0;
    let maxScore = 0;

    auditAnswers.forEach(answer => {
      const question = auditQuestions.find(q => q.id === answer.questionId);
      if (!question) return;

      maxScore += question.type === 'scale' ? 10 : 4;

      if (question.type === 'scale') {
        totalScore += typeof answer.answer === 'number' ? answer.answer : 0;
      } else if (question.type === 'multiple-choice' && question.options) {
        const optionIndex = question.options.indexOf(answer.answer as string);
        totalScore += optionIndex >= 0 ? (question.options.length - optionIndex) : 0;
      }
    });

    return Math.round((totalScore / maxScore) * 100);
  };

  if (showCompanyForm) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Revyn</h2>
          <p className="text-gray-600">Marketing AI Audit - 80 Questions</p>
        </div>
        
        <form onSubmit={handleCompanyInfoSubmit} className="space-y-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              id="companyName"
              value={companyInfo.companyName}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, companyName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={companyInfo.email}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Audit
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gray-50 px-8 py-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentQuestionIndex + 1} of {auditQuestions.length}
          </span>
          <span className="text-sm font-medium text-gray-600">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="p-8">
        <div className="mb-6">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mb-4">
            {currentQuestion.category}
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Options */}
        <div className="space-y-4 mb-8">
          {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestion.id] === option
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      answers[currentQuestion.id] === option
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {answers[currentQuestion.id] === option && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    {option}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'scale' && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Poor (1)</span>
                <span>Excellent (10)</span>
              </div>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleAnswer(value)}
                    className={`flex-1 py-3 px-2 rounded-lg border-2 font-medium transition-all ${
                      answers[currentQuestion.id] === value
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentQuestion.type === 'text' && (
            <textarea
              value={answers[currentQuestion.id] as string || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Please provide your answer..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={4}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {!isLastQuestion ? (
            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id]}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              {answers[currentQuestion.id] && <CheckCircle className="w-4 h-4 ml-2" />}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!answers[currentQuestion.id] || isSubmitting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Audit
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};