import { loadStripe } from '@stripe/stripe-js';

// Make sure to replace with your actual publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51234567890abcdef';

export const stripePromise = loadStripe(stripePublishableKey);

export const STRIPE_CONFIG = {
  publishableKey: stripePublishableKey,
  currency: 'usd',
  country: 'US'
};