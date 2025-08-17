import React, { useState } from 'react';
import { ReportType, ReportAnswer } from '../types/reports';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface ReportFormProps {
  reportType: ReportType;
  onComplete: (answers: ReportAnswer[]) => void;
  onBack: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ reportType, onComplete, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [companyInfo, setCompanyInfo] = useState({ companyName: '', email: '' });
  const [showCompanyForm, setShowCompanyForm] = useState(true);

  const currentQuestion = reportType.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / reportType.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === reportType.questions.length - 1;

  const handleCompanyInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyInfo.companyName && companyInfo.email) {
      setShowCompanyForm(false);
    }
  };

  const handleAnswer = (answer: string | string[]) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < reportType.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const reportAnswers: ReportAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer
    }));

    onComplete(reportAnswers);
  };

  if (showCompanyForm) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{reportType.name}</h2>
          <p className="text-gray-600 text-lg">{reportType.description}</p>
          <div className="mt-4 text-sm text-gray-500">
            Estimated time: {reportType.estimatedTime}
          </div>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start Report
          </button>
          
          <button
            type="button"
            onClick={onBack}
            className="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
          >
            Back to Selection
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-8 py-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Question {currentQuestionIndex + 1} of {reportType.questions.length}
          </span>
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="p-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Options */}
        <div className="space-y-4 mb-10">
          {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
            <div className="space-y-4">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                    answers[currentQuestion.id] === option
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-900 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                      answers[currentQuestion.id] === option
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {answers[currentQuestion.id] === option && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'multi-select' && currentQuestion.options && (
            <div className="space-y-4">
              {currentQuestion.options.map((option, index) => {
                const selectedOptions = (answers[currentQuestion.id] as string[]) || [];
                const isSelected = selectedOptions.includes(option);
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      const currentSelections = (answers[currentQuestion.id] as string[]) || [];
                      if (isSelected) {
                        handleAnswer(currentSelections.filter(s => s !== option));
                      } else {
                        handleAnswer([...currentSelections, option]);
                      }
                    }}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-900 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded border-2 mr-4 flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {(currentQuestion.type === 'text' || currentQuestion.type === 'textarea') && (
            <div>
              {currentQuestion.type === 'text' ? (
                <input
                  type="text"
                  value={answers[currentQuestion.id] as string || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200"
                />
              ) : (
                <textarea
                  value={answers[currentQuestion.id] as string || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Please provide your detailed answer..."
                  className="w-full p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-all duration-200"
                  rows={4}
                />
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-8 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          {!isLastQuestion ? (
            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id] || (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as string[]).length === 0)}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center transition-all duration-200"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!answers[currentQuestion.id] || (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as string[]).length === 0)}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center transition-all duration-200"
            >
              Complete Report
              <CheckCircle className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};