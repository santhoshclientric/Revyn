import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Loader,
  MessageCircle
} from 'lucide-react';
import { ChatSubscriptionService } from '../services/chatSubscriptionService';

interface SubscriptionManagementProps {
  user: any;
  onSubscriptionChange?: () => void;
}

interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  subscriptionId?: string;
  currentPeriodEnd?: string;
  status?: string;
  nextBillingDate?: string;
  amount?: number;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  user,
  onSubscriptionChange
}) => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    hasActiveSubscription: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');

  const chatService = ChatSubscriptionService.getInstance();

  useEffect(() => {
    loadSubscriptionInfo();
  }, [user]);

  const loadSubscriptionInfo = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const status = await chatService.checkChatSubscriptionStatus(user.id);
      setSubscriptionInfo({
        hasActiveSubscription: status.hasActiveSubscription,
        subscriptionId: status.subscriptionId,
        currentPeriodEnd: status.currentPeriodEnd,
        status: status.status,
        nextBillingDate: status.currentPeriodEnd,
        amount: 10 // $10/month
      });
    } catch (error) {
      console.error('Error loading subscription info:', error);
      setError('Failed to load subscription information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionInfo.subscriptionId) return;

    setIsCancelling(true);
    setError('');

    try {
      await chatService.cancelChatSubscription(subscriptionInfo.subscriptionId);
      
      // Update local state
      setSubscriptionInfo(prev => ({
        ...prev,
        status: 'cancelled'
      }));
      
      setShowCancelConfirm(false);
      
      // Notify parent component
      if (onSubscriptionChange) {
        onSubscriptionChange();
      }
      
    } catch (error) {
      setError('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      case 'past_due':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'cancelled':
        return 'Cancelled';
      case 'past_due':
        return 'Past Due';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Chat Support Subscription</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading subscription status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <MessageCircle className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">Chat Support Subscription</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center mb-4">
          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {subscriptionInfo.hasActiveSubscription ? (
        <div className="space-y-4">
          {/* Active Subscription Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Chat Support Active</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(subscriptionInfo.status)}`}>
                {getStatusText(subscriptionInfo.status)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700 font-medium">Monthly Cost:</span>
                <div className="text-green-900 font-bold">${subscriptionInfo.amount}/month</div>
              </div>
              <div>
                <span className="text-green-700 font-medium">Next Billing:</span>
                <div className="text-green-900 font-bold">
                  {subscriptionInfo.nextBillingDate 
                    ? new Date(subscriptionInfo.nextBillingDate).toLocaleDateString()
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What's Included:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Unlimited AI chat sessions about your reports</li>
              <li>• Personalized action plans and strategy advice</li>
              <li>• Real-time insights and recommendations</li>
              <li>• Priority support for implementation questions</li>
            </ul>
          </div>

          {/* Cancel Option */}
          {subscriptionInfo.status === 'active' && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm font-medium underline"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="p-4 bg-gray-100 rounded-full mx-auto w-fit mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            No Active Chat Subscription
          </h4>
          <p className="text-gray-600 text-sm mb-4">
            Subscribe to get unlimited AI chat support for your reports
          </p>
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <span className="text-blue-900 font-bold">$10/month • Cancel anytime</span>
          </div>
          <p className="text-xs text-gray-500">
            Activate chat support from any of your report pages
          </p>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Cancel Subscription</h3>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your chat support subscription? 
              You'll continue to have access until your next billing date.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Access until:</strong> {subscriptionInfo.nextBillingDate 
                  ? new Date(subscriptionInfo.nextBillingDate).toLocaleDateString()
                  : 'End of current period'
                }
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isCancelling ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};