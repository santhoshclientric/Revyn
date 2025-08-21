import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';
// Remove the direct import of stripePromise
// import { stripePromise } from '../config/stripe';
import { reportTypes, bundlePrice, individualPrice } from '../data/reportTypes';
import { StripeService, PaymentIntentData } from '../services/stripeService';
import { Lock, ArrowLeft, CheckCircle, Loader, AlertCircle } from 'lucide-react';

const PaymentForm: React.FC<{
  reportIds: string[];
  isBundle: boolean;
  total: number;
  onPaymentComplete: (paymentIntentId: string) => void;
  onBack: () => void;
  user: any; // Add user prop
}> = ({ reportIds, isBundle, total, onPaymentComplete, onBack, user }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentData, setPaymentData] = useState({
    email: user?.email || '',
    name: user?.user_metadata?.name || user?.user_metadata?.full_name || '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const stripeService = StripeService.getInstance();

  useEffect(() => {
    // Create payment intent when we have customer data
    const createPaymentIntent = async () => {
      if (!paymentData.email || !paymentData.name) {
        return; // Wait for customer data
      }

      try {
        const paymentIntentData: PaymentIntentData = {
          amount: total, // This will be converted to cents in the service
          currency: 'usd',
          reportIds,
          customerEmail: paymentData.email,
          customerName: paymentData.name
        };

        const { clientSecret } = await stripeService.createPaymentIntent(paymentIntentData);
        setClientSecret(clientSecret);
        setError(''); // Clear any previous errors
      } catch (error) {
        console.error('Payment intent creation error:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.');
      }
    };

    createPaymentIntent();
  }, [reportIds, total, paymentData.email, paymentData.name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!paymentData.email || !paymentData.name) {
      return 'Please fill in all required fields';
    }
    
    if (!stripe || !elements) {
      return 'Payment system not ready. Please wait a moment and try again.';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Use the new confirmPayment method with Payment Element
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          payment_method_data: {
            billing_details: {
              name: paymentData.name,
              email: paymentData.email,
            }
          }
        },
        redirect: 'if_required'
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        setError(error.message || 'Payment failed. Please try again.');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment completed successfully:', paymentIntent.id);
        onPaymentComplete(paymentIntent.id);
      } else {
        setError('Payment was not completed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={paymentData.email}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={paymentData.name}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="John Doe"
        />
      </div>

      {/* Payment Element - only show when we have clientSecret */}
      {clientSecret && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Information *
          </label>
          <div className="p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-colors">
            <PaymentElement />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            For testing: Use card number 4242 4242 4242 4242 with any future date and CVC
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        
        <button
          type="submit"
          disabled={isProcessing || !stripe || !clientSecret}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Purchase ${total}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const PaymentFlow: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reportIds, isBundle } = location.state || { reportIds: [], isBundle: false };
  const selectedReports = reportTypes.filter(rt => reportIds.includes(rt.id));
  const total = reportIds.length * individualPrice;
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Handler functions for the PaymentForm component
  const handlePaymentSuccess = (paymentIntentId: string) => {
    navigate('/payment-success', {
      state: {
        paymentIntentId,
        reportIds,
        isBundle
      }
    });
  };

  const handleGoBack = () => {
    navigate('/reports');
  };

  // Only load Stripe when PaymentFlow component mounts (user is actually going to pay)
  useEffect(() => {
    const loadStripeForPayment = async () => {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        console.error('Stripe publishable key not found');
        return;
      }
      
      console.log('Loading Stripe for payment flow...');
      const { loadStripe } = await import('@stripe/stripe-js');
      setStripePromise(loadStripe(publishableKey));
    };

    loadStripeForPayment();
  }, []);

  // Create payment intent early to get clientSecret for Elements
  useEffect(() => {
    const createInitialPaymentIntent = async () => {
      try {
        const stripeService = StripeService.getInstance();
        const paymentIntentData: PaymentIntentData = {
          amount: total,
          currency: 'usd',
          reportIds,
          customerEmail: user?.email || 'temp@example.com', // Use user email if available
          customerName: user?.user_metadata?.name || user?.user_metadata?.full_name || 'Temporary Customer'
        };

        const { clientSecret } = await stripeService.createPaymentIntent(paymentIntentData);
        setClientSecret(clientSecret);
      } catch (error) {
        console.error('Error creating initial payment intent:', error);
      }
    };

    createInitialPaymentIntent();
  }, [reportIds, total, user]);

  const stripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#374151',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      }
    },
    // Prefill customer information
    defaultValues: {
      billingDetails: {
        name: user?.user_metadata?.name || user?.user_metadata?.full_name || '',
        email: user?.email || '',
      }
    }
  };

  // Don't render Elements until Stripe is loaded
  if (!stripePromise) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            {selectedReports.map((report) => (
              <div key={report.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                <div>
                  <h3 className="font-semibold text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600">{report.estimatedTime}</p>
                </div>
                <div className="text-lg font-bold text-gray-900">${report.price}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">${reportIds.length * individualPrice}</span>
            </div>
            <div className="flex justify-between items-center text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${total}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center text-sm text-gray-600">
              <Lock className="w-4 h-4 mr-2" />
              <span>Secure payment powered by Stripe</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>
          
          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={stripeElementsOptions}>
              <PaymentForm
                reportIds={reportIds}
                isBundle={isBundle}
                total={total}
                onPaymentComplete={handlePaymentSuccess}
                onBack={handleGoBack}
                user={user}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Initializing payment...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};