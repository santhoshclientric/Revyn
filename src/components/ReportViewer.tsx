import React, { useState } from 'react';
import { GeneratedReport } from '../types/reports';
import { Download, MessageCircle, BarChart3, Target, Users, TrendingUp, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReportViewerProps {
  report: GeneratedReport;
  onStartChat: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report, onStartChat }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'actions' | 'opportunities'>('overview');

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Star className="w-6 h-6" />;
    if (score >= 60) return <TrendingUp className="w-6 h-6" />;
    return <BarChart3 className="w-6 h-6" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{report.title}</h1>
            <p className="text-gray-600">Generated on {new Date(report.generatedAt).toLocaleDateString()}</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <div className={`p-4 rounded-2xl ${getScoreColor(report.overallScore)} flex items-center space-x-3`}>
              {getScoreIcon(report.overallScore)}
              <div>
                <div className="text-3xl font-bold">{report.overallScore}%</div>
                <div className="text-sm font-medium">Overall Score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onStartChat}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat About Results
          </button>
          
          <button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center">
            <Download className="w-5 h-5 mr-2" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'sections', label: 'Detailed Analysis', icon: Target },
              { id: 'actions', label: 'Action Plan', icon: TrendingUp },
              { id: 'opportunities', label: 'Opportunities', icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Executive Summary</h2>
                <div className="bg-gray-50 rounded-xl p-6">
                  <p className="text-gray-700 leading-relaxed">
                    Your business shows strong potential with an overall health score of {report.overallScore}%. 
                    Key areas of strength include operational efficiency and team readiness, while opportunities 
                    exist in marketing optimization and financial planning.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Revenue Impact Potential</h3>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-500 rounded-xl">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-800">{report.revenueImpact.potential}</div>
                      <div className="text-green-600 font-medium">{report.revenueImpact.timeline}</div>
                      <div className="text-sm text-green-600 capitalize">
                        {report.revenueImpact.confidence} confidence level
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sections' && (
            <div className="space-y-8">
              {report.sections.map((section, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                    {section.score && (
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(section.score)}`}>
                        {section.score}%
                      </span>
                    )}
                  </div>
                  
                  <div className="prose max-w-none mb-6">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Key Insights</h4>
                      <ul className="space-y-2">
                        {section.insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {section.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-4">3-Month Actions</h3>
                  <ul className="space-y-3">
                    {report.actionPlan.threeMonth.map((action, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-blue-800 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                  <h3 className="text-lg font-bold text-yellow-900 mb-4">6-Month Actions</h3>
                  <ul className="space-y-3">
                    {report.actionPlan.sixMonth.map((action, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-yellow-800 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-bold text-green-900 mb-4">12-Month Actions</h3>
                  <ul className="space-y-3">
                    {report.actionPlan.twelveMonth.map((action, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-green-800 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Role-Based Action Items</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {report.roleBasedActions.map((roleAction, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="font-bold text-gray-900 mb-4">{roleAction.role}</h4>
                      <ul className="space-y-2">
                        {roleAction.actions.map((action, idx) => (
                          <li key={idx} className="flex items-start">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h3 className="text-lg font-bold text-red-900 mb-4">High Impact</h3>
                  <ul className="space-y-3">
                    {report.opportunityMap.highImpact.map((opp, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-red-800 text-sm">{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                  <h3 className="text-lg font-bold text-yellow-900 mb-4">Medium Impact</h3>
                  <ul className="space-y-3">
                    {report.opportunityMap.mediumImpact.map((opp, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-yellow-800 text-sm">{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-bold text-green-900 mb-4">Low Impact</h3>
                  <ul className="space-y-3">
                    {report.opportunityMap.lowImpact.map((opp, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-green-800 text-sm">{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};