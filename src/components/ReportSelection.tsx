import React, { useState } from 'react';
import { reportTypes, bundlePrice, individualPrice } from '../data/reportTypes';
import { ReportType } from '../types/reports';
import { ShoppingCart, Check, Star, Clock, DollarSign } from 'lucide-react';

interface ReportSelectionProps {
  onSelectReports: (reportIds: string[], isBundle: boolean) => void;
}

export const ReportSelection: React.FC<ReportSelectionProps> = ({ onSelectReports }) => {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isBundle, setIsBundle] = useState(false);

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => {
      if (prev.includes(reportId)) {
        return prev.filter(id => id !== reportId);
      } else {
        return [...prev, reportId];
      }
    });
    setIsBundle(false);
  };

  const handleBundleSelect = () => {
    setSelectedReports(reportTypes.map(rt => rt.id));
    setIsBundle(true);
  };

  const calculateTotal = () => {
    if (isBundle) return bundlePrice;
    return selectedReports.length * individualPrice;
  };

  const savings = selectedReports.length * individualPrice - bundlePrice;

  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Choose Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Business Reports</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get AI-powered insights and actionable recommendations to transform your business performance.
          </p>
        </div>

        {/* Bundle Option */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <div className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                BEST VALUE
              </div>
            </div>
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="mb-6 lg:mb-0">
                <h2 className="text-3xl font-bold mb-4">Complete Business Health Bundle</h2>
                <p className="text-blue-100 mb-4">
                  Get all 5 reports plus a comprehensive business overview report
                </p>
                <div className="flex items-center space-x-4">
                  <span className="text-4xl font-bold">${bundlePrice}</span>
                  <span className="text-blue-200 line-through text-xl">${reportTypes.length * individualPrice}</span>
                  <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                    Save ${savings}
                  </span>
                </div>
              </div>
              <button
                onClick={handleBundleSelect}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Select Bundle
              </button>
            </div>
          </div>
        </div>

        {/* Individual Reports */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Or Choose Individual Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reportTypes.map((report) => (
              <div
                key={report.id}
                className={`bg-white rounded-2xl shadow-xl p-8 border-2 transition-all duration-200 cursor-pointer ${
                  selectedReports.includes(report.id)
                    ? 'border-blue-500 shadow-2xl transform -translate-y-1'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-2xl hover:-translate-y-0.5'
                }`}
                onClick={() => handleReportToggle(report.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl">
                    <Star className="w-8 h-8 text-blue-600" />
                  </div>
                  {selectedReports.includes(report.id) && (
                    <div className="p-2 bg-blue-500 rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {report.name}
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {report.description}
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    {report.estimatedTime}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign className="w-4 h-4 mr-2" />
                    ${report.price}
                  </div>
                </div>
                
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-900">
                    ${report.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Section */}
        {selectedReports.length > 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 sticky bottom-4">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="mb-4 lg:mb-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {isBundle ? 'Complete Bundle' : `${selectedReports.length} Report${selectedReports.length > 1 ? 's' : ''} Selected`}
                </h3>
                <p className="text-gray-600">
                  {isBundle 
                    ? 'All 5 reports + comprehensive overview'
                    : `${selectedReports.map(id => reportTypes.find(rt => rt.id === id)?.name).join(', ')}`
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    ${calculateTotal()}
                  </div>
                  {isBundle && (
                    <div className="text-sm text-green-600 font-medium">
                      You save ${savings}!
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => onSelectReports(selectedReports, isBundle)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};