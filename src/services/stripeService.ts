import { loadStripe, Stripe } from '@stripe/stripe-js';
// Remove the import of stripePromise - we'll load it lazily
// import { stripePromise } from '../config/stripe';

export interface PaymentIntentData {
  amount: number;
  currency: string;
  reportIds: string[];
  customerEmail: string;
  customerName: string;
}

export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe | null = null;
  private stripePromise: Promise<Stripe | null> | null = null;
  private apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // Lazy load Stripe only when needed
  private async getStripe(): Promise<Stripe | null> {
    if (!this.stripePromise) {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        console.error('Stripe publishable key not found');
        return null;
      }
      
      console.log('Loading Stripe on demand...');
      this.stripePromise = loadStripe(publishableKey);
    }
    
    if (!this.stripe) {
      this.stripe = await this.stripePromise;
    }
    
    return this.stripe;
  }

  async initialize(): Promise<Stripe | null> {
    return await this.getStripe();
  }

  async createPaymentIntent(data: PaymentIntentData): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      console.log('Creating payment intent with data:', data);
      console.log('API URL:', this.apiUrl);
      
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

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment intent error:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Payment intent created:', result);
      return {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create payment intent');
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