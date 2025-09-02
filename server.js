import express, { json } from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client with service role key for server operations
// Add validation and fallback values
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is required in environment variables');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:5173', 'http://localhost:3000']
}));

// Special middleware for webhooks - must be before express.json()
app.use('/api/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Add this after your existing client initializations
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Add these endpoints after your existing endpoints (before webhook section)

// ========================================
// AI CHAT ENDPOINTS
// ========================================

/**
 * Continue conversation in existing OpenAI thread
 * POST /api/ai-chat/continue-thread
 */
app.post('/api/ai-chat/continue-thread', async (req, res) => {
  try {
    const { thread_id, message, assistant_type } = req.body;

    if (!thread_id || !message) {
      return res.status(400).json({
        error: 'Missing required fields: thread_id, message'
      });
    }

    console.log(`Adding message to thread: ${thread_id}`);

   // Get existing messages to check if this is a follow-up
const existingMessages = await openai.beta.threads.messages.list(thread_id, {
  limit: 5
});

let finalMessage = message;

// If there are already messages, add text format instruction
if (existingMessages.data.length > 0) {
  finalMessage =`${message}\n\nIMPORTANT: Please respond with plain conversational text only. Do not wrap your response in JSON format or use any structured data format.`;
}

await openai.beta.threads.messages.create(thread_id, {
  role: 'user',
  content: finalMessage
});

    // Determine assistant ID based on type
    let assistantId;
    if (assistant_type === 'marketing') {
      assistantId = process.env.OPENAI_ASSESSMENT_ASSISTANT_ID || asst_FIru7rA4zB1acJ6V8lftn2qZ;
    } else if (assistant_type === 'website') {
      assistantId = process.env.OPENAI_WEBSITE_ASSISTANT_ID || asst_U4jZs2BtUeZoGrQUFSCbufcX;
    } else {
      // Fallback - try to determine from database or use default
      assistantId = process.env.OPENAI_ASSESSMENT_ASSISTANT_ID;
    }

    if (!assistantId) {
      return res.status(500).json({
        error: 'Assistant ID not configured'
      });
    }

    console.log(`Using assistant: ${assistantId}`);

    // Create run
    let run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: assistantId,
      temperature: 0.1,
      top_p: 0.1,
    });

    // Set up Server-Sent Events for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Poll for run completion and stream response
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    const pollRun = async () => {
      try {
        const runStatus = await openai.beta.threads.runs.retrieve(thread_id, run.id);
        
        if (runStatus.status === 'completed') {
          // Get the latest message
          const messages = await openai.beta.threads.messages.list(thread_id, {
            order: 'desc',
            limit: 1
          });

          const latestMessage = messages.data[0];
          if (latestMessage && latestMessage.content[0]?.type === 'text') {
            const responseText = latestMessage.content[0].text.value;
            
            // Stream the response word by word for better UX
            const words = responseText.split(' ');
            for (let i = 0; i < words.length; i++) {
              const token = i === 0 ? words[i] : ' ' + words[i];
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          res.write('data: [DONE]\n\n');
          res.end();
        } else if (runStatus.status === 'failed') {
          console.error('Run failed:', runStatus.last_error);
          res.write(`data: ${JSON.stringify({ error: 'AI processing failed' })}\n\n`);
          res.end();
        } else if (['queued', 'in_progress'].includes(runStatus.status) && attempts < maxAttempts) {
          attempts++;
          console.log(`Polling attempt ${attempts}/${maxAttempts}, status: ${runStatus.status}`);
          setTimeout(pollRun, pollInterval);
        } else {
          res.write(`data: ${JSON.stringify({ error: 'Request timeout' })}\n\n`);
          res.end();
        }
      } catch (error) {
        console.error('Polling error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Processing error: ' + error.message })}\n\n`);
        res.end();
      }
    };

    // Start polling
    setTimeout(pollRun, 1000);

  } catch (error) {
    console.error('Error in continue-thread:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Failed to process message' 
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * Get thread messages
 * GET /api/ai-chat/thread/:threadId/messages
 */
app.get('/api/ai-chat/thread/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    
    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    console.log(`Fetching messages for thread: ${threadId}`);

    const messages = await openai.beta.threads.messages.list(threadId, {
      order: 'asc',
      limit: 100
    });

    const formattedMessages = messages.data.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
      timestamp: new Date(msg.created_at * 1000).toISOString(),
    }));

    res.json({ messages: formattedMessages });

  } catch (error) {
    console.error('Error fetching thread messages:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch messages' 
    });
  }
});

/**
 * Check thread status and get thread info
 * GET /api/ai-chat/thread/:threadId/status
 */
app.get('/api/ai-chat/thread/:threadId/status', async (req, res) => {
  try {
    const { threadId } = req.params;
    
    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    // Try to retrieve thread to check if it exists
    const thread = await openai.beta.threads.retrieve(threadId);
    
    res.json({ 
      exists: true,
      id: thread.id,
      created_at: thread.created_at,
      metadata: thread.metadata || {}
    });

  } catch (error) {
    console.error('Error checking thread status:', error);
    
    if (error.status === 404) {
      res.status(404).json({ exists: false, error: 'Thread not found' });
    } else {
      res.status(500).json({ 
        error: error.message || 'Failed to check thread status' 
      });
    }
  }
});

/**
 * Get AI results with thread IDs for a purchase
 * GET /api/ai-results/:purchaseId
 */
app.get('/api/ai-results/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    if (!purchaseId) {
      return res.status(400).json({ error: 'Purchase ID is required' });
    }

    console.log(`Fetching AI results for purchase: ${purchaseId}`);

    // Get AI results from database
    const { data: aiResults, error: aiError } = await supabase
      .from('ai_results')
      .select('*')
      .eq('purchase_id', purchaseId)
      .single();

    if (aiError) {
      if (aiError.code === 'PGRST116') {
        return res.status(404).json({ error: 'AI results not found' });
      }
      throw aiError;
    }

    // Get purchase info with thread IDs
    const { data: purchase, error: purchaseError } = await supabase
      .from('ai_results')
      .select('result_data_thread_id, website_analysis_thread_id')
      .eq('id', purchaseId)
      .single();

    if (purchaseError && purchaseError.code !== 'PGRST116') {
      console.warn('Could not fetch purchase thread IDs:', purchaseError);
    }

    // Combine the data
    const response = {
      ...aiResults,
      result_data_thread_id: purchase?.result_data_thread_id || aiResults.result_data_thread_id,
      website_analysis_thread_id: purchase?.website_analysis_thread_id || aiResults.website_analysis_thread_id
    };

    console.log(response)

    res.json(response);

  } catch (error) {
    console.error('Error fetching AI results:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch AI results' 
    });
  }
});

/**
 * Create new thread (for future functionality)
 * POST /api/ai-chat/create-thread
 */
app.post('/api/ai-chat/create-thread', async (req, res) => {
  try {
    const { message, assistant_type } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    console.log('Creating new thread...');

    // Create thread
    const thread = await openai.beta.threads.create();

    // Add initial message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });

    res.json({
      thread_id: thread.id,
      message: 'Thread created successfully'
    });

  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create thread' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Create payment intent for report purchases
 * POST /api/create-payment-intent
 */
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    console.log('Creating payment intent...');
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
      amount: Math.round(amount), 
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

    console.log('Payment intent created:', paymentIntent.id);

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
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
});


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
      res.status(500).json({ error: 'Failed to retrieve payment intent' });
    }
  }
});

app.post('/api/get-receipt-url', async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    
    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }
    
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.latest_charge) {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
      
      res.json({ 
        receipt_url: charge.receipt_url,
        charge_id: charge.id 
      });
    } else {
      res.status(404).json({ error: 'No charge found for this payment' });
    }
  } catch (error) {
    console.error('Error getting receipt URL:', error);
    res.status(500).json({ error: 'Failed to get receipt URL' });
  }
});


/**
 * Create a recurring subscription for chat support
 * POST /api/create-chat-subscription
 */
app.post('/api/create-chat-subscription', async (req, res) => {
  try {
    const { userId, purchaseId, customerEmail, customerName, priceAmount, currency } = req.body;

    console.log('Creating chat subscription for:', { userId, purchaseId, customerEmail });

    // Validate required fields
    if (!userId || !purchaseId || !customerEmail || !priceAmount) {
      return res.status(400).json({
        error: 'Missing required fields: userId, purchaseId, customerEmail, priceAmount'
      });
    }

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('Found existing customer:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          userId,
          purchaseId,
          product: 'chat_support'
        },
      });
      console.log('Created new customer:', customer.id);
    }

    // Validate Stripe price ID
    const stripeChatPriceId = process.env.STRIPE_CHAT_PRICE_ID;
    
    let subscriptionItems;
    
    if (stripeChatPriceId) {
      subscriptionItems = [{ price: stripeChatPriceId }];
    } else {
      console.log('No STRIPE_CHAT_PRICE_ID found, creating product and price inline');
      
      const product = await stripe.products.create({
        name: 'Revyn Chat Support',
        description: 'Unlimited AI chat support for your marketing reports',
        type: 'service'
      });
      
      subscriptionItems = [{
        price_data: {
          currency: currency || 'usd',
          product: product.id,
          unit_amount: priceAmount,
          recurring: {
            interval: 'month',
          },
        },
      }];
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: subscriptionItems,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        purchaseId,
        type: 'chat_subscription'
      },
      proration_behavior: 'none',
    });

    console.log('Subscription created:', subscription.id);
    console.log('Subscription status:', subscription.status);

    // Get client secret
    let clientSecret = null;
    
    if (subscription.latest_invoice?.payment_intent?.client_secret) {
      clientSecret = subscription.latest_invoice.payment_intent.client_secret;
      console.log('Got client secret from subscription invoice');
    } else {
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          subscription_id: subscription.id,
          userId,
          purchaseId,
          type: 'chat_subscription_setup'
        }
      });
      
      clientSecret = setupIntent.client_secret;
      console.log('Created setup intent:', setupIntent.id);
    }

    // Store subscription in chat_subscriptions table only
    const safeDateConversion = (timestamp) => {
      try {
        if (!timestamp || isNaN(timestamp)) {
          return null;
        }
        return new Date(timestamp * 1000).toISOString();
      } catch (error) {
        console.warn('Date conversion error:', error);
        return null;
      }
    };

    const { data: existingSubscription, error: checkError } = await supabase
      .from('chat_subscriptions')
      .select('id')
      .eq('purchase_id', purchaseId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing subscription:', checkError);
    }

    const subscriptionData = {
      user_id: userId,
      purchase_id: purchaseId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: safeDateConversion(subscription.current_period_start),
      current_period_end: safeDateConversion(subscription.current_period_end),
    };

    if (existingSubscription) {
      console.log('Subscription already exists for this purchase, updating instead of inserting');
      
      const { error: updateError } = await supabase
        .from('chat_subscriptions')
        .update({
          ...subscriptionData,
          updated_at: new Date().toISOString()
        })
        .eq('purchase_id', purchaseId);

      if (updateError) {
        console.error('Error updating existing subscription:', updateError);
      }
    } else {
      const { error: dbError } = await supabase
        .from('chat_subscriptions')
        .insert(subscriptionData);

      if (dbError) {
        console.error('Database error storing subscription:', dbError);
      }
    }

    res.json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      status: subscription.status,
      hasPaymentIntent: !!clientSecret
    });

  } catch (error) {
    console.error('Error creating chat subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create subscription' 
    });
  }
});

app.post('/api/cancel-chat-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    console.log('Cancelling subscription:', subscriptionId);

    // Cancel subscription in Stripe (at period end)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update purchases table with cancellation info
    const { error: purchaseError } = await supabase
      .from('purchases')
      .update({
        chat_subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('chat_stripe_subscription_id', subscriptionId);

    if (purchaseError) {
      console.error('Error updating purchase on cancellation:', purchaseError);
    } else {
      console.log('Purchase updated with cancellation status');
    }

    console.log('Subscription cancelled successfully');

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end
      }
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to cancel subscription' 
    });
  }
});

/**
 * Complete subscription setup after setup intent succeeds
 * POST /api/complete-subscription-setup
 */
app.post('/api/complete-subscription-setup', async (req, res) => {
  try {
    const { setup_intent_id, purchase_id, user_id } = req.body;

    if (!setup_intent_id || !purchase_id || !user_id) {
      return res.status(400).json({
        error: 'Missing required fields: setup_intent_id, purchase_id, user_id'
      });
    }

    console.log('Completing subscription setup for:', { setup_intent_id, purchase_id });

    // Retrieve the setup intent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
    
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Setup intent not succeeded'
      });
    }

    // Get the subscription ID from setup intent metadata
    const subscriptionId = setupIntent.metadata.subscription_id;
    
    if (!subscriptionId) {
      return res.status(400).json({
        error: 'No subscription ID found in setup intent'
      });
    }

    // Retrieve the subscription with invoice expanded to ensure we have the latest data
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice']
    });

    // Update the subscription with the payment method
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: setupIntent.payment_method,
    });

    console.log('Updated subscription with payment method');

    // Try to pay the first invoice if it exists and has an amount due
    if (subscription.latest_invoice && subscription.latest_invoice.amount_due > 0) {
      try {
        const invoiceId = typeof subscription.latest_invoice === 'string' 
          ? subscription.latest_invoice 
          : subscription.latest_invoice.id;
          
        const paidInvoice = await stripe.invoices.pay(invoiceId);
        console.log('First invoice paid successfully:', paidInvoice.id);
      } catch (payError) {
        console.error('Error paying first invoice:', payError);
        // Continue anyway - the subscription is set up, payment can be retried
      }
    } else {
      console.log('No invoice to pay or amount due is 0');
    }

    // Update database with active status
    await supabase
      .from('chat_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    await supabase
      .from('purchases')
      .update({
        chat_subscription_status: 'active',
        chat_last_payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', purchase_id);

    res.json({
      success: true,
      subscription_id: subscriptionId,
      status: 'active'
    });

  } catch (error) {
    console.error('Error completing subscription setup:', error);
    res.status(500).json({
      error: error.message || 'Failed to complete subscription setup'
    });
  }
});
app.get('/api/chat-subscription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data, error } = await supabase
      .from('chat_subscriptions')
      .select(`
        stripe_subscription_id,
        status,
        current_period_end
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      throw error;
    }
console.log(JSON.stringify(data))
    const hasActiveSubscription = data && data.length > 0;
    
    res.json({
      hasActiveSubscription,
      subscriptionId: hasActiveSubscription ? data[0].stripe_subscription_id : null,
      currentPeriodEnd: hasActiveSubscription ? data[0].current_period_end : null,
      status: hasActiveSubscription ? data[0].status : null
    });

  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to check subscription status' 
    });
  }
});

