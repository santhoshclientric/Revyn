import React, { useEffect, useState } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Loader, FileText } from 'lucide-react';
import { StripeService } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { reportTypes } from '../data/reportTypes';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isRecordingPurchase, setIsRecordingPurchase] = useState(true);
  const [purchaseRecorded, setPurchaseRecorded] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  // Get payment intent ID from either URL params or location state
  const paymentIntentId = searchParams.get('payment_intent') || location.state?.paymentIntentId;
  
  // Get report data from either URL params or location state
  const getReportData = () => {
    // Try location state first
    if (location.state?.reportIds) {
      return {
        reportIds: location.state.reportIds,
        isBundle: location.state.isBundle || false
      };
    }
    
    // Fall back to URL params
    const reportIdsParam = searchParams.get('report_ids');
    const isBundleParam = searchParams.get('is_bundle');
    
    return {
      reportIds: reportIdsParam ? reportIdsParam.split(',') : [],
      isBundle: isBundleParam === 'true'
    };
  };

  const { reportIds, isBundle } = getReportData();
  const selectedReports = reportTypes.filter(rt => reportIds.includes(rt.id));
  const total = reportIds.length * 125;

  const stripeService = StripeService.getInstance();

  useEffect(() => {
    const verifyPaymentAndRecord = async () => {
      if (!paymentIntentId) {
        setPaymentStatus('error');
        setIsRecordingPurchase(false);
        return;
      }

      try {
        // First verify the payment with Stripe
        const result = await stripeService.retrievePaymentIntent(paymentIntentId);
        
        if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
          setPaymentDetails(result.paymentIntent);
          setPaymentStatus('success');

          // Check if purchase already exists before inserting
          if (user && reportIds.length > 0) {
            try {
              // First check if this payment is already recorded
              const { data: existingPurchase, error: checkError } = await supabase
                .from('purchases')
                .select('id')
                .eq('user_id', user.id)
                .eq('stripe_payment_id', paymentIntentId)
                .single();

              if (checkError && checkError.code !== 'PGRST116') {
                // PGRST116 means no rows found, which is expected for new purchases
                console.error('Error checking existing purchase:', checkError);
                return;
              }

              if (existingPurchase) {
                console.log('Purchase already exists in database:', existingPurchase.id);
                setPurchaseRecorded(true);
                return;
              }

              // If no existing purchase found, create new one
              const { data: purchase, error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                  user_id: user.id,
                  report_ids: reportIds,
                  amount: total,
                  stripe_payment_id: paymentIntentId,
                  status: 'completed',
                  report_status: 'not_started',
                  company_name: null, // Will be filled when user submits company form
                  company_email: user.email
                })
                .select()
                .single();

              if (purchaseError) {
                // Check if it's a duplicate key error (purchase already exists)
                if (purchaseError.code === '23505') {
                  console.log('Purchase already exists (duplicate key), skipping insert');
                  setPurchaseRecorded(true);
                } else {
                  console.error('Error recording purchase:', purchaseError);
                }
              } else {
                console.log('Purchase recorded successfully:', purchase);
                setPurchaseRecorded(true);
              }
            } catch (err) {
              console.error('Error recording purchase:', err);
            }
          }
        } else {
          setPaymentStatus('error');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setPaymentStatus('error');
      } finally {
        setIsRecordingPurchase(false);
      }
    };

    // Only run once per payment intent
    if (paymentIntentId && !purchaseRecorded) {
      verifyPaymentAndRecord();
    }
  }, [paymentIntentId, user, reportIds, total, stripeService, purchaseRecorded]);

  const handleContinueToForm = () => {
    if (reportIds && reportIds.length > 0) {
      // Navigate to the first report form
      window.location.href = `/form/${reportIds[0]}?payment_intent=${paymentIntentId}`;
    }
  };

  const handleDownloadReceipt = async () => {
    if (!paymentIntentId) {
      alert('Payment information not available');
      return;
    }

    setIsDownloadingReceipt(true);

    try {
      // First, try to get the receipt URL from Stripe via your server
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/get-receipt-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId
        }),
      });

      if (response.ok) {
        const { receipt_url } = await response.json();
        
        if (receipt_url) {
          // Open Stripe receipt in new tab
          window.open(receipt_url, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      
      // Fallback: generate a simple receipt
      generateSimpleReceipt();
      
    } catch (error) {
      console.error('Error getting receipt URL:', error);
      // Fallback: generate a simple receipt
      generateSimpleReceipt();
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const generateSimpleReceipt = () => {
    // Generate a professional HTML receipt and trigger download
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Revyn Marketing AI Audit</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            background: #f9fafb;
          }
          .receipt { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .logo { 
            color: #3b82f6; 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 10px;
          }
          .subtitle { 
            color: #6b7280; 
            font-size: 14px; 
          }
          .details { 
            margin: 30px 0; 
            display: grid; 
            gap: 12px;
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; }
          .items { 
            margin: 20px 0; 
            border: 1px solid #e5e7eb; 
            border-radius: 8px; 
            overflow: hidden;
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            padding: 12px 16px; 
            border-bottom: 1px solid #f3f4f6;
          }
          .item:last-child { border-bottom: none; }
          .total { 
            background: #f3f4f6; 
            padding: 16px; 
            border-radius: 8px; 
            margin: 20px 0;
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            font-size: 20px; 
            font-weight: bold; 
            color: #3b82f6; 
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb; 
            font-size: 12px; 
            color: #6b7280; 
            text-align: center;
          }
          .success-badge {
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 20px;
          }
          @media print {
            body { background: white; }
            .receipt { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">Revyn</div>
            <div class="subtitle">Marketing AI Platform</div>
            <h2 style="margin: 20px 0 10px 0; color: #1f2937;">Payment Receipt</h2>
            <div class="success-badge">✓ Payment Successful</div>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Receipt #:</span>
              <span class="value">${paymentIntentId?.slice(-12).toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Payment ID:</span>
              <span class="value">${paymentIntentId}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date & Time:</span>
              <span class="value">${new Date().toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Customer Email:</span>
              <span class="value">${user?.email || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Payment Method:</span>
              <span class="value">Credit Card</span>
            </div>
          </div>

          <h3 style="color: #1f2937; margin: 30px 0 15px 0;">Items Purchased:</h3>
          <div class="items">
            ${selectedReports.map(report => `
              <div class="item">
                <span>${report.name}</span>
                <span style="font-weight: 600;">$${report.price}</span>
              </div>
            `).join('')}
          </div>

          <div class="total">
            <div class="total-row">
              <span>Total Amount:</span>
              <span>$${total}.00</span>
            </div>
          </div>

          <div class="footer">
            <p style="margin-bottom: 10px;">
              <strong>Thank you for your purchase!</strong><br>
              This receipt was generated on ${new Date().toLocaleString()}
            </p>
            <p style="margin: 0;">
              Questions? Contact us at <strong>support@revyn.com</strong><br>
              Revyn - Transform your marketing with AI-powered insights
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revyn-receipt-${paymentIntentId?.slice(-8) || new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

          {/* Show purchased reports */}
          {selectedReports.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Purchased Reports</h3>
              <div className="space-y-2">
                {selectedReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{report.name}</span>
                    <span className="text-sm font-semibold text-gray-900">${report.price}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-blue-200 mt-4 pt-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>
            </div>
          )}

          {paymentDetails && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono text-xs">{paymentDetails.id}</span>
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
            {reportIds.length > 0 && (
              <button
                onClick={handleContinueToForm}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Start Report Generation
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
            
            <Link
              to="/dashboard"
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
            >
              View My Reports
            </Link>
            
            <button 
              onClick={handleDownloadReceipt}
              disabled={isDownloadingReceipt}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingReceipt ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Getting Receipt...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </>
              )}
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>What's next?</strong> You'll receive an email confirmation shortly. 
              Click "Start Report Generation" to fill out the forms and get your AI-generated reports.
            </p>
            {isRecordingPurchase && (
              <p className="text-xs text-blue-600 mt-2">
                Recording your purchase...
              </p>
            )}
            {purchaseRecorded && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Purchase recorded successfully
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};