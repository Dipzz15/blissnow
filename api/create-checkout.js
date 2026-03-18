import supabase from './_supabase.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { user_id, type, tier, credits } = req.body;

    if (!user_id) return res.status(400).json({ error: 'User ID required' });

    // Get or create customer
    let { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const { data: user } = await supabase.auth.admin.getUserById(user_id); // but service role
      // For demo, skip actual, use placeholder
      customerId = `cus_demo_${user_id.slice(0,8)}`;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user_id);
    }

    let session;
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?success=true`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/membership?cancelled=true`;

    if (type === 'membership') {
      // Subscription for tier
      const prices = {
        'Essentials': 4900,
        'Wellness': 8900,
        'Premium': 14900,
        'Unlimited': 24900,
      };
      const price = prices[tier] || 4900;

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tier} Membership`,
              description: 'Monthly holistic health membership with credits',
            },
            unit_amount: price,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { user_id, tier },
      });
    } else if (type === 'credits') {
      // One-time credit pack
      const creditPrices = { 2: 24, 5: 55, 10: 100, 15: 140, 20: 180, 30: 270 }; // volume discount approx
      const amount = (creditPrices[credits] || credits * 12) * 100;

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} Credits Pack`,
              description: 'Add credits to your BlissNow wallet',
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { user_id, credits, type: 'credits' },
      });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}
