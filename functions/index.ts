import * as functions from 'firebase-functions';
import Stripe from 'stripe';

const stripe = new Stripe(functions.config().stripe.secret_key, { apiVersion: '2024-06-20' }); // Use latest version

export const createSubscription = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { userId, email, amount } = req.body;

  try {
    // Create or retrieve customer
    let customer = await stripe.customers.create({ email, metadata: { firebaseUID: userId } });

    // Create subscription (recurring)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: 'price_YourMonthlyPriceIdHere' }], // Create prices in Stripe dashboard: e.g. $5/month
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    res.json({
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: (error as Error).message });
  }
});
