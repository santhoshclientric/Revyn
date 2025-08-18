const express =  require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5174', 'http://localhost:5174']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create payment intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    console.log("hello in api")
    const { amount, currency, reportIds, customerEmail, customerName } = req.body;

    // Validate required fields
    if (!amount || !currency || !reportIds || !customerEmail) {
      return res.status(400).json({
        error: 'Missing required fields: amount, currency, reportIds, customerEmail'
      });
    }

    // Validate amount (should be in cents and positive)
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number in cents'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: currency.toLowerCase(),
      metadata: {
        reportIds: JSON.stringify(reportIds),
        customerEmail,
        customerName: customerName || '',
        source: 'revyn-marketing-audit'
      },
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    if (error.type === 'StripeCardError') {
      res.status(400).json({ error: error.message });
    } else if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Invalid request parameters' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Retrieve payment intent endpoint
app.get('/api/payment-intent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    
    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
      created: paymentIntent.created
    });

  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      res.status(404).json({ error: 'Payment intent not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Webhook endpoint for Stripe events
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      // Here you would typically:
      // 1. Update your database
      // 2. Send confirmation email
      // 3. Trigger report generation
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      // Handle failed payment
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables');
  } else {
    console.log('✅ Stripe configured successfully');
  }
});

module.exports = app;