// ========================================
// AI ANALYSIS ENDPOINT
// ========================================

/**
 * Trigger AI analysis for completed forms
 * POST /api/trigger-ai-analysis
 */
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
    const requestBody = JSON.stringify([{"purchase_id": purchase_id}]);

    // Make the API call to Catalyst
    const catalystResponse = await fetch(catalystApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization if needed
        ...(process.env.CATALYST_API_KEY && {
          'Authorization': `Bearer ${process.env.CATALYST_API_KEY}`
        })
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

// ========================================
// WEBHOOK ENDPOINTS
// ========================================

/**
 * Handle Stripe webhooks for payment events
 * POST /api/webhook
 */
app.post('/api/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;

      // Chat subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleSubscriptionPaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handleSubscriptionPaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ========================================
// WEBHOOK HANDLER FUNCTIONS
// ========================================

/**
 * Handle successful payment intent
 */
async function handlePaymentSuccess(paymentIntent) {
  try {
    console.log('Payment succeeded:', paymentIntent.id);
    
    // Extract metadata
    const { reportIds, customerEmail } = paymentIntent.metadata;
    
    // Update purchase status in database if needed
    const { error } = await supabase
      .from('purchases')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_id', paymentIntent.id);

    if (error) {
      console.error('Error updating purchase status:', error);
    }

    // Here you could trigger additional actions like:
    // - Send confirmation email
    // - Start report generation process
    // - Update analytics
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentFailure(paymentIntent) {
  try {
    console.log('Payment failed:', paymentIntent.id);
    
    // Update purchase status
    const { error } = await supabase
      .from('purchases')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_id', paymentIntent.id);

    if (error) {
      console.error('Error updating failed purchase:', error);
    }

    // Could send notification email to customer about failed payment
    
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const subscriptionId = subscription.id;
    const status = subscription.status;
    
    // Safe date conversion function
    const safeDateConversion = (timestamp) => {
      if (!timestamp || isNaN(timestamp)) {
        return null; // Store null for incomplete subscriptions
      }
      try {
        return new Date(timestamp * 1000).toISOString();
      } catch (error) {
        console.warn('Date conversion error in subscription update:', error);
        return null;
      }
    };

    const currentPeriodEnd = safeDateConversion(subscription.current_period_end);
    const currentPeriodStart = safeDateConversion(subscription.current_period_start);

    console.log('Updating subscription:', subscriptionId, 'to status:', status);

    // Update chat_subscriptions table
    const { error: subscriptionError } = await supabase
      .from('chat_subscriptions')
      .update({
        status: status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (subscriptionError) {
      console.error('Error updating chat_subscriptions:', subscriptionError);
    }

    // Update purchases table
   // Add after the existing chat_subscriptions update:
const { error: purchaseError } = await supabase
.from('purchases')
.update({
  chat_subscription_status: status,
  chat_subscription_start_date: safeDateConversion(subscription.current_period_start),
  chat_subscription_end_date: safeDateConversion(subscription.current_period_end),
  updated_at: new Date().toISOString()
})
.eq('chat_stripe_subscription_id', subscriptionId);

    if (purchaseError) {
      console.error('Error updating purchases with subscription info:', purchaseError);
    } else {
      console.log('Purchase updated successfully with subscription status:', status);
    }

  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const subscriptionId = subscription.id;
    
    console.log('Handling subscription deletion:', subscriptionId);

    // Update chat_subscriptions table
    const { error: subscriptionError } = await supabase
      .from('chat_subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (subscriptionError) {
      console.error('Error updating chat_subscriptions on deletion:', subscriptionError);
    }

    // Update purchases table to cancelled status
    const { error: purchaseError } = await supabase
      .from('purchases')
      .update({
        chat_subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('chat_stripe_subscription_id', subscriptionId);

    if (purchaseError) {
      console.error('Error updating purchases on subscription deletion:', purchaseError);
    } else {
      console.log('Purchase updated to cancelled status');
    }

  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
  }
}

/**
 * Handle successful subscription payment
 */
async function handleSubscriptionPaymentSucceeded(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    
    console.log('Subscription payment succeeded:', subscriptionId);

    // Update chat_subscriptions table
    const { error: subscriptionError } = await supabase
      .from('chat_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (subscriptionError) {
      console.error('Error updating chat_subscriptions on payment success:', subscriptionError);
    }

    // Update purchases table with successful payment info
    const { error: purchaseError } = await supabase
      .from('purchases')
      .update({
        chat_last_payment_date: new Date().toISOString(),
        chat_subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('chat_stripe_subscription_id', subscriptionId);

    if (purchaseError) {
      console.error('Error updating purchases on payment success:', purchaseError);
    } else {
      console.log('Purchase updated with successful payment info');
    }

  } catch (error) {
    console.error('Error in handleSubscriptionPaymentSucceeded:', error);
  }
}

/**
 * Handle failed subscription payment
 */
async function handleSubscriptionPaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    
    console.log('Subscription payment failed:', subscriptionId);

    // Update chat_subscriptions table
    const { error: subscriptionError } = await supabase
      .from('chat_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (subscriptionError) {
      console.error('Error updating chat_subscriptions on payment failure:', subscriptionError);
    }

    // Update purchases table to past_due status
   // Get subscription details from Stripe to update purchases table
const subscription = await stripe.subscriptions.retrieve(subscriptionId);

const { error: purchaseError } = await supabase
  .from('purchases')
  .update({
    chat_subscription_status: 'past_due',
    updated_at: new Date().toISOString()
  })
  .eq('chat_stripe_subscription_id', subscriptionId);

    if (purchaseError) {
      console.error('Error updating purchases on payment failure:', purchaseError);
    } else {
      console.log('Purchase updated to past_due status');
    }

  } catch (error) {
    console.error('Error in handleSubscriptionPaymentFailed:', error);
  }
}

// ========================================
// ERROR HANDLING & 404
// ========================================

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// FIXED: Marketing Report Context Formatter
function formatMarketingReportContext(reportData) {
  try {
    if (typeof reportData === 'string') return reportData;
    
    let contextText = 'MARKETING AUDIT DATA:\n\n';
    
    if (typeof reportData === 'object') {
      // Overall Score
      if (reportData.overall_score) {
        contextText += `OVERALL MARKETING SCORE: ${reportData.overall_score}/100\n\n`;
      }
      
      // Specific marketing sections
      if (reportData["1. 🎯 Target Audience & Positioning"]) {
        contextText += `TARGET AUDIENCE & POSITIONING:\n`;
        const audience = reportData["1. 🎯 Target Audience & Positioning"];
        if (Array.isArray(audience)) {
          audience.forEach((item, i) => {
            contextText += `${i+1}. ${item}\n`;
          });
        } else if (typeof audience === 'object') {
          Object.entries(audience).forEach(([key, value]) => {
            contextText += `${key}: ${value}\n`;
          });
        }
        contextText += '\n';
      }
      
      if (reportData["2. 📊 Marketing Funnel & Customer Journey"]) {
        contextText += `MARKETING FUNNEL ANALYSIS:\n`;
        const funnel = reportData["2. 📊 Marketing Funnel & Customer Journey"];
        if (Array.isArray(funnel)) {
          funnel.forEach((item, i) => {
            contextText += `${i+1}. ${item}\n`;
          });
        }
        contextText += '\n';
      }
      
      if (reportData["3. 🔧 Tech Stack & Marketing Operations"]) {
        contextText += `TECH STACK & OPERATIONS:\n`;
        const techStack = reportData["3. 🔧 Tech Stack & Marketing Operations"];
        if (Array.isArray(techStack)) {
          techStack.forEach((item, i) => {
            contextText += `${i+1}. ${item}\n`;
          });
        }
        contextText += '\n';
      }
      
      if (reportData["4. 💰 Budget & Resource Allocation"]) {
        contextText += `BUDGET & RESOURCE ALLOCATION:\n`;
        const budget = reportData["4. 💰 Budget & Resource Allocation"];
        if (Array.isArray(budget)) {
          budget.forEach((item, i) => {
            contextText += `${i+1}. ${item}\n`;
          });
        }
        contextText += '\n';
      }
      
      // Growth Plan
      if (reportData["5. 📈 Growth & Scaling Plan"]) {
        contextText += `GROWTH & SCALING PLAN:\n`;
        const plan = reportData["5. 📈 Growth & Scaling Plan"];
        if (plan["30 Days"]) {
          contextText += `30-Day Actions:\n${plan["30 Days"].map((a, i) => `${i+1}. ${a}`).join('\n')}\n\n`;
        }
        if (plan["90 Days"]) {
          contextText += `90-Day Goals:\n${plan["90 Days"].map((g, i) => `${i+1}. ${g}`).join('\n')}\n\n`;
        }
        if (plan["365 Days"]) {
          contextText += `1-Year Vision:\n${plan["365 Days"].map((v, i) => `${i+1}. ${v}`).join('\n')}\n\n`;
        }
      }
      
      // Social Media Performance
      if (reportData["6. 📲 Social Channel Performance Overview"]) {
        contextText += `SOCIAL MEDIA PERFORMANCE:\n`;
        const social = reportData["6. 📲 Social Channel Performance Overview"];
        Object.entries(social).forEach(([platform, data]) => {
          if (typeof data === 'object' && data.Score) {
            contextText += `${platform}: Score ${data.Score}/100 (${data.Status})\n`;
          }
        });
        contextText += '\n';
      }
      
      // Tools Recommendations
      if (reportData["7. 🛠 Tool & Tactic Recommendations"]) {
        contextText += `RECOMMENDED TOOLS:\n`;
        reportData["7. 🛠 Tool & Tactic Recommendations"].forEach((tool, i) => {
          contextText += `${i+1}. ${tool["Tool Name"]} (${tool.Category}) - ${tool["Why It Fits"]}\n`;
        });
        contextText += '\n';
      }
      
      // Follow-up questions if available
      if (reportData.follow_up && Array.isArray(reportData.follow_up)) {
        contextText += `SUGGESTED DISCUSSION TOPICS:\n`;
        reportData.follow_up.forEach((question, i) => {
          contextText += `${i+1}. ${question}\n`;
        });
        contextText += '\n';
      }
    }
    
    return contextText;
  } catch (error) {
    console.error('Error formatting marketing context:', error);
    return JSON.stringify(reportData, null, 2);
  }
}

// FIXED: Website Analysis Context Formatter (separate function)
function formatWebsiteAnalysisContext(websiteData) {
  try {
    if (typeof websiteData === 'string') {
      return websiteData;
    }
    
    let contextText = 'WEBSITE ANALYSIS DATA:\n\n';
    
    if (typeof websiteData === 'object') {
      // Overall Score and Status
      if (websiteData.score) {
        contextText += `OVERALL WEBSITE SCORE: ${websiteData.score.value}/100 (${websiteData.score.status})\n`;
        if (websiteData.score.description) {
          contextText += `Assessment: ${websiteData.score.description}\n`;
        }
        contextText += `\n`;
      }
      
      // Analysis Categories
      if (websiteData.analysis) {
        const analysis = websiteData.analysis;
        
        if (analysis.content_quality && analysis.content_quality.length > 0) {
          contextText += `CONTENT QUALITY ISSUES:\n`;
          analysis.content_quality.forEach((issue, i) => {
            contextText += `${i+1}. ${issue}\n`;
          });
          contextText += `\n`;
        }
        
        if (analysis.seo_discoverability && analysis.seo_discoverability.length > 0) {
          contextText += `SEO & DISCOVERABILITY ISSUES:\n`;
          analysis.seo_discoverability.forEach((issue, i) => {
            contextText += `${i+1}. ${issue}\n`;
          });
          contextText += `\n`;
        }
        
        if (analysis.branding_consistency && analysis.branding_consistency.length > 0) {
          contextText += `BRANDING & CONSISTENCY ISSUES:\n`;
          analysis.branding_consistency.forEach((issue, i) => {
            contextText += `${i+1}. ${issue}\n`;
          });
          contextText += `\n`;
        }
        
        if (analysis.conversion_readiness && analysis.conversion_readiness.length > 0) {
          contextText += `CONVERSION & CRO ISSUES:\n`;
          analysis.conversion_readiness.forEach((issue, i) => {
            contextText += `${i+1}. ${issue}\n`;
          });
          contextText += `\n`;
        }

        if (analysis.user_experience && analysis.user_experience.length > 0) {
          contextText += `USER EXPERIENCE ISSUES:\n`;
          analysis.user_experience.forEach((issue, i) => {
            contextText += `${i+1}. ${issue}\n`;
          });
          contextText += `\n`;
        }

        if (analysis.technical_performance && analysis.technical_performance.length > 0) {
          contextText += `TECHNICAL PERFORMANCE ISSUES:\n`;
          analysis.technical_performance.forEach((issue, i) => {
            contextText += `${i+1}. ${issue}\n`;
          });
          contextText += `\n`;
        }
      }
      
      // Priority Roadmap
      if (websiteData.priority_roadmap) {
        contextText += `PRIORITY IMPROVEMENT ROADMAP:\n`;
        
        if (websiteData.priority_roadmap["30_days"] && websiteData.priority_roadmap["30_days"].length > 0) {
          contextText += `\n30-Day Priority Fixes:\n`;
          websiteData.priority_roadmap["30_days"].forEach((task, i) => {
            contextText += `${i+1}. ${task}\n`;
          });
        }
        
        if (websiteData.priority_roadmap["60_days"] && websiteData.priority_roadmap["60_days"].length > 0) {
          contextText += `\n60-Day Improvements:\n`;
          websiteData.priority_roadmap["60_days"].forEach((task, i) => {
            contextText += `${i+1}. ${task}\n`;
          });
        }

        if (websiteData.priority_roadmap["90_days"] && websiteData.priority_roadmap["90_days"].length > 0) {
          contextText += `\n90-Day Strategic Goals:\n`;
          websiteData.priority_roadmap["90_days"].forEach((task, i) => {
            contextText += `${i+1}. ${task}\n`;
          });
        }
        contextText += `\n`;
      }

      // Recommendations
      if (websiteData.recommendations && websiteData.recommendations.length > 0) {
        contextText += `KEY RECOMMENDATIONS:\n`;
        websiteData.recommendations.forEach((rec, i) => {
          contextText += `${i+1}. ${rec}\n`;
        });
        contextText += `\n`;
      }
      
      // Follow-up topics
      if (websiteData.follow_up && Array.isArray(websiteData.follow_up)) {
        contextText += `SUGGESTED DISCUSSION TOPICS:\n`;
        websiteData.follow_up.forEach((question, i) => {
          contextText += `${i+1}. ${question}\n`;
        });
        contextText += `\n`;
      }
    }
    
    return contextText;
  } catch (error) {
    console.error('Error formatting website analysis context:', error);
    return JSON.stringify(websiteData, null, 2);
  }
}

const checkTokenLimit = async (threadId) => {
  try {
    const messages = await openai.beta.threads.messages.list(threadId, { limit: 100 });
    const estimatedTokens = messages.data
      .map(msg => msg.content[0]?.text?.value || '')
      .join(' ')
      .length / 4; // Rough estimation: 4 characters = 1 token

    console.log(`Thread ${threadId} estimated tokens: ${estimatedTokens}`);
    return estimatedTokens > 25000; // Rotate before hitting 32k limit
  } catch (error) {
    console.error('Error checking token limit:', error);
    return false;
  }
};

// Conversation Summary for Thread Rotation
const createConversationSummary = async (messages) => {
  try {
    const conversationText = messages
      .reverse()
      .map(msg => `${msg.role}: ${msg.content[0]?.text?.value || ''}`)
      .join('\n');
    
    const summary = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Summarize this report discussion conversation, focusing on:
1. Key topics discussed about the report
2. Specific recommendations or advice given  
3. User's main concerns or questions
4. Any decisions or next steps mentioned

Conversation:
${conversationText}

Provide a concise summary in 2-3 paragraphs for continuing the conversation.`
      }],
      temperature: 0.1
    });
    
    return summary.choices[0].message.content;
  } catch (error) {
    console.error('Error creating conversation summary:', error);
    return 'Previous conversation covered various aspects of the report.';
  }
};

const rotateThreadWithReportType = async (oldThreadId, reportData, sessionId, reportType) => {
  try {
    console.log(`Rotating thread for ${reportType} session ${sessionId}`);
    
    const messages = await openai.beta.threads.messages.list(oldThreadId, { limit: 20 });
    const summary = await createConversationSummary(messages.data);
    
    const newThread = await openai.beta.threads.create();
    
    const context = reportType === 'marketing' 
      ? formatMarketingReportContext(reportData)
      : formatWebsiteAnalysisContext(reportData);
    
    const contextWithHistory = `I'm continuing our ${reportType} optimization discussion. Here's your ${reportType} analysis:

${context}

PREVIOUS CONVERSATION SUMMARY:
${summary}

I have full context of our previous discussion and your ${reportType} analysis. How can I help you continue optimizing your ${reportType} strategy?`;

    await openai.beta.threads.messages.create(newThread.id, {
      role: 'user',
      content: contextWithHistory
    });

    console.log(`${reportType} thread rotated from ${oldThreadId} to ${newThread.id}`);
    return newThread.id;
  } catch (error) {
    console.error('Error rotating thread:', error);
    throw error;
  }
};

const pollAndStreamV4 = async (res, threadId, runId, sessionId, messageOrder) => {
  let attempts = 0;
  const maxAttempts = 60;
  
  console.log(`V4 streaming: Starting for session ${sessionId}`);
  
  try {
    while (attempts < maxAttempts) {
      const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
      console.log(`V4 stream attempt ${attempts + 1}: ${runStatus.status}`);
      
      if (runStatus.status === 'completed') {
        console.log('V4 streaming: Run completed successfully');
        
        const messages = await openai.beta.threads.messages.list(threadId, {
          order: 'desc',
          limit: 1
        });
        
        const aiResponse = messages.data[0]?.content[0]?.text?.value || 'No response generated';
        
        console.log(`V4 streaming: AI response length: ${aiResponse.length}`);
        
        if (aiResponse.length === 0) {
          throw new Error('Empty response from AI');
        }
        
        // Stream response in chunks preserving formatting
        const chunkSize = 100;
        let sentLength = 0;
        
        while (sentLength < aiResponse.length) {
          let endIndex = Math.min(sentLength + chunkSize, aiResponse.length);
          
          // Find natural break points to preserve formatting
          if (endIndex < aiResponse.length) {
            const breakPoints = ['\n\n', '\n', '. ', '? ', '! ', ': ', ', '];
            for (const breakPoint of breakPoints) {
              const lastBreak = aiResponse.lastIndexOf(breakPoint, endIndex);
              if (lastBreak > sentLength) {
                endIndex = lastBreak + breakPoint.length;
                break;
              }
            }
          }
          
          const chunk = aiResponse.substring(sentLength, endIndex);
          res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
          
          sentLength = endIndex;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        
        // Store AI response in database
        const { data: storedAiMessage, error: aiMessageError } = await supabase
          .from('chat_messages')
          .insert({
            chat_session_id: sessionId,
            thread_id: threadId,
            role: 'assistant',
            content: aiResponse,
            message_order: messageOrder,
            metadata: { 
              ai_generated: true, 
              run_id: runId,
              response_length: aiResponse.length,
              api_version: 'v4'
            }
          })
          .select()
          .single();

        if (aiMessageError) {
          console.error('V4 streaming: Error storing AI message:', aiMessageError);
        } else {
          console.log('V4 streaming: AI message stored successfully:', storedAiMessage.id);
        }
        
        // Send completion signal
        console.log('V4 streaming: Sending [DONE] signal');
        res.write('data: [DONE]\n\n');
        
        try {
          res.end();
        } catch (endError) {
          console.log('V4 streaming: Response already ended');
        }
        
        return;
        
      } else if (runStatus.status === 'failed') {
        const errorMessage = runStatus.last_error?.message || 'OpenAI run failed';
        console.error('V4 streaming: Run failed:', errorMessage);
        throw new Error(errorMessage);
        
      } else if (runStatus.status === 'cancelled' || runStatus.status === 'expired') {
        console.error('V4 streaming: Run cancelled or expired');
        throw new Error(`Request ${runStatus.status}`);
        
      } else if (runStatus.status === 'requires_action') {
        console.log('V4 streaming: Run requires action, waiting...');
        // Handle tool calls if your assistant uses them
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Send progress updates
      if (attempts % 5 === 0) {
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          status: runStatus.status,
          message: 'AI is processing your request...' 
        })}\n\n`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    throw new Error('V4 streaming: Response timeout after 2 minutes');
    
  } catch (error) {
    console.error('V4 streaming error:', error);
    
    // Store error message
    try {
      const errorResponse = `I apologize, but I encountered an error while processing your request: ${error.message}. Please try asking your question again.`;
      
      await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: sessionId,
          thread_id: threadId,
          role: 'assistant',
          content: errorResponse,
          message_order: messageOrder,
          metadata: { 
            error: true, 
            error_details: error.message,
            api_version: 'v4'
          }
        });
        
      // Stream error message
      res.write(`data: ${JSON.stringify({ token: errorResponse })}\n\n`);
    } catch (dbError) {
      console.error('V4 streaming: Error storing error message:', dbError);
    }
    
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message,
      recoverable: true
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    
    try {
      res.end();
    } catch (endError) {
      console.log('V4 streaming: Response already ended');
    }
  }
};

// Poll for OpenAI Response Completion
const pollForCompletion = async (threadId, runId) => {
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 1
      });
      
      return messages.data[0]?.content[0]?.text?.value || 'No response generated';
    } else if (runStatus.status === 'failed') {
      throw new Error('OpenAI run failed: ' + runStatus.last_error?.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  
  throw new Error('Response timeout');
};



app.post('/api/chat-sessions/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Processing message for session: ${sessionId}, message: "${message}"`);

    // Get session info first
    const { data: chatSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !chatSession) {
      console.error('Session not found:', sessionError);
      return res.status(404).json({ error: 'Chat session not found' });
    }

    console.log(`Session found: ${chatSession.report_type} type`);

    // Get AI results
    const { data: aiResults, error: aiError } = await supabase
      .from('ai_results')
      .select('result_data, website_analysis')
      .eq('purchase_id', chatSession.purchase_id)
      .eq('status', 'completed')
      .single();

    if (aiError || !aiResults) {
      console.error('AI results not found:', aiError);
      return res.status(404).json({ error: 'Report data not found' });
    }

    // Get the appropriate report data
    const reportData = chatSession.report_type === 'marketing' 
      ? aiResults.result_data 
      : aiResults.website_analysis;

    if (!reportData) {
      console.error(`No ${chatSession.report_type} data found in AI results`);
      return res.status(404).json({ 
        error: `${chatSession.report_type} analysis data not available` 
      });
    }

    console.log(`Found ${chatSession.report_type} data, processing...`);

    // Get current conversation state
    const { data: latestMessage } = await supabase
      .from('chat_messages')
      .select('message_order, thread_id')
      .eq('chat_session_id', sessionId)
      .order('message_order', { ascending: false })
      .limit(1);

    const nextOrder = (latestMessage?.[0]?.message_order || 0) + 1;
    let currentThreadId = latestMessage?.[0]?.thread_id;

    // Create thread if this is the first message
    if (!currentThreadId) {
      console.log('No existing thread found, creating new OpenAI thread');
      
      try {
        const thread = await openai.beta.threads.create();
        currentThreadId = thread.id;
        console.log('Created new thread:', currentThreadId);
      } catch (threadError) {
        console.error('Error creating OpenAI thread:', threadError);
        return res.status(500).json({ error: 'Failed to create conversation thread' });
      }
    } else {
      // Check token limit for existing threads to prevent hitting OpenAI limits
      try {
        const shouldRotate = await checkTokenLimit(currentThreadId);
        if (shouldRotate) {
          console.log(`Token limit reached, rotating thread for ${chatSession.report_type} session ${sessionId}`);
          currentThreadId = await rotateThreadWithReportType(
            currentThreadId, 
            reportData, 
            sessionId, 
            chatSession.report_type
          );
        }
      } catch (tokenError) {
        console.warn('Token limit check failed, continuing with existing thread:', tokenError.message);
      }
    }

    // ENHANCED CONTEXT DETECTION: Better intent analysis
    const detectMessageIntent = (msg) => {
      const trimmed = msg.trim().toLowerCase();
      
      // Simple greetings and acknowledgments - exact matches only
      const simplePatterns = [
        /^(hi|hello|hey)$/,
        /^(thanks?( you)?|thank you)$/,
        /^(ok|okay|got it|understood|alright)$/,
        /^(yes|no|yep|nope|sure)$/,
        /^(good|great|nice|awesome|perfect|cool)$/,
        /^(bye|goodbye|see you|talk later)$/
      ];
      
      // Check if it's a simple greeting/acknowledgment
      if (simplePatterns.some(pattern => pattern.test(trimmed))) {
        return 'greeting';
      }
      
      // Business/strategy question indicators - these always get full context
      const businessIndicators = [
        'what', 'how', 'when', 'where', 'why', 'which', 'who',
        'should i', 'can i', 'could i', 'would you', 'do you recommend',
        'help me', 'advice', 'suggest', 'recommend', 'think about',
        'improve', 'fix', 'optimize', 'increase', 'boost', 'grow',
        'strategy', 'plan', 'budget', 'roi', 'revenue', 'profit',
        'conversion', 'traffic', 'leads', 'customers', 'sales',
        'seo', 'marketing', 'website', 'brand', 'content', 'social media',
        'analytics', 'performance', 'results', 'metrics', 'kpi',
        'competitor', 'audience', 'target', 'campaign', 'ad', 'advertising',
        'email', 'newsletter', 'blog', 'landing page', 'funnel'
      ];
      
      const hasBusinessIndicator = businessIndicators.some(indicator => 
        trimmed.includes(indicator)
      );
      
      // Has question mark = likely a real question
      const isQuestion = trimmed.includes('?');
      
      // Longer messages are usually substantive
      const isLongMessage = trimmed.length > 15;
      
      // Command-like requests (imperative mood)
      const commandPatterns = [
        /^(tell me|show me|explain|give me|provide|create|make|build)/,
        /^(analyze|review|assess|evaluate|check|look at)/
      ];
      
      const isCommand = commandPatterns.some(pattern => pattern.test(trimmed));
      
      if (hasBusinessIndicator || isQuestion || isLongMessage || isCommand) {
        return 'substantive';
      }
      
      // For very short unclear messages, be conversational
      return 'conversational';
    };

    const messageIntent = detectMessageIntent(message);
    console.log(`Message intent detected: ${messageIntent} for message: "${message}"`);
    
    let messageToSend;
    let instructions;
    
    if (messageIntent === 'greeting') {
      // Pure greetings - minimal context
      messageToSend = `You are a friendly ${chatSession.report_type} optimization expert helping a client named ${aiResults.company_name || 'the user'}. 
      
User message: ${message}

Please respond naturally and conversationally. Ask how you can help with their ${chatSession.report_type} strategy today.`;

      instructions = "Be friendly and conversational. Ask how you can help with their strategy.";
      
    } else if (messageIntent === 'conversational') {
      // Conversational but not greeting - light context with basic info
      messageToSend = `You are a ${chatSession.report_type} optimization expert. You've been helping a client named ${aiResults.company_name || 'the user'} with their ${chatSession.report_type} strategy. You have access to their detailed analysis data.
      
User message: ${message}

Please respond conversationally. If they seem to want specific advice, ask what aspect of their ${chatSession.report_type} they'd like to discuss, or offer to look at their analysis data.`;

      instructions = "Be conversational and helpful. If they want specific advice, offer to analyze their data.";
      
    } else {
      // Substantive questions - full context
      const context = chatSession.report_type === 'marketing' 
        ? formatMarketingReportContext(reportData)
        : formatWebsiteAnalysisContext(reportData);

      messageToSend = `You are a ${chatSession.report_type} optimization expert. Here's the client's complete analysis:

${context}

User question: ${message}

Please provide specific, actionable advice based on the analysis data above. Format your response with ### headers, **bold text**, and numbered lists for clarity.`;

      instructions = `Provide detailed, well-formatted advice with clear structure. Use ### for headers, **bold** for emphasis, and numbered lists for steps. Reference specific data from their ${chatSession.report_type} analysis.`;
    }

    // Store user message with valid thread_id
    const { data: storedUserMessage, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        chat_session_id: sessionId,
        thread_id: currentThreadId,
        role: 'user',
        content: message,
        message_order: nextOrder,
        metadata: { 
          user_initiated: true,
          report_type: chatSession.report_type,
          message_intent: messageIntent,
          context_level: messageIntent === 'greeting' ? 'minimal' : messageIntent === 'conversational' ? 'light' : 'full',
          message_length: message.length
        }
      })
      .select()
      .single();

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
      return res.status(500).json({ error: 'Failed to store user message' });
    }

    console.log(`User message stored with ${messageIntent} intent:`, storedUserMessage.id);

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Accel-Buffering': 'no'
    });

    res.write(`data: ${JSON.stringify({ 
      type: 'user_message_stored', 
      message_id: storedUserMessage.id,
      chat_session_id: sessionId,
      intent: messageIntent,
      context_level: messageIntent === 'greeting' ? 'minimal' : messageIntent === 'conversational' ? 'light' : 'full'
    })}\n\n`);

    try {
      // Send the contextually appropriate message to OpenAI
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: messageToSend
      });

      // Create run with appropriate instructions
      const run = await openai.beta.threads.runs.create(currentThreadId, {
        assistant_id: chatSession.assistant_id,
        instructions: instructions
      });

      console.log(`OpenAI run created: ${run.id} (intent: ${messageIntent}, context: ${messageIntent === 'greeting' ? 'minimal' : messageIntent === 'conversational' ? 'light' : 'full'})`);

      // Stream response
      await pollAndStreamV4(res, currentThreadId, run.id, sessionId, nextOrder + 1);

    } catch (aiError) {
      console.error('Error processing AI response:', aiError);
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Failed to generate AI response',
        details: aiError.message,
        recoverable: true
      })}\n\n`);
      res.write('data: [DONE]\n\n');
    }

    // Update session timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

  } catch (error) {
    console.error('Error in message processing:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error.message,
        fatal: true
      })}\n\n`);
      res.write('data: [DONE]\n\n');
    }
  }
});



