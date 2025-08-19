import React, { useState, useEffect } from 'react';
import { reportTypes, bundlePrice, individualPrice } from '../data/reportTypes';
import { ReportType } from '../types/reports';
import { ShoppingCart, Check, Star, Clock, DollarSign, Lock, Mail, Bell, User, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../config/supabase';

interface ReportSelectionProps {
  onSelectReports: (reportIds: string[], isBundle: boolean) => void;
  user?: any; // You can replace with proper User type from your auth context
}

interface StoredSelection {
  reportIds: string[];
  isBundle: boolean;
  timestamp: number;
}

export const ReportSelection: React.FC<ReportSelectionProps> = ({ onSelectReports, user }) => {
  const availableReports = reportTypes.filter(rt => rt.available);
  const comingSoonReports = reportTypes.filter(rt => !rt.available);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isBundle, setIsBundle] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [purchasedReportIds, setPurchasedReportIds] = useState<string[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);

  // Load user's purchased reports to prevent duplicate purchases
  useEffect(() => {
    const loadUserPurchases = async () => {
      if (!user) {
        setPurchasedReportIds([]);
        return;
      }

      setIsLoadingPurchases(true);
      try {
        const { data: purchases, error } = await supabase
          .from('purchases')
          .select('report_ids')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        if (error) {
          console.error('Error loading user purchases:', error);
          return;
        }

        // Flatten all report IDs from all purchases
        const allPurchasedReportIds = purchases?.reduce((acc: string[], purchase) => {
          return acc.concat(purchase.report_ids || []);
        }, []) || [];

        setPurchasedReportIds(allPurchasedReportIds);
      } catch (error) {
        console.error('Error loading purchases:', error);
      } finally {
        setIsLoadingPurchases(false);
      }
    };

    loadUserPurchases();
  }, [user]);

  // Load any existing selection from localStorage on mount
  useEffect(() => {
    const storedSelection = localStorage.getItem('selectedReports');
    if (storedSelection && !user) {
      try {
        const { reportIds, isBundle: storedIsBundle, timestamp }: StoredSelection = JSON.parse(storedSelection);
        
        // Check if selection is recent (within 1 hour)
        if (Date.now() - timestamp < 3600000) {
          setSelectedReports(reportIds);
          setIsBundle(storedIsBundle);
        } else {
          // Clear expired selection
          localStorage.removeItem('selectedReports');
        }
      } catch (error) {
        console.error('Error parsing stored selection:', error);
        localStorage.removeItem('selectedReports');
      }
    }
  }, [user]);

  const handleReportToggle = (reportId: string) => {
    const report = reportTypes.find(rt => rt.id === reportId);
    if (!report?.available) {
      setShowWaitlistModal(true);
      return;
    }

    // Check if user already purchased this report
    if (purchasedReportIds.includes(reportId)) {
      alert('You have already purchased this report. Check your dashboard to access it.');
      return;
    }
    
    setSelectedReports(prev => {
      const newSelection = prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId];
      
      // If user is not logged in, store the selection
      if (!user && newSelection.length > 0) {
        const selectionData: StoredSelection = {
          reportIds: newSelection,
          isBundle: false,
          timestamp: Date.now()
        };
        localStorage.setItem('selectedReports', JSON.stringify(selectionData));
      } else if (!user && newSelection.length === 0) {
        localStorage.removeItem('selectedReports');
      }
      
      return newSelection;
    });
    setIsBundle(false);
  };

  const handleBundleSelect = () => {
    // Filter out already purchased reports
    const availableForPurchase = availableReports.filter(rt => !purchasedReportIds.includes(rt.id));
    
    if (availableForPurchase.length === 0) {
      alert('You have already purchased all available reports!');
      return;
    }

    const allReportIds = availableForPurchase.map(rt => rt.id);
    setSelectedReports(allReportIds);
    setIsBundle(false); // Disable bundle for v1
    
    // If user is not logged in, store the selection
    if (!user) {
      const selectionData: StoredSelection = {
        reportIds: allReportIds,
        isBundle: false,
        timestamp: Date.now()
      };
      localStorage.setItem('selectedReports', JSON.stringify(selectionData));
    }
  };

  const calculateTotal = () => {
    return selectedReports.length * individualPrice;
  };

  const handleCheckout = () => {
    if (selectedReports.length === 0) return;
    
    // Final check for duplicate purchases before checkout
    if (user) {
      const duplicateReports = selectedReports.filter(id => purchasedReportIds.includes(id));
      if (duplicateReports.length > 0) {
        const duplicateNames = duplicateReports.map(id => 
          reportTypes.find(rt => rt.id === id)?.name
        ).join(', ');
        alert(`You have already purchased: ${duplicateNames}. Please remove them from your selection.`);
        return;
      }
    }
    
    // Always call onSelectReports - it will handle the login flow internally
    if (typeof onSelectReports === 'function') {
      onSelectReports(selectedReports, false);
    } else {
      console.error('onSelectReports is not available');
    }
  };

  const handleLoginPromptConfirm = () => {
    setShowLoginPrompt(false);
    // Just call the regular checkout flow
    handleCheckout();
  };

  const handleLoginPromptCancel = () => {
    setShowLoginPrompt(false);
    // Keep the selection but don't proceed
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
          
          {/* User status indicator */}
          <div className="mt-4 flex justify-center">
            {user ? (
              <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-full">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Logged in as {user.email}</span>
              </div>
            ) : (
              <div className="flex items-center text-orange-600 bg-orange-50 px-4 py-2 rounded-full">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Please log in to complete purchase</span>
              </div>
            )}
          </div>
        </div>

        {/* Available Reports */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Premium Reports Available
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Get started with our comprehensive marketing analysis
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {availableReports.map((report) => {
              const isAlreadyPurchased = purchasedReportIds.includes(report.id);
              const isSelected = selectedReports.includes(report.id);
              
              return (
                <div
                  key={report.id}
                  className={`bg-white rounded-2xl shadow-xl p-8 border-2 transition-all duration-200 relative ${
                    isAlreadyPurchased
                      ? 'border-green-200 bg-green-50 cursor-not-allowed opacity-75'
                      : isSelected
                      ? 'border-blue-500 shadow-2xl transform -translate-y-1 cursor-pointer'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer'
                  }`}
                  onClick={() => !isAlreadyPurchased && handleReportToggle(report.id)}
                >
                  {isAlreadyPurchased && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Purchased
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${
                      isAlreadyPurchased 
                        ? 'bg-green-100' 
                        : 'bg-gradient-to-r from-blue-100 to-purple-100'
                    }`}>
                      {isAlreadyPurchased ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : (
                        <Star className="w-8 h-8 text-blue-600" />
                      )}
                    </div>
                    {isSelected && !isAlreadyPurchased && (
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
                    {isAlreadyPurchased ? (
                      <div className="text-green-600 font-bold">
                        Already Purchased
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">
                        ${report.price}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
                {!user && (
                  <p className="text-orange-600 text-sm mt-2">
                    Your selection will be saved. Please log in to complete purchase.
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    ${calculateTotal()}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    if (!user) {
                      // Store selection in localStorage before showing prompt
                      const selectionData: StoredSelection = {
                        reportIds: selectedReports,
                        isBundle: false,
                        timestamp: Date.now()
                      };
                      localStorage.setItem('selectedReports', JSON.stringify(selectionData));
                      setShowLoginPrompt(true);
                    } else {
                      handleCheckout();
                    }
                  }}
                  className={`${
                    user 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transform hover:-translate-y-0.5' 
                      : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                  } text-white px-8 py-4 rounded-xl font-bold transition-all duration-200 flex items-center`}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {user ? 'Proceed to Checkout' : 'Login to Purchase'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already Purchased Reports Info */}
        {user && purchasedReportIds.length > 0 && !isLoadingPurchases && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">Reports You Own</h3>
                <p className="text-green-700 mb-3">
                  You have already purchased: {purchasedReportIds.map(id => 
                    reportTypes.find(rt => rt.id === id)?.name
                  ).filter(Boolean).join(', ')}
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  View in Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="text-center mb-6">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto w-fit mb-4">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Login Required
                </h3>
                <p className="text-gray-600">
                  Please log in to complete your purchase. Your selection will be saved and you'll be redirected back after login.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">Selected Reports:</p>
                  <p className="text-sm text-blue-600">
                    {selectedReports.map(id => reportTypes.find(rt => rt.id === id)?.name).join(', ')}
                  </p>
                  <p className="text-sm text-blue-800 font-bold mt-2">Total: ${calculateTotal()}</p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleLoginPromptCancel}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLoginPromptConfirm}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Login Now
                  </button>
                </div>
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