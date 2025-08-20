import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Download, 
  MessageCircle, 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  AlertTriangle,
  CheckCircle,
  Star,
  Lightbulb,
  Calendar,
  Zap,
  Flag,
  Settings,
  Eye
} from 'lucide-react';

interface AIReportViewerProps {
  reportData?: any;
  companyName?: string;
  onBack?: () => void;
  onDownload?: () => void;
  onStartChat?: () => void;
}

export const AIReportViewer: React.FC<AIReportViewerProps> = ({ 
  reportData,
  companyName = "Demo Company",
  onBack,
  onDownload,
  onStartChat 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'opportunities' | 'actions' | 'tools'>('overview');

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'green':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'yellow':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'red':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Don't render if no report data
  if (!reportData) {
    return (
      <div className="py-8 px-4 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Report Data Available</h2>
            <p className="text-gray-600">Please provide report data to display the analysis.</p>
          </div>
        </div>
      </div>
    );
  }

  // Extract data from the report structure
  const executiveSummary = reportData['1. 🚀 Executive Summary'] || {};
  const healthScore = reportData['2. 📊 Marketing Health Score + Section Breakdown'] || {};
  const detailedAnalysis = reportData['3. 📂 Detailed Section Analysis (7 Core Categories)'] || {};
  const redFlags = reportData['4. 🚨 Red Flags (Risk Areas)'] || [];
  const opportunities = reportData['5. 💡 Top 5 Opportunity Areas'] || [];
  const actionPlan = reportData['6. 🧭 Action Plan: 30/90/365 Days'] || {};
  const socialOverview = reportData['7. 📲 Social Channel Performance Overview'] || {};
  const toolRecommendations = reportData['8. 🛠 Tool & Tactic Recommendations'] || [];
  const benchmarks = reportData['9. 🧩 Benchmark Comparison (Optional)'] || {};
  const nextSteps = reportData['10. 📣 Call to Action / Next Steps'] || '';

  const overallScore = healthScore['Total Score'] || 0;
  const categories = healthScore['Category Breakdown'] || [];

  return (
    <div className="py-8 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Marketing AI Audit Report
                </h1>
                <p className="text-gray-600">
                  {companyName} • Generated {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {overallScore}
              </div>
              <div className="text-sm text-gray-600 font-medium">Overall Score</div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 border ${
                healthScore.Interpretation?.includes('Yellow') ? getStatusColor('yellow') :
                healthScore.Interpretation?.includes('Red') ? getStatusColor('red') :
                getStatusColor('green')
              }`}>
                {healthScore.Interpretation || 'Assessment Complete'}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {onStartChat && (
              <button
                onClick={onStartChat}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat About Results
              </button>
            )}
            
            {onDownload && (
              <button
                onClick={onDownload}
                className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap px-4 sm:px-8">
              {[
                { id: 'overview', label: 'Executive Summary', icon: Brain },
                { id: 'categories', label: 'Score Breakdown', icon: BarChart3 },
                { id: 'opportunities', label: 'Opportunities', icon: Lightbulb },
                { id: 'actions', label: 'Action Plan', icon: Calendar },
                { id: 'tools', label: 'Tools & Benchmarks', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-8">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Business Overview */}
                {executiveSummary['Business Overview'] && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      Business Overview
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {executiveSummary['Business Overview']}
                    </p>
                  </div>
                )}

                {/* Why This Matters */}
                {executiveSummary['Why This Matters'] && (
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">
                      Why This Matters
                    </h3>
                    <p className="text-blue-800 leading-relaxed">
                      {executiveSummary['Why This Matters']}
                    </p>
                  </div>
                )}

                {/* Strengths and Concerns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {executiveSummary['Top 3 Key Strengths'] && (
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Top 3 Key Strengths
                      </h3>
                      <ul className="space-y-3">
                        {executiveSummary['Top 3 Key Strengths'].map((strength: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                            <span className="text-green-800">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {executiveSummary['Top 3 Key Concerns / Gaps'] && (
                    <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                      <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Top 3 Key Concerns
                      </h3>
                      <ul className="space-y-3">
                        {executiveSummary['Top 3 Key Concerns / Gaps'].map((concern: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                            <span className="text-red-800">{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Red Flags */}
                {Array.isArray(redFlags) && redFlags.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <Flag className="w-6 h-6 mr-2 text-red-500" />
                      Risk Areas That Need Immediate Attention
                    </h3>
                    <div className="space-y-4">
                      {redFlags.map((flag: any, idx: number) => (
                        <div key={idx} className="bg-white border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-bold text-gray-900">{flag.Title}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(flag.Severity)}`}>
                              {flag.Severity} Risk
                            </span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{flag.Description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Marketing Health Score Breakdown
                  </h2>
                  <p className="text-gray-600">
                    Detailed analysis of your performance across key marketing categories
                  </p>
                </div>

                <div className="space-y-6">
                  {Array.isArray(categories) && categories.map((category: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">{category.Category}</h3>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(category.Status)}`}>
                            {category.Status}
                          </span>
                          <div className="text-2xl font-bold text-gray-900">{category.Score}%</div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            category.Status?.toLowerCase() === 'green' ? 'bg-green-500' :
                            category.Status?.toLowerCase() === 'yellow' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${category.Score}%` }}
                        />
                      </div>
                      
                      <p className="text-gray-700">{category.Label}</p>

                      {/* Detailed analysis if available */}
                      {detailedAnalysis[category.Category] && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-3">
                            {detailedAnalysis[category.Category].Commentary}
                          </p>
                          {detailedAnalysis[category.Category]['Key Observations'] && (
                            <div>
                              <h5 className="font-semibold text-gray-900 mb-2">Key Observations:</h5>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {detailedAnalysis[category.Category]['Key Observations'].map((obs: string, obsIdx: number) => (
                                  <li key={obsIdx} className="flex items-start">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                                    {obs}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                    <Lightbulb className="w-8 h-8 mr-3 text-yellow-500" />
                    Top Opportunity Areas
                  </h2>
                  <p className="text-gray-600">
                    Prioritized recommendations to maximize your marketing impact
                  </p>
                </div>

                <div className="space-y-6">
                  {Array.isArray(opportunities) && opportunities.map((opp: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">{opp.Title}</h3>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getImpactColor(opp['Impact Potential'])}`}>
                            {opp['Impact Potential']} Impact
                          </span>
                          <span className="text-xs text-gray-500">{opp['Effort Level']}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {opp['Opportunity Description']}
                      </p>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm font-semibold text-green-800 mb-1">Estimated Impact:</div>
                        <div className="text-sm text-green-700">{opp['Estimated Lift']}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                    <Calendar className="w-8 h-8 mr-3 text-blue-500" />
                    Your Action Plan
                  </h2>
                  <p className="text-gray-600">
                    Structured roadmap to transform your marketing performance
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 30 Days */}
                  {actionPlan['Next 30 Days (Quick Wins)'] && (
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2" />
                        Next 30 Days (Quick Wins)
                      </h3>
                      <ul className="space-y-3">
                        {actionPlan['Next 30 Days (Quick Wins)'].map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                            <span className="text-green-800 text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 90 Days */}
                  {actionPlan['Next 90 Days (Build Systems)'] && (
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Next 90 Days (Build Systems)
                      </h3>
                      <ul className="space-y-3">
                        {actionPlan['Next 90 Days (Build Systems)'].map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <Target className="w-4 h-4 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                            <span className="text-blue-800 text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 12 Months */}
                  {actionPlan['Next 12 Months (Big Moves)'] && (
                    <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                      <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Next 12 Months (Big Moves)
                      </h3>
                      <ul className="space-y-3">
                        {actionPlan['Next 12 Months (Big Moves)'].map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <Star className="w-4 h-4 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                            <span className="text-purple-800 text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Call to Action */}
                {nextSteps && (
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                    <h3 className="text-2xl font-bold mb-4">What's Next?</h3>
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-line text-blue-100 leading-relaxed">
                        {nextSteps}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="space-y-8">
                {/* Tool Recommendations */}
                {Array.isArray(toolRecommendations) && toolRecommendations.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Settings className="w-8 h-8 mr-3 text-blue-500" />
                      Recommended Tools & Tactics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {toolRecommendations.map((tool: any, idx: number) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-900">{tool['Tool Name']}</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              {tool.Category}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">{tool['Why It Fits']}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benchmarks */}
                {Object.keys(benchmarks).length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <BarChart3 className="w-8 h-8 mr-3 text-green-500" />
                      Industry Benchmarks
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      {Object.entries(benchmarks).map(([key, value], idx) => (
                        <div key={idx} className="mb-4 last:mb-0">
                          <h4 className="font-semibold text-gray-900 mb-2">{key}</h4>
                          <p className="text-gray-700 text-sm leading-relaxed">{value as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Performance */}
                {socialOverview.Note && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Users className="w-8 h-8 mr-3 text-purple-500" />
                      Social Media Performance
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      {socialOverview.Note && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Note</h4>
                          <p className="text-gray-700 text-sm">{socialOverview.Note}</p>
                        </div>
                      )}
                      {socialOverview['General Analysis'] && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">General Analysis</h4>
                          <p className="text-gray-700 text-sm leading-relaxed">{socialOverview['General Analysis']}</p>
                        </div>
                      )}
                      {socialOverview['2 Quick Recommendations'] && Array.isArray(socialOverview['2 Quick Recommendations']) && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Quick Recommendations</h4>
                          <ul className="space-y-2">
                            {socialOverview['2 Quick Recommendations'].map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start">
                                <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                                <span className="text-gray-700 text-sm">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};