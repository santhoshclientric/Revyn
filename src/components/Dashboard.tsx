import React, { useState } from 'react';
import { AuditForm } from './AuditForm';
import { AuditResults } from './AuditResults';
import { AuditSubmission } from '../types/audit';
import { Brain, BarChart3, Users, Zap } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<'welcome' | 'audit' | 'results'>('welcome');
  const [auditSubmission, setAuditSubmission] = useState<AuditSubmission | null>(null);

  const handleStartAudit = () => {
    setCurrentView('audit');
  };

  const handleAuditComplete = (submission: AuditSubmission) => {
    setAuditSubmission(submission);
    setCurrentView('results');
  };

  const handleStartNew = () => {
    setAuditSubmission(null);
    setCurrentView('welcome');
  };

  if (currentView === 'audit') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <AuditForm onComplete={handleAuditComplete} />
      </div>
    );
  }

  if (currentView === 'results' && auditSubmission) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <AuditResults submission={auditSubmission} onStartNew={handleStartNew} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Revyn</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Reports</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Settings</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-blue-100 rounded-full">
              <Brain className="w-16 h-16 text-blue-600" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Marketing AI Audit
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover your marketing maturity level with our comprehensive 80-question audit. 
            Get actionable insights and personalized recommendations to transform your marketing performance.
          </p>
          
          <button
            onClick={handleStartAudit}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Start Your Marketing Audit
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            ⏱️ Takes approximately 15-20 minutes to complete
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            What You'll Discover
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Comprehensive Analysis
              </h3>
              <p className="text-gray-600">
                Evaluate 8 key marketing areas including strategy, digital presence, content, analytics, and more.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Actionable Insights
              </h3>
              <p className="text-gray-600">
                Receive personalized recommendations based on your current marketing maturity level.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Benchmarking
              </h3>
              <p className="text-gray-600">
                See how your marketing performance compares to industry standards and best practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Audit Categories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              'Strategy & Planning',
              'Digital Presence',
              'Social Media',
              'Content Marketing',
              'Email Marketing',
              'Analytics & Data',
              'Technology & Tools',
              'Team & Resources'
            ].map((category, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">{category}</h3>
                <p className="text-sm text-gray-600">
                  {category === 'Strategy & Planning' && '10 questions covering marketing strategy, goals, and planning processes.'}
                  {category === 'Digital Presence' && '15 questions about website, SEO, and online presence optimization.'}
                  {category === 'Social Media' && '10 questions evaluating social media strategy and engagement.'}
                  {category === 'Content Marketing' && '10 questions on content strategy, creation, and distribution.'}
                  {category === 'Email Marketing' && '8 questions about email campaigns and automation.'}
                  {category === 'Analytics & Data' && '12 questions on measurement, tracking, and data utilization.'}
                  {category === 'Technology & Tools' && '8 questions about marketing technology stack and integration.'}
                  {category === 'Team & Resources' && '7 questions on team structure, skills, and resources.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Marketing?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of companies who have improved their marketing performance with Revyn.
          </p>
          <button
            onClick={handleStartAudit}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Start Your Free Audit Now
          </button>
        </div>
      </section>
    </div>
  );
};