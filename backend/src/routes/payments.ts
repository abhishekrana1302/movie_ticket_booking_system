import express from 'express';
import Stripe from 'stripe';
import Joi from 'joi';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';
import { io } from '../server';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const createPaymentIntentSchema = Joi.object({
  bookingId: Joi.string().uuid().required()
});

// Create payment intent
router.post('/create-intent', async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = createPaymentIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { bookingId } = value;
    const userId = req.userId!;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        showtimes (
          movies (title),
          theaters (name)
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found or not pending' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        userId: userId
      },
      description: `Movie ticket booking - ${booking.showtimes.movies.title} at ${booking.showtimes.theaters.name}`
    });

    // Save payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert([{
        booking_id: booking.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: booking.total_amount,
        payment_status: 'pending'
      }]);

    if (paymentError) throw paymentError;

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    next(error);
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const sig = req.headers['stripe-signature']!;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { bookingId, userId } = paymentIntent.metadata;

        console.log(`Payment succeeded for booking ${bookingId}`);

        // Update payment status
        const { error: paymentUpdateError } = await supabase
          .from('payments')
          .update({
            payment_status: 'completed',
            payment_date: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (paymentUpdateError) throw paymentUpdateError;

        // Update booking status
        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({ status: 'paid' })
          .eq('id', bookingId);

        if (bookingUpdateError) throw bookingUpdateError;

        // Get booking details for seat confirmation
        const { data: bookingSeats, error: seatsError } = await supabase
          .from('booking_seats')
          .select('seat_id, showtime_id')
          .eq('booking_id', bookingId);

        if (seatsError) throw seatsError;

        // Remove seat locks and notify via socket
        if (bookingSeats && bookingSeats.length > 0) {
          const showtimeId = bookingSeats[0].showtime_id;
          const seatIds = bookingSeats.map(bs => bs.seat_id);

          // Remove locks
          await supabase
            .from('seat_locks')
            .delete()
            .in('seat_id', seatIds)
            .eq('user_id', userId);

          // Notify all users in showtime that seats are now permanently booked
          io.to(`showtime-${showtimeId}`).emit('seats-booked', {
            seatIds,
            bookingId
          });
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed for payment intent ${paymentIntent.id}`);

        // Update payment status
        await supabase
          .from('payments')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // You might want to release seat locks here if payment fails
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
});

export default router;