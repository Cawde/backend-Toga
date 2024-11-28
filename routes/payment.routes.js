const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
   
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
   
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        
        await db.query(
          `INSERT INTO payments (
            user_id,
            amount,
            status,
            stripe_payment_intent_id
          ) VALUES ($1, $2, $3, $4)`,
          [
            paymentIntent.metadata.user_id,
            paymentIntent.amount,
            'succeeded',
            paymentIntent.id
          ]
        );
   
        if (paymentIntent.metadata.item_id) {
          await db.query(
            `UPDATE clothing_items 
             SET is_available_for_rent = $1, 
                 is_available_for_sale = $1
             WHERE id = $2`,
            [false, paymentIntent.metadata.item_id]
          );
   
          await db.query(
            `INSERT INTO transactions (
              item_id,
              buyer_id,
              seller_id,
              transaction_type,
              status,
              price
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              paymentIntent.metadata.item_id,
              paymentIntent.metadata.user_id,
              paymentIntent.metadata.seller_id,
              paymentIntent.metadata.transaction_type, // 'rental' or 'purchase'
              'completed',
              paymentIntent.amount / 100 // Convert from cents to dollars
            ]
          );
        }
      }
   
      res.json({received: true});
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
   });
   
   router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    try {
      const { amount, item_id, seller_id, transaction_type } = req.body;
   
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        metadata: {
          user_id: req.user.id,
          item_id: item_id,
          seller_id: seller_id,
          transaction_type: transaction_type
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
   
      res.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
   });
module.exports = router;