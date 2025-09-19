import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Ticket, CreditCard } from 'lucide-react';
import { apiService } from '../services/api';
import { Booking } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/bookings');
      setBookings(response.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={fetchBookings}
            className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-600 text-white';
      case 'confirmed':
        return 'bg-blue-600 text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Bookings</h1>
        <p className="text-gray-300">View and manage your movie ticket bookings</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Bookings Yet</h3>
          <p className="text-gray-400 mb-6">Start booking your favorite movies!</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md transition-colors"
          >
            <Ticket className="h-5 w-5" />
            <span>Book Tickets</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  {/* Movie Info */}
                  <div className="flex items-start space-x-4 mb-4 lg:mb-0">
                    <img
                      src={booking.showtimes.movies.poster_url}
                      alt={booking.showtimes.movies.title}
                      className="w-16 h-24 object-cover rounded-md"
                    />
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {booking.showtimes.movies.title}
                      </h3>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(booking.showtimes.show_date)}</span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>{formatTime(booking.showtimes.show_time)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <MapPin className="h-4 w-4" />
                          <span>{booking.showtimes.theaters.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Ticket className="h-4 w-4" />
                          <span>
                            Seats: {booking.booking_seats.map(bs => 
                              `${String.fromCharCode(64 + bs.seats.row_number)}${bs.seats.seat_number}`
                            ).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="lg:text-right">
                    <div className="flex items-center justify-between lg:justify-end lg:flex-col lg:items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          ${booking.total_amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {booking.booking_seats.length} ticket{booking.booking_seats.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <Link
                        to={`/booking-confirmation/${booking.id}`}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {booking.payments && booking.payments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <CreditCard className="h-4 w-4" />
                      <span>
                        Payment: {booking.payments[0].payment_status} 
                        {booking.payments[0].payment_date && (
                          <span className="ml-2">
                            on {new Date(booking.payments[0].payment_date).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingHistory;