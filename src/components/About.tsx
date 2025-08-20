import React from 'react';
import { Brain, Target, Users, Zap, Award, TrendingUp } from 'lucide-react';

export const About: React.FC = () => {
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Insights",
      description: "Advanced algorithms analyze your marketing data to provide actionable recommendations."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Comprehensive Audits",
      description: "80+ questions covering all aspects of modern marketing from strategy to execution."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Performance Tracking",
      description: "Monitor your marketing maturity progress over time with detailed analytics."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Expert Guidance",
      description: "Get recommendations from marketing experts and industry best practices."
    }
  ];

  const stats = [
    { number: "∞", label: "Growth Potential" },
    { number: "AI-First", label: "Technology Stack" },
    { number: "360°", label: "Marketing Coverage" },
    { number: "Real-Time", label: "Insights Delivery" }
  ];

  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Brain className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Revyn</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to revolutionize marketing performance through AI-powered insights and comprehensive audits. 
            Our platform helps businesses of all sizes optimize their marketing strategies and drive measurable growth.
          </p>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Revyn?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg text-blue-600 mr-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl leading-relaxed mb-8">
              To democratize access to world-class marketing insights and empower every business 
              to achieve their full marketing potential through data-driven strategies and AI-powered recommendations.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center">
                <Award className="w-6 h-6 mr-2" />
                <span className="font-medium">Excellence</span>
              </div>
              <div className="flex items-center">
                <Zap className="w-6 h-6 mr-2" />
                <span className="font-medium">Innovation</span>
              </div>
              <div className="flex items-center">
                <Users className="w-6 h-6 mr-2" />
                <span className="font-medium">Customer Success</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Meet Our Team
          </h2>
          <div className="flex justify-center">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow max-w-sm">
              <img
                src="https://revyn-images-development.zohostratus.com/1651263907494.jpeg"
                alt="CEO & Founder"
                className="w-full h-80 object-cover object-top"
              />
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  CEO & Founder
                </h3>
                <p className="text-blue-600 font-medium mb-3">
                  Leadership
                </p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Visionary leader driving innovation in marketing technology and AI-powered business solutions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Marketing?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of companies who have improved their marketing performance with Revyn's AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-center no-underline">
              Start Audit
            </a>
            <a href="/contact" className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors text-center no-underline">
              Schedule Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};