import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Loader } from 'lucide-react';
import { StripeService } from '../services/stripeService';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const paymentIntentId = searchParams.get('payment_intent');
  const stripeService = StripeService.getInstance();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentIntentId) {
        setPaymentStatus('error');
        return;
      }

      try {
        const result = await stripeService.retrievePaymentIntent(paymentIntentId);
        
        if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
          setPaymentDetails(result.paymentIntent);
          setPaymentStatus('success');
        } else {
          setPaymentStatus('error');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setPaymentStatus('error');
      }
    };

    verifyPayment();
  }, [paymentIntentId, stripeService]);

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="flex justify-center mb-6">
              <Loader className="w-16 h-16 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verifying Payment
            </h2>
            <p className="text-gray-600">
              Please wait while we confirm your payment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <CheckCircle className="w-16 h-16 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Payment Error
            </h2>
            <p className="text-gray-600 mb-8">
              There was an issue with your payment. Please try again or contact support.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Return Home
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-gray-600 mb-8 text-lg">
            Thank you for your purchase. Your reports are being generated and will be available shortly.
          </p>

          {paymentDetails && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono">{paymentDetails.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span>${(paymentDetails.amount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 capitalize">{paymentDetails.status}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
            >
              View Your Reports
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            
            <button className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>What's next?</strong> You'll receive an email confirmation shortly. 
              Your AI-generated reports will be ready in 2-3 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};