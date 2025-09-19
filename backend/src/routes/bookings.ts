import express from 'express';
import Joi from 'joi';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

const createBookingSchema = Joi.object({
  showtimeId: Joi.string().uuid().required(),
  seatIds: Joi.array().items(Joi.string().uuid()).min(1).max(10).required(),
  totalAmount: Joi.number().positive().required()
});

// Create booking
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = createBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { showtimeId, seatIds, totalAmount } = value;
    const userId = req.userId!;

    // Verify showtime exists
    const { data: showtime, error: showtimeError } = await supabase
      .from('showtimes')
      .select('*')
      .eq('id', showtimeId)
      .single();

    if (showtimeError || !showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    // Check if seats are available (not booked and user has locks on them)
    const { data: seatLocks, error: locksError } = await supabase
      .from('seat_locks')
      .select('seat_id')
      .eq('showtime_id', showtimeId)
      .eq('user_id', userId)
      .in('seat_id', seatIds);

    if (locksError) throw locksError;

    if (!seatLocks || seatLocks.length !== seatIds.length) {
      return res.status(400).json({ 
        error: 'Some seats are not locked by you or unavailable' 
      });
    }

    // Check if any seats are already booked
    const { data: bookedSeats, error: bookedError } = await supabase
      .from('booking_seats')
      .select(`
        seat_id,
        bookings!inner (
          status
        )
      `)
      .eq('showtime_id', showtimeId)
      .in('seat_id', seatIds)
      .in('bookings.status', ['confirmed', 'paid']);

    if (bookedError) throw bookedError;

    if (bookedSeats && bookedSeats.length > 0) {
      return res.status(400).json({ 
        error: 'Some seats are already booked' 
      });
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        user_id: userId,
        showtime_id: showtimeId,
        total_amount: totalAmount,
        booking_date: new Date().toISOString(),
        status: 'pending'
      }])
      .select('*')
      .single();

    if (bookingError) throw bookingError;

    // Create booking seats
    const bookingSeatsData = seatIds.map((seatId: string) => ({
      booking_id: booking.id,
      seat_id: seatId,
      showtime_id: showtimeId
    }));

    const { error: bookingSeatsError } = await supabase
      .from('booking_seats')
      .insert(bookingSeatsData);

    if (bookingSeatsError) {
      // Rollback booking if seats insertion fails
      await supabase.from('bookings').delete().eq('id', booking.id);
      throw bookingSeatsError;
    }

    // Get full booking details
    const { data: fullBooking, error: fullBookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        showtimes (
          show_date,
          show_time,
          price,
          movies (title, poster_url),
          theaters (name, location)
        ),
        booking_seats (
          seats (row_number, seat_number, seat_type)
        )
      `)
      .eq('id', booking.id)
      .single();

    if (fullBookingError) throw fullBookingError;

    res.status(201).json({
      message: 'Booking created successfully',
      booking: fullBooking
    });

  } catch (error) {
    next(error);
  }
});

// Get user's bookings
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        showtimes (
          show_date,
          show_time,
          price,
          movies (title, poster_url, duration),
          theaters (name, location)
        ),
        booking_seats (
          seats (row_number, seat_number, seat_type)
        )
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: false });

    if (error) throw error;

    res.json({ bookings });

  } catch (error) {
    next(error);
  }
});

// Get booking by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        showtimes (
          show_date,
          show_time,
          price,
          movies (title, poster_url, duration, genre, rating),
          theaters (name, location, address)
        ),
        booking_seats (
          seats (row_number, seat_number, seat_type)
        ),
        payments (
          amount,
          payment_status,
          stripe_payment_intent_id,
          payment_date
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });

  } catch (error) {
    next(error);
  }
});

export default router;