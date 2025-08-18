import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { stripePromise } from '../config/stripe';

export interface PaymentIntentData {
  amount: number;
  currency: string;
  reportIds: string[];
  customerEmail: string;
  customerName: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe | null = null;
  
  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  async initialize(): Promise<Stripe | null> {
    if (!this.stripe) {
      this.stripe = await stripePromise;
    }
    return this.stripe;
  }

  async createPaymentIntent(data: PaymentIntentData): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      // In production, this would call your backend API
      // For now, we'll simulate the API call
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: data.amount * 100, // Convert to cents
          currency: data.currency,
          reportIds: data.reportIds,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          metadata: {
            reportIds: data.reportIds.join(','),
            isBundle: data.reportIds.length > 1
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { client_secret, payment_intent_id } = await response.json();
      
      return {
        clientSecret: client_secret,
        paymentIntentId: payment_intent_id
      };
    } catch (error) {
      // Fallback for development - simulate payment intent creation
      console.warn('Using simulated payment intent for development');
      const simulatedPaymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const simulatedClientSecret = `${simulatedPaymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        clientSecret: simulatedClientSecret,
        paymentIntentId: simulatedPaymentIntentId
      };
    }
  }

  async confirmPayment(
    clientSecret: string,
    elements: StripeElements,
    customerData: {
      name: string;
      email: string;
      address?: {
        line1: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
      };
    }
  ): Promise<PaymentResult> {
    const stripe = await this.initialize();
    if (!stripe) {
      return { success: false, error: 'Stripe failed to initialize' };
    }

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          payment_method_data: {
            billing_details: {
              name: customerData.name,
              email: customerData.email,
              address: customerData.address
            }
          }
        },
        redirect: 'if_required'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        return { 
          success: true, 
          paymentIntentId: paymentIntent.id 
        };
      }

      return { success: false, error: 'Payment was not completed' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    const stripe = await this.initialize();
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    return stripe.retrievePaymentIntent(paymentIntentId);
  }
}