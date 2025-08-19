import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuditForm } from './AuditForm';
import { AuditResults } from './AuditResults';
import { AuditSubmission } from '../types/audit';
import { Brain, BarChart3, Users, Zap, ArrowRight, CheckCircle, Star } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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

  const handleGoToReports = () => {
    navigate('/reports');
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
    <div className="py-8">
      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl">
              <Brain className="w-20 h-20 text-white" />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Marketing <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Audit</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Discover your marketing maturity level with our comprehensive 80-question audit. 
            Get <strong>actionable insights</strong> and personalized recommendations to transform your marketing performance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleStartAudit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
            >
              Start Your Marketing Audit
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={handleGoToReports}
              className="border-2 border-blue-600 text-blue-600 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all duration-300"
            >
              View Premium Reports
            </button>
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              15-20 minutes
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Completely free
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Instant results
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 px-4 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600 mb-8">Trusted by over 10,000+ companies worldwide</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="text-2xl font-bold text-gray-400">TechCorp</div>
            <div className="text-2xl font-bold text-gray-400">InnovateCo</div>
            <div className="text-2xl font-bold text-gray-400">GrowthLab</div>
            <div className="text-2xl font-bold text-gray-400">ScaleUp</div>
            <div className="text-2xl font-bold text-gray-400">MarketPro</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            What You'll Discover
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Comprehensive Analysis
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Evaluate 8 key marketing areas including strategy, digital presence, content, analytics, and more.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl">
                  <Zap className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Actionable Insights
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Receive personalized recommendations based on your current marketing maturity level.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Benchmarking
              </h3>
              <p className="text-gray-600 leading-relaxed">
                See how your marketing performance compares to industry standards and best practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Audit Categories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <h3 className="font-bold text-gray-900 mb-3 text-lg">{category}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
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

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "Marketing Director",
                company: "TechCorp",
                content: "The audit revealed gaps we didn't even know existed. Our marketing ROI improved by 40% after implementing the recommendations.",
                rating: 5
              },
              {
                name: "Michael Chen",
                role: "CEO",
                company: "StartupXYZ",
                content: "Incredibly detailed analysis that helped us prioritize our marketing investments. The insights were spot-on and actionable.",
                rating: 5
              },
              {
                name: "Emily Rodriguez",
                role: "Growth Manager",
                company: "ScaleUp Inc",
                content: "Best marketing audit tool I've used. The AI recommendations were surprisingly accurate and helped us optimize our entire funnel.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-xl">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role} at {testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-8">
            Ready to Transform Your Marketing?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join thousands of companies who have improved their marketing performance with Revyn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStartAudit}
              className="bg-white text-blue-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
            >
              Start Your Free Audit Now
            </button>
            <button 
              onClick={handleGoToReports}
              className="border-2 border-white text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              View Premium Reports
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};