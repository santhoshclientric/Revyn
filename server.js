import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:5173']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/trigger-ai-analysis', async (req, res) => {
  try {
    console.log('Triggering AI analysis...');
    const { purchase_id } = req.body;

    // Validate required fields
    if (!purchase_id) {
      return res.status(400).json({
        error: 'Missing required field: purchase_id'
      });
    }

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(purchase_id)) {
      return res.status(400).json({
        error: 'Invalid purchase_id format. Must be a valid UUID.'
      });
    }

    // Get Catalyst API URL from environment variables
    const catalystApiUrl = process.env.CATALYST_AI_API_URL;
    if (!catalystApiUrl) {
      console.error('CATALYST_AI_API_URL not configured in environment variables');
      return res.status(500).json({
        error: 'AI analysis service not configured'
      });
    }

    console.log(`Calling Catalyst API for purchase_id: ${purchase_id}`);
    const requestBody = [{"purchase_id": purchase_id}];
    console.log(requestBody)

    // Make the API call to Catalyst
    const catalystResponse = await fetch(catalystApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any additional headers if needed
        // 'Authorization': `Bearer ${process.env.CATALYST_API_KEY}`, // if auth is required
      },
      body: requestBody
    });

    console.log(`Catalyst API response status: ${catalystResponse.status}`);

    if (!catalystResponse.ok) {
      const errorText = await catalystResponse.text();
      console.error('Catalyst API error response:', errorText);
      
      return res.status(502).json({
        error: 'AI analysis service temporarily unavailable',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      });
    }

    let catalystResult;
    try {
      catalystResult = await catalystResponse.json();
      console.log('Catalyst API success response:', catalystResult);
    } catch (parseError) {
      console.log('Catalyst API returned non-JSON response (this might be expected)');
      catalystResult = { message: 'AI analysis triggered successfully' };
    }

    // Return success response to client
    res.json({
      success: true,
      message: 'AI analysis triggered successfully',
      purchase_id: purchase_id,
      timestamp: new Date().toISOString(),
      catalyst_response: catalystResult
    });

  } catch (error) {
    console.error('Error triggering AI analysis:', error);
    
    // Handle different types of errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(502).json({
        error: 'Unable to connect to AI analysis service'
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(502).json({
        error: 'AI analysis service is unavailable'
      });
    }

    res.status(500).json({
      error: 'Failed to trigger AI analysis',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
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
