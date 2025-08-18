# Revyn Marketing AI Audit App

A comprehensive marketing audit platform powered by AI that helps businesses analyze their marketing performance and get actionable insights.

## Features

- **AI-Powered Audits**: Comprehensive 80-question marketing audit with AI-generated insights
- **Multiple Report Types**: Marketing, Sales, Financial, Operations, and HR audits
- **Stripe Integration**: Secure payment processing for premium reports
- **Interactive Chat**: AI-powered chat interface to discuss results
- **Responsive Design**: Beautiful, mobile-friendly interface

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Stripe Configuration

1. Create a Stripe account at [https://stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Create a `.env` file in the root directory:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 3. Backend Setup (Required for Production)

For production use, you'll need to create a backend API to handle Stripe payments securely. Create an endpoint at `/api/create-payment-intent` that:

1. Accepts payment data (amount, currency, metadata)
2. Creates a Stripe PaymentIntent using your secret key
3. Returns the client_secret to the frontend

Example backend endpoint (Node.js/Express):

```javascript
app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, currency, reportIds, customerEmail, customerName, metadata } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer_email: customerEmail,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});
```

### 4. Development Mode

For development, the app includes fallback simulation for payment processing when the backend is not available. The payment flow will simulate successful transactions for testing purposes.

**Test Card Information:**
- Card Number: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits
- Postal Code: Any valid postal code
```bash
npm run dev
```

## Project Structure

```
src/
├── components/          # React components
├── services/           # Business logic and API services
├── types/              # TypeScript type definitions
├── data/               # Static data and configurations
├── config/             # Configuration files
└── contexts/           # React contexts
```

## Key Components

- **ReportsDashboard**: Main dashboard for report selection and management
- **PaymentFlow**: Stripe-integrated payment processing
- **ReportViewer**: Display generated reports with interactive features
- **ChatInterface**: AI-powered chat for discussing results
- **AuditForm**: Multi-step form for collecting audit data

## Payment Flow

1. User selects reports or bundle
2. Stripe Elements collects payment information securely
3. PaymentIntent is created via backend API
4. Payment is confirmed using Stripe's confirmPayment
5. User is redirected to success page
6. Reports are generated and made available

## Security Notes

- Never expose your Stripe secret key in frontend code
- Always validate payments on your backend
- Use HTTPS in production
- Implement proper error handling and logging

## Deployment

1. Set up your backend API with Stripe integration
2. Configure environment variables for production
3. Deploy frontend and backend to your preferred hosting platform
4. Update Stripe webhook endpoints if using webhooks

## Support

For questions about Stripe integration, visit: https://bolt.new/setup/stripe