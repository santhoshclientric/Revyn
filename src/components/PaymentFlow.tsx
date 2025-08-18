import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../config/stripe';
import { reportTypes, bundlePrice, individualPrice } from '../data/reportTypes';
import { StripeService, PaymentIntentData } from '../services/stripeService';
import { CreditCard, Lock, ArrowLeft, CheckCircle, Loader, AlertCircle } from 'lucide-react';

interface PaymentFlowProps {
  reportIds: string[];
  isBundle: boolean;
  onPaymentComplete: (paymentIntentId: string) => void;
  onBack: () => void;
}

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      padding: '12px',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: false,
};

const PaymentForm: React.FC<{
  reportIds: string[];
  isBundle: boolean;
  total: number;
  onPaymentComplete: (paymentIntentId: string) => void;
  onBack: () => void;
}> = ({ reportIds, isBundle, total, onPaymentComplete, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentData, setPaymentData] = useState({
    email: '',
    name: '',
    billingAddress: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const stripeService = StripeService.getInstance();

  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        const paymentIntentData: PaymentIntentData = {
          amount: total,
          currency: 'usd',
          reportIds,
          customerEmail: paymentData.email || 'customer@example.com',
          customerName: paymentData.name || 'Customer'
        };

        const { clientSecret } = await stripeService.createPaymentIntent(paymentIntentData);
        setClientSecret(clientSecret);
      } catch (error) {
        setError('Failed to initialize payment. Please try again.');
      }
    };

    createPaymentIntent();
  }, [reportIds, total]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('billing.')) {
      const field = name.split('.')[1];
      setPaymentData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [field]: value
        }
      }));
    } else {
      setPaymentData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    if (!paymentData.email || !paymentData.name) {
      return 'Please fill in all required fields';
    }
    
    if (!stripe || !elements) {
      return 'Payment system not ready. Please wait a moment and try again.';
    }
    
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return 'Card information is required';
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
      const result = await stripeService.confirmPayment(
        clientSecret,
        elements,
        {
          name: paymentData.name,
          email: paymentData.email,
          address: paymentData.billingAddress.line1 ? {
            line1: paymentData.billingAddress.line1,
            city: paymentData.billingAddress.city,
            state: paymentData.billingAddress.state,
            postal_code: paymentData.billingAddress.postal_code,
            country: paymentData.billingAddress.country
          } : undefined
        }
      );

      if (result.success && result.paymentIntentId) {
        onPaymentComplete(result.paymentIntentId);
      } else {
        setError(result.error || 'Payment failed. Please try again.');
      }
    } catch (error) {
      setError('An error occurred processing your payment. Please try again.');
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information *
        </label>
        <div className="p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-colors">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Billing Address</h3>
        
        <div>
          <label htmlFor="billing.line1" className="block text-sm font-medium text-gray-700 mb-2">
            Address Line 1
          </label>
          <input
            type="text"
            id="billing.line1"
            name="billing.line1"
            value={paymentData.billingAddress.line1}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="billing.city" className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              id="billing.city"
              name="billing.city"
              value={paymentData.billingAddress.city}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="New York"
            />
          </div>
          <div>
            <label htmlFor="billing.state" className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <input
              type="text"
              id="billing.state"
              name="billing.state"
              value={paymentData.billingAddress.state}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="NY"
            />
          </div>
        </div>

        <div>
          <label htmlFor="billing.postal_code" className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            id="billing.postal_code"
            name="billing.postal_code"
            value={paymentData.billingAddress.postal_code}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="10001"
          />
        </div>
      </div>

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

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  reportIds,
  isBundle,
  onPaymentComplete,
  onBack
}) => {
  const selectedReports = reportTypes.filter(rt => reportIds.includes(rt.id));
  const total = isBundle ? bundlePrice : reportIds.length * individualPrice;
  const savings = isBundle ? (reportIds.length * individualPrice) - bundlePrice : 0;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
          
          {isBundle ? (
            <div className="mb-6">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div>
                  <h3 className="font-bold text-gray-900">Complete Business Health Bundle</h3>
                  <p className="text-sm text-gray-600">All 5 reports + comprehensive overview</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">${bundlePrice}</div>
                  <div className="text-sm text-green-600">Save ${savings}</div>
                </div>
              </div>
            </div>
          ) : (
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
          )}

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">${isBundle ? bundlePrice : reportIds.length * individualPrice}</span>
            </div>
            {isBundle && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-600">Bundle Savings</span>
                <span className="font-semibold text-green-600">-${savings}</span>
              </div>
            )}
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
          
          <Elements stripe={stripePromise}>
            <PaymentForm
              reportIds={reportIds}
              isBundle={isBundle}
              total={total}
              onPaymentComplete={onPaymentComplete}
              onBack={onBack}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
};