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
  private apiUrl: string;
  
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }
  
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
      const response = await fetch(`${this.apiUrl}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(data.amount * 100), // Convert to cents
          currency: data.currency,
          reportIds: data.reportIds,
          customerEmail: data.customerEmail,
          customerName: data.customerName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create payment intent');
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
        console.error('Payment confirmation error:', error);
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
      console.error('Payment confirmation exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    try {
      const response = await fetch(`${this.apiUrl}/api/payment-intent/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const paymentIntent = await response.json();
      return { paymentIntent };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve payment intent');
    }
  }
}