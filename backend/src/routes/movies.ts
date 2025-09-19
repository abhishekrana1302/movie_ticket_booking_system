import express from 'express';
import { supabase } from '../utils/supabase';

const router = express.Router();

// Get all movies
router.get('/', async (req, res, next) => {
  try {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ movies });

  } catch (error) {
    next(error);
  }
});

// Get movie by ID with showtimes
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (movieError || !movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Get showtimes for this movie
    const { data: showtimes, error: showtimesError } = await supabase
      .from('showtimes')
      .select(`
        id,
        show_date,
        show_time,
        price,
        theaters (
          id,
          name,
          location,
          total_seats
        )
      `)
      .eq('movie_id', id)
      .gte('show_date', new Date().toISOString().split('T')[0])
      .order('show_date', { ascending: true })
      .order('show_time', { ascending: true });

    if (showtimesError) throw showtimesError;

    res.json({ movie, showtimes });

  } catch (error) {
    next(error);
  }
});

// Get available seats for a showtime
router.get('/showtimes/:showtimeId/seats', async (req, res, next) => {
  try {
    const { showtimeId } = req.params;

    // Get showtime details
    const { data: showtime, error: showtimeError } = await supabase
      .from('showtimes')
      .select(`
        id,
        theaters (
          id,
          name,
          total_seats
        )
      `)
      .eq('id', showtimeId)
      .single();

    if (showtimeError || !showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    // Get theater layout (seats)
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select('*')
      .eq('theater_id', showtime.theaters.id)
      .order('row_number', { ascending: true })
      .order('seat_number', { ascending: true });

    if (seatsError) throw seatsError;

    // Get booked seats for this showtime
    const { data: bookedSeats, error: bookedError } = await supabase
      .from('booking_seats')
      .select(`
        seat_id,
        bookings!inner (
          status
        )
      `)
      .eq('showtime_id', showtimeId)
      .in('bookings.status', ['confirmed', 'paid']);

    if (bookedError) throw bookedError;

    // Get temporarily locked seats
    const { data: lockedSeats, error: lockedError } = await supabase
      .from('seat_locks')
      .select('seat_id, locked_until, user_id')
      .eq('showtime_id', showtimeId)
      .gt('locked_until', new Date().toISOString());

    if (lockedError) throw lockedError;

    // Mark seat status
    const seatStatus = seats.map(seat => {
      const isBooked = bookedSeats?.some(bs => bs.seat_id === seat.id);
      const lock = lockedSeats?.find(ls => ls.seat_id === seat.id);
      
      return {
        ...seat,
        status: isBooked ? 'booked' : lock ? 'locked' : 'available',
        lockedBy: lock?.user_id || null,
        lockedUntil: lock?.locked_until || null
      };
    });

    res.json({
      showtime,
      seats: seatStatus
    });

  } catch (error) {
    next(error);
  }
});

export default router;