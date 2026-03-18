import supabase from './_supabase.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const user_id = session.metadata.user_id;
      const tier = session.metadata.tier;
      const credits = parseInt(session.metadata.credits || 0);

      if (session.mode === 'subscription' && tier) {
        // Update membership
        await supabase
          .from('profiles')
          .update({
            membership_tier: tier,
            membership_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            credits: supabase.raw(`credits + 10`) // example starter credits
          })
          .eq('id', user_id);
      } else if (session.mode === 'payment' && credits > 0) {
        // Add credits
        await supabase
          .from('profiles')
          .update({ credits: supabase.raw(`credits + ${credits}`) })
          .eq('id', user_id);
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      // For recurring, renew credits
      const subscription = event.data.object.subscription;
      // Find user etc, update credits
      // For demo, skip detailed
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: err.message });
  }
}
