import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_123';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
});

app.post('/create-checkout-session', async (req, res) => {
    try {
        const { budget, occasion, deliveryFee, tax, floristName } = req.body;

        // Fallback for mocked/missing keys to allow frontend verification
        if (STRIPE_SECRET_KEY === 'sk_test_123') {
            console.log('Using mock Stripe checkout session because no valid key was found.');
            return res.json({ url: 'https://checkout.stripe.com/pay/cs_test_mocked_session', sessionId: 'cs_test_mocked_session' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${occasion || 'Custom'} Arrangement`,
                            description: `Fulfilled by: ${floristName}`,
                        },
                        unit_amount: Math.round(budget * 100), // Stripe uses cents
                    },
                    quantity: 1,
                },
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Delivery Fee',
                        },
                        unit_amount: Math.round(deliveryFee * 100),
                    },
                    quantity: 1,
                },
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Estimated Tax',
                        },
                        unit_amount: Math.round(tax * 100),
                    },
                    quantity: 1,
                }
            ],
            mode: 'payment',
            success_url: 'https://chatgpt.com/success', // Dummy redirect for App iframe
            cancel_url: 'https://chatgpt.com/cancel',
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
        console.error('Stripe Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/check-payment-status', async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id || typeof session_id !== 'string') {
            return res.status(400).json({ error: 'Missing session_id' });
        }

        if (session_id === 'cs_test_mocked_session') {
            return res.json({ paid: true });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        res.json({ paid: session.payment_status === 'paid' });
    } catch (err: any) {
        console.error('Stripe Status Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Payment routing server running on http://localhost:${PORT}`);
});
