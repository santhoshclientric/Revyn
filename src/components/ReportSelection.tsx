import React, { useState } from 'react';
import { reportTypes, bundlePrice, individualPrice } from '../data/reportTypes';
import { ReportType } from '../types/reports';
import { ShoppingCart, Check, Star, Clock, DollarSign, Lock, Mail, Bell } from 'lucide-react';

interface ReportSelectionProps {
  onSelectReports: (reportIds: string[], isBundle: boolean) => void;
}

export const ReportSelection: React.FC<ReportSelectionProps> = ({ onSelectReports }) => {
  const availableReports = reportTypes.filter(rt => rt.available);
  const comingSoonReports = reportTypes.filter(rt => !rt.available);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isBundle, setIsBundle] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');

  const handleReportToggle = (reportId: string) => {
    const report = reportTypes.find(rt => rt.id === reportId);
    if (!report?.available) {
      setShowWaitlistModal(true);
      return;
    }
    
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
    setSelectedReports(availableReports.map(rt => rt.id));
    setIsBundle(false); // Disable bundle for v1
  };

  const calculateTotal = () => {
    return selectedReports.length * individualPrice;
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, save to database
    console.log('Waitlist signup:', waitlistEmail);
    setWaitlistEmail('');
    setShowWaitlistModal(false);
    // Show success message
    alert('Thanks! We\'ll notify you when this report becomes available.');
  };

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

        {/* Available Reports */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Available Now
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Get started with our comprehensive marketing analysis
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {availableReports.map((report) => (
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

        {/* Coming Soon Reports */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Coming Soon
          </h2>
          <p className="text-center text-gray-600 mb-8">
            More comprehensive business reports launching soon
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {comingSoonReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200 relative overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => setShowWaitlistModal(true)}
              >
                {/* Coming Soon Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/90 to-gray-100/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4 mx-auto w-fit">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-2">
                      COMING SOON
                    </div>
                    <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm">
                      Join Waitlist
                    </button>
                  </div>
                </div>
                
                <div className="opacity-60">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl">
                      <Star className="w-8 h-8 text-blue-600" />
                    </div>
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
                  {`${selectedReports.length} Report${selectedReports.length > 1 ? 's' : ''} Selected`}
                </h3>
                <p className="text-gray-600">
                  {selectedReports.map(id => reportTypes.find(rt => rt.id === id)?.name).join(', ')}
                </p>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    ${calculateTotal()}
                  </div>
                </div>
                
                <button
                  onClick={() => onSelectReports(selectedReports, false)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Waitlist Modal */}
        {showWaitlistModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="text-center mb-6">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto w-fit mb-4">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Join the Waitlist
                </h3>
                <p className="text-gray-600">
                  Be the first to know when this report becomes available!
                </p>
              </div>
              
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div>
                  <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="waitlist-email"
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowWaitlistModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Join Waitlist
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};