// src/config/stripe.ts - Clean version without conflicts
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Lazy loading approach - only load when needed
let stripeInstance: Promise<Stripe | null> | null = null;

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripeInstance) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Stripe publishable key not found');
      return Promise.resolve(null);
    }
    
    console.log('Loading Stripe for the first time...');
    stripeInstance = loadStripe(publishableKey);
  }
  return stripeInstance;
};

// For backward compatibility - but it's now lazy loaded
export const stripePromise = getStripe();