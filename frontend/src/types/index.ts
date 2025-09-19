export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  duration: number;
  genre: string;
  rating: string;
  release_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Theater {
  id: string;
  name: string;
  location: string;
  address?: string;
  total_seats: number;
}

export interface Showtime {
  id: string;
  movie_id: string;
  theater_id: string;
  show_date: string;
  show_time: string;
  price: number;
  theaters: Theater;
}

export interface Seat {
  id: string;
  theater_id: string;
  row_number: number;
  seat_number: number;
  seat_type: 'regular' | 'premium' | 'vip';
  is_active: boolean;
  status?: 'available' | 'locked' | 'booked';
  lockedBy?: string;
  lockedUntil?: string;
}

export interface Booking {
  id: string;
  user_id: string;
  showtime_id: string;
  total_amount: number;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  showtimes: {
    show_date: string;
    show_time: string;
    price: number;
    movies: {
      title: string;
      poster_url: string;
      duration: number;
      genre: string;
      rating: string;
    };
    theaters: {
      name: string;
      location: string;
      address: string;
    };
  };
  booking_seats: {
    seats: {
      row_number: number;
      seat_number: number;
      seat_type: string;
    };
  }[];
  payments?: {
    amount: number;
    payment_status: string;
    stripe_payment_intent_id: string;
    payment_date: string;
  }[];
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}