// 3. GET CHAT HISTORY (UNIFIED ACROSS ALL THREADS)
app.get('/api/chat-sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session } = await supabase
      .from('chat_sessions')
      .select('report_type, session_name')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_session_id', sessionId)
      .order('message_order', { ascending: true });

    if (error) throw error;

    // FIXED: Don't filter out any messages - show ALL conversation history
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      messageOrder: msg.message_order,
      metadata: msg.metadata
    }));

    console.log(`Retrieved ${formattedMessages.length} messages for session ${sessionId}`);

    res.json({
      messages: formattedMessages,
      session_info: {
        report_type: session.report_type,
        session_name: session.session_name
      }
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET ALL CHAT SESSIONS FOR A PURCHASE
app.get('/api/chat-sessions', async (req, res) => {
  try {
    const { purchase_id } = req.query;

    if (!purchase_id) {
      return res.status(400).json({ error: 'purchase_id is required' });
    }

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('purchase_id', purchase_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      name: session.session_name,
      report_type: session.report_type,
      created_at: session.created_at,
      updated_at: session.updated_at
    }));

    // Group by report type
    const groupedSessions = {
      marketing: formattedSessions.filter(s => s.report_type === 'marketing'),
      website: formattedSessions.filter(s => s.report_type === 'website'),
      all: formattedSessions
    };

    res.json(groupedSessions);

  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: error.message });
  }
});
// 5. GET DYNAMIC SUGGESTED QUESTIONS FROM REPORT DATA
app.get('/api/chat-sessions/suggested-questions/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { report_type = 'marketing' } = req.query;

    const reportColumn = report_type === 'marketing' ? 'result_data' : 'website_analysis';
    
    const { data: aiResult, error } = await supabase
      .from('ai_results')
      .select(`${reportColumn}`)
      .eq('purchase_id', purchaseId)
      .eq('status', 'completed')
      .single();

    if (error || !aiResult) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportData = aiResult[reportColumn];
    let suggestedQuestions = [];
    
    if (reportData?.follow_up && Array.isArray(reportData.follow_up)) {
      suggestedQuestions = reportData.follow_up;
    } else {
      // Fallback questions
      const defaults = {
        marketing: [
          "What are my biggest marketing priorities right now?",
          "How should I allocate my marketing budget for maximum ROI?",
          "What tools do you recommend I implement first?"
        ],
        website: [
          "What website issues should I fix first?",
          "How can I improve my website's conversion rate?",
          "What SEO improvements would have the biggest impact?"
        ]
      };
      suggestedQuestions = defaults[report_type] || defaults.marketing;
    }

    res.json({
      questions: suggestedQuestions,
      report_type: report_type
    });

  } catch (error) {
    console.error('Error fetching suggested questions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function - add this near your other helper functions
function getAssistantIdForReportType(reportType) {
  switch (reportType) {
    case 'marketing':
      return process.env.OPENAI_MARKETING_CHAT_ASSISTANT_ID;
    case 'website':
      return process.env.OPENAI_WEBSITE_CHAT_ASSISTANT_ID;
    default:
      return process.env.OPENAI_MARKETING_CHAT_ASSISTANT_ID;
  }
}

// Add the streaming handler
const pollAndStreamWithStorage = async (res, threadId, runId, sessionId, messageOrder) => {
  let attempts = 0;
  const maxAttempts = 30;
  let fullResponse = '';
  let streamCompleted = false;
  
  console.log(`Starting poll and stream for session ${sessionId}, thread ${threadId}, run ${runId}`);
  
  try {
    while (attempts < maxAttempts && !streamCompleted) {
      const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
      console.log(`Poll attempt ${attempts + 1}, run status: ${runStatus.status}`);
      
      if (runStatus.status === 'completed') {
        console.log('OpenAI run completed successfully');
        
        const messages = await openai.beta.threads.messages.list(threadId, {
          order: 'desc',
          limit: 1
        });
        
        const aiResponse = messages.data[0]?.content[0]?.text?.value || 'No response generated';
        fullResponse = aiResponse;
        
        console.log(`AI response length: ${aiResponse.length}`);
        
        if (aiResponse.length === 0) {
          throw new Error('Empty response from AI');
        }
        
        // Stream the response preserving formatting
        const chunkSize = 100; // Larger chunks to preserve formatting
        let sentLength = 0;
        
        while (sentLength < aiResponse.length) {
          let endIndex = Math.min(sentLength + chunkSize, aiResponse.length);
          
          // Try to break at word boundaries to preserve formatting
          if (endIndex < aiResponse.length) {
            // Look for natural break points (space, newline, punctuation)
            const breakPoints = ['\n\n', '\n', '. ', '? ', '! ', ', ', ' '];
            let bestBreak = endIndex;
            
            for (const breakPoint of breakPoints) {
              const lastBreak = aiResponse.lastIndexOf(breakPoint, endIndex);
              if (lastBreak > sentLength) {
                bestBreak = lastBreak + breakPoint.length;
                break;
              }
            }
            endIndex = bestBreak;
          }
          
          const chunk = aiResponse.substring(sentLength, endIndex);
          res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
          
          sentLength = endIndex;
          
          // Add small delay for streaming effect, but faster for better UX
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        // CRITICAL: Store AI response in database BEFORE sending [DONE]
        const { data: storedAiMessage, error: aiMessageError } = await supabase
          .from('chat_messages')
          .insert({
            chat_session_id: sessionId,
            thread_id: threadId,
            role: 'assistant',
            content: aiResponse,
            message_order: messageOrder,
            metadata: { 
              ai_generated: true, 
              run_id: runId,
              response_length: aiResponse.length,
              streaming_completed: true
            }
          })
          .select()
          .single();

        if (aiMessageError) {
          console.error('Error storing AI message:', aiMessageError);
          res.write(`data: ${JSON.stringify({ 
            type: 'warning', 
            message: 'Response generated but not saved to database' 
          })}\n\n`);
        } else {
          console.log('AI message stored successfully:', storedAiMessage.id);
        }
        
        // CRITICAL: Always send [DONE] signal to complete the stream
        console.log('Sending [DONE] signal to complete stream');
        res.write('data: [DONE]\n\n');
        
        // CRITICAL: End the response stream properly
        try {
          res.end();
        } catch (endError) {
          console.log('Response already ended:', endError.message);
        }
        
        streamCompleted = true;
        console.log('Streaming completed successfully');
        return;
        
      } else if (runStatus.status === 'failed') {
        const errorMessage = runStatus.last_error?.message || 'OpenAI run failed';
        console.error('OpenAI run failed:', errorMessage);
        throw new Error(errorMessage);
        
      } else if (runStatus.status === 'cancelled') {
        console.error('OpenAI run was cancelled');
        throw new Error('Request was cancelled');
        
      } else if (runStatus.status === 'expired') {
        console.error('OpenAI run expired');
        throw new Error('Request expired');
        
      } else {
        // Still in progress - send a progress indicator occasionally
        if (attempts % 5 === 0) {
          res.write(`data: ${JSON.stringify({ 
            type: 'progress', 
            status: runStatus.status,
            message: 'AI is analyzing your request...' 
          })}\n\n`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    // If we reach here, we've exceeded max attempts or something went wrong
    if (!streamCompleted) {
      console.error('AI response timeout after', maxAttempts, 'attempts');
      throw new Error('AI response timeout - please try again');
    }
    
  } catch (error) {
    console.error('Error in pollAndStreamWithStorage:', error);
    
    // Try to store error message if we haven't stored anything yet
    try {
      const { data: existingMessages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_session_id', sessionId)
        .eq('message_order', messageOrder)
        .limit(1);
        
      if (!existingMessages || existingMessages.length === 0) {
        const errorResponse = `Sorry, I encountered an error while processing your request: ${error.message}. Please try asking your question again.`;
        
        await supabase
          .from('chat_messages')
          .insert({
            chat_session_id: sessionId,
            thread_id: threadId,
            role: 'assistant',
            content: errorResponse,
            message_order: messageOrder,
            metadata: { 
              error: true, 
              error_details: error.message,
              error_type: 'processing_error'
            }
          });
          
        // Stream the error message
        const words = errorResponse.split(' ');
        for (let i = 0; i < words.length; i += 3) {
          const chunk = words.slice(i, i + 3).join(' ') + ' ';
          res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (dbError) {
      console.error('Error storing error message:', dbError);
    }
    
    // Always send error and completion signals
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message,
      recoverable: true
    })}\n\n`);
    
    res.write('data: [DONE]\n\n');
    
    try {
      res.end();
    } catch (endError) {
      console.log('Response already ended:', endError.message);
    }
  }
};

// 6. DELETE/ARCHIVE CHAT SESSION
app.delete('/api/chat-sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Soft delete - mark as inactive
    const { error } = await supabase
      .from('chat_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) throw error;

    res.json({ success: true, message: 'Chat session archived' });

  } catch (error) {
    console.error('Error archiving chat session:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. GET REPORT SUMMARY (FOR DEBUGGING/ADMIN)
app.get('/api/reports/:purchaseId/summary', async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const { data: aiResult, error } = await supabase
      .from('ai_results')
      .select('result_data, website_analysis, status, created_at')
      .eq('purchase_id', purchaseId)
      .single();

    if (error || !aiResult) {
      return res.status(404).json({ error: 'Reports not found' });
    }

    const summary = {
      purchase_id: purchaseId,
      status: aiResult.status,
      created_at: aiResult.created_at,
      reports_available: {
        marketing: !!aiResult.result_data,
        website: !!aiResult.website_analysis
      }
    };

    // Extract follow_up questions from both reports if available
    if (aiResult.result_data?.follow_up) {
      summary.marketing_questions = aiResult.result_data.follow_up;
    }
    if (aiResult.website_analysis?.follow_up) {
      summary.website_questions = aiResult.website_analysis.follow_up;
    }

    res.json(summary);

  } catch (error) {
    console.error('Error fetching report summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed session info (for debugging)
app.get('/api/admin/chat-sessions/:sessionId/debug', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        chat_messages(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Group messages by thread_id to see thread rotation
    const threadGroups = {};
    session.chat_messages.forEach(msg => {
      if (!threadGroups[msg.thread_id]) {
        threadGroups[msg.thread_id] = [];
      }
      threadGroups[msg.thread_id].push(msg);
    });

    res.json({
      session_info: {
        id: session.id,
        report_type: session.report_type,
        assistant_id: session.assistant_id,
        created_at: session.created_at,
        updated_at: session.updated_at
      },
      thread_rotation_info: {
        total_threads: Object.keys(threadGroups).length,
        threads: Object.keys(threadGroups).map(threadId => ({
          thread_id: threadId,
          message_count: threadGroups[threadId].length,
          first_message_order: Math.min(...threadGroups[threadId].map(m => m.message_order)),
          last_message_order: Math.max(...threadGroups[threadId].map(m => m.message_order))
        }))
      },
      total_messages: session.chat_messages.length
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old sessions (for maintenance)
app.post('/api/admin/cleanup-sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('archive_old_chat_sessions');

    if (error) throw error;

    res.json({ 
      success: true, 
      archived_sessions: data,
      message: `Archived ${data} old chat sessions` 
    });

  } catch (error) {
    console.error('Error in cleanup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this debugging endpoint to your server to identify the issue

app.get('/api/debug/chat-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('Debugging session:', sessionId);
    
    // Check if session exists at all
    const { data: sessionExists, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId);
      
    console.log('Session query result:', { sessionExists, sessionError });
    
    if (sessionError) {
      return res.json({ 
        error: 'Session query failed', 
        details: sessionError,
        step: 'session_lookup'
      });
    }
    
    if (!sessionExists || sessionExists.length === 0) {
      return res.json({ 
        error: 'Session does not exist in database',
        step: 'session_existence_check'
      });
    }
    
    const session = sessionExists[0];
    
    // Check if session is active
    if (!session.is_active) {
      return res.json({
        error: 'Session is inactive',
        session: session,
        step: 'session_active_check'
      });
    }
    
    // Check if ai_results exists for this purchase
    const { data: aiResults, error: aiError } = await supabase
      .from('ai_results')
      .select('*')
      .eq('purchase_id', session.purchase_id);
      
    console.log('AI results query:', { aiResults, aiError });
    
    if (aiError) {
      return res.json({
        error: 'AI results query failed',
        details: aiError,
        session: session,
        step: 'ai_results_lookup'
      });
    }
    
    if (!aiResults || aiResults.length === 0) {
      return res.json({
        error: 'No AI results found for this purchase',
        session: session,
        step: 'ai_results_existence_check'
      });
    }
    
    const aiResult = aiResults[0];
    
    // Check if the required report data exists
    const reportColumn = session.report_type === 'marketing' ? 'result_data' : 'website_analysis';
    const reportData = aiResult[reportColumn];
    
    if (!reportData) {
      return res.json({
        error: `${session.report_type} report data not found`,
        session: session,
        aiResult: {
          ...aiResult,
          result_data: !!aiResult.result_data,
          website_analysis: !!aiResult.website_analysis
        },
        step: 'report_data_check'
      });
    }
    
    // All good!
    res.json({
      status: 'success',
      message: 'Session and data found successfully',
      session: session,
      aiResult: {
        id: aiResult.id,
        status: aiResult.status,
        has_result_data: !!aiResult.result_data,
        has_website_analysis: !!aiResult.website_analysis
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.json({ 
      error: 'Debug endpoint failed', 
      details: error.message,
      step: 'debug_endpoint_error'
    });
  }
});

// Also add this endpoint to check if tables exist
app.get('/api/debug/tables-status', async (req, res) => {
  try {
    console.log('Checking database tables...');
    
    // Test each table
    const tableTests = {};
    
    // Test chat_sessions table
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('count')
        .limit(1);
      tableTests.chat_sessions = error ? `Error: ${error.message}` : 'OK';
    } catch (e) {
      tableTests.chat_sessions = `Exception: ${e.message}`;
    }
    
    // Test chat_messages table  
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('count')
        .limit(1);
      tableTests.chat_messages = error ? `Error: ${error.message}` : 'OK';
    } catch (e) {
      tableTests.chat_messages = `Exception: ${e.message}`;
    }
    
    // Test ai_results table
    try {
      const { data, error } = await supabase
        .from('ai_results')
        .select('count')
        .limit(1);
      tableTests.ai_results = error ? `Error: ${error.message}` : 'OK';
    } catch (e) {
      tableTests.ai_results = `Exception: ${e.message}`;
    }
    
    // Test purchases table
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('count')
        .limit(1);
      tableTests.purchases = error ? `Error: ${error.message}` : 'OK';
    } catch (e) {
      tableTests.purchases = `Exception: ${e.message}`;
    }
    
    res.json({
      tables: tableTests,
      supabase_url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
      supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check tables', 
      details: error.message 
    });
  }
});



// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ========================================
// SERVER STARTUP
// ========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Configuration checks
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables');
  } else {
    console.log('✅ Stripe configured successfully');
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  Supabase configuration incomplete');
  } else {
    console.log('✅ Supabase configured successfully');
  }

  if (!process.env.CATALYST_AI_API_URL) {
    console.warn('⚠️  CATALYST_AI_API_URL not configured - AI analysis will not work');
  } else {
    console.log('✅ Catalyst AI API configured');
  }
});
