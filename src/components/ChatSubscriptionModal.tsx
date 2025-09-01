import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { 
  MessageCircle, 
  X, 
  Lock, 
  CheckCircle, 
  Loader, 
  AlertTriangle,
  Star,
  Clock,
  CreditCard
} from 'lucide-react';
import { ChatSubscriptionService } from '../services/chatSubscriptionService';

interface ChatSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionComplete: () => void;
  user: any;
  purchaseId: string;
  companyName?: string;
}

// Payment form component that handles both setup intents and payment intents
const ChatSubscriptionPaymentForm: React.FC<{
  onSuccess: () => void;
  onError: (error: string) => void;
  user: any;
  purchaseId: string;
  clientSecret: string;
}> = ({ onSuccess, onError, user, purchaseId, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      onError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // Determine if this is a setup intent or payment intent based on client secret prefix
      const isSetupIntent = clientSecret.startsWith('seti_');
      
      console.log('Processing payment, isSetupIntent:', isSetupIntent);
      
      if (isSetupIntent) {
        console.log('Confirming setup intent for subscription...');
        
        // Use confirmSetup for setup intents
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard`,
            payment_method_data: {
              billing_details: {
                name: user?.user_metadata?.name || user?.user_metadata?.full_name || '',
                email: user?.email || '',
              }
            }
          },
          redirect: 'if_required'
        });

        if (error) {
          onError(error.message || 'Setup failed. Please try again.');
        } else if (setupIntent && setupIntent.status === 'succeeded') {
          console.log('Setup completed successfully:', setupIntent.id);
          
          // For setup intents, we need to trigger the first payment manually
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/complete-subscription-setup`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                setup_intent_id: setupIntent.id,
                purchase_id: purchaseId,
                user_id: user.id
              })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('Subscription setup completed:', result);
              onSuccess();
            } else {
              const errorData = await response.json();
              onError(errorData.error || 'Failed to complete subscription setup');
            }
          } catch (apiError) {
            console.error('Error completing subscription setup:', apiError);
            onError('Failed to complete subscription. Please contact support.');
          }
        } else {
          onError('Setup was not completed. Please try again.');
        }
      } else {
        console.log('Confirming payment intent for subscription...');
        
        // Use confirmPayment for payment intents
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard`,
            payment_method_data: {
              billing_details: {
                name: user?.user_metadata?.name || user?.user_metadata?.full_name || '',
                email: user?.email || '',
              }
            }
          },
          redirect: 'if_required'
        });

        if (error) {
          onError(error.message || 'Payment failed. Please try again.');
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          console.log('Payment completed successfully:', paymentIntent.id);
          onSuccess();
        } else {
          onError('Payment was not completed. Please try again.');
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Information *
        </label>
        <div className="p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <PaymentElement />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your subscription will automatically renew monthly at $10/month
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isProcessing || !stripe}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 flex items-center justify-center"
      >
        {isProcessing ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Processing Subscription...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Subscribe for $10/month
          </>
        )}
      </button>
    </div>
  );
};

export const ChatSubscriptionModal: React.FC<ChatSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionComplete,
  user,
  purchaseId,
  companyName = 'Your Company'
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'processing' | 'success'>('info');
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  const chatService = ChatSubscriptionService.getInstance();

  // Load Stripe when modal opens
  useEffect(() => {
    if (isOpen && !stripePromise) {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (publishableKey) {
        setStripePromise(loadStripe(publishableKey));
      }
    }
  }, [isOpen]);

  // Create subscription setup intent when moving to payment step
  useEffect(() => {
    if (step === 'payment' && !clientSecret) {
      createSubscriptionSetup();
    }
  }, [step]);

  const createSubscriptionSetup = async () => {
    try {
      const result = await chatService.createChatSubscription({
        userId: user.id,
        purchaseId,
        customerEmail: user.email,
        customerName: user.user_metadata?.name || user.user_metadata?.full_name || ''
      });

      setClientSecret(result.clientSecret);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to setup subscription');
      setStep('info');
    }
  };

  const handleStartSubscription = () => {
    setError('');
    setStep('payment');
  };

  const handlePaymentSuccess = () => {
    setStep('success');
    setTimeout(() => {
      onSubscriptionComplete();
      onClose();
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const stripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#374151',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Unlock Chat Support
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'info' && (
            <div className="space-y-6">
              {/* Benefits */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Get Unlimited AI Chat Support
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Ask unlimited questions about your {companyName} report</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Get personalized action plans and strategy advice</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Real-time insights and recommendations</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Cancel anytime, no long-term commitment</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-900 mb-2">$10</div>
                  <div className="text-blue-700 font-medium">per month</div>
                  <div className="text-sm text-blue-600 mt-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Starts immediately • Cancel anytime
                  </div>
                </div>
              </div>

              {/* Security notice */}
              <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <Lock className="w-4 h-4 mr-2 text-gray-500" />
                Secure recurring payment powered by Stripe
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleStartSubscription}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Subscribe Now
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Complete Your Subscription
                </h4>
                <p className="text-gray-600 text-sm">
                  You'll be charged $10 today and then $10 every month until you cancel
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={stripeElementsOptions}>
                  <ChatSubscriptionPaymentForm
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    user={user}
                    purchaseId={purchaseId}
                    clientSecret={clientSecret}
                  />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Setting up payment...</p>
                </div>
              )}

              <button
                onClick={() => setStep('info')}
                className="w-full border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  Chat Support Activated!
                </h4>
                <p className="text-gray-600">
                  You now have unlimited access to AI chat support for your reports.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  <strong>Next billing:</strong> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br/>
                  <strong>Amount:</strong> $10.00<br/>
                  <strong>Status:</strong> Active
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Redirecting to chat interface...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};