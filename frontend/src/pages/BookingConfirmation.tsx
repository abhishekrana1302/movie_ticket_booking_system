import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, MapPin, Ticket, Download, Share, CreditCard } from 'lucide-react';
import { apiService } from '../services/api';
import { Booking } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const BookingConfirmation: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/bookings/${bookingId}`);
      setBooking(response.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Movie Ticket - ${booking?.showtimes.movies.title}`,
          text: `I just booked tickets for ${booking?.showtimes.movies.title}!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    // In a real app, this would generate a PDF ticket
    alert('Ticket download feature would be implemented here');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-gray-300">{error || 'Booking not found'}</p>
          <Link
            to="/bookings"
            className="inline-block mt-4 bg-red-600 hover:bg-red-700 px-6 py-2 rounded-md transition-colors"
          >
            View All Bookings
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
        return 'text-green-400';
      case 'confirmed':
        return 'text-blue-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
        <p className="text-gray-300">Your movie tickets have been successfully booked</p>
      </div>

      {/* Booking Details Card */}
      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden mb-8">
        {/* Header with Movie Poster */}
        <div className="relative h-32 bg-gradient-to-r from-red-600 to-pink-600">
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-bold text-white">{booking.showtimes.movies.title}</h2>
            <p className={`text-sm font-medium ${getStatusColor(booking.status)}`}>
              Status: {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </p>
          </div>
          <div className="absolute bottom-4 right-6">
            <div className="text-right">
              <p className="text-white text-sm">Booking ID</p>
              <p className="text-white font-mono text-lg">{booking.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Show Details */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Show Details</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Date</p>
                    <p className="text-white">{formatDate(booking.showtimes.show_date)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Time</p>
                    <p className="text-white">{formatTime(booking.showtimes.show_time)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Theater</p>
                    <p className="text-white">{booking.showtimes.theaters.name}</p>
                    <p className="text-gray-300 text-sm">{booking.showtimes.theaters.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Details */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Ticket Details</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Ticket className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Seats</p>
                    <p className="text-white">
                      {booking.booking_seats.map(bs => 
                        `${String.fromCharCode(64 + bs.seats.row_number)}${bs.seats.seat_number}`
                      ).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Total Amount</p>
                    <p className="text-white text-xl font-bold">${booking.total_amount.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Booking Date</p>
                  <p className="text-white">
                    {new Date(booking.booking_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {booking.payments && booking.payments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">Payment Information</h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">Payment Status</p>
                    <p className="text-gray-300 text-sm">
                      {booking.payments[0].payment_status.charAt(0).toUpperCase() + 
                       booking.payments[0].payment_status.slice(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">${booking.payments[0].amount.toFixed(2)}</p>
                    <p className="text-gray-300 text-sm">
                      {booking.payments[0].payment_date && 
                       new Date(booking.payments[0].payment_date).toLocaleDateString()
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-8">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md transition-colors"
        >
          <Download className="h-5 w-5" />
          <span>Download Ticket</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-md transition-colors"
        >
          <Share className="h-5 w-5" />
          <span>Share</span>
        </button>

        <Link
          to="/bookings"
          className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-md transition-colors"
        >
          <Ticket className="h-5 w-5" />
          <span>View All Bookings</span>
        </Link>
      </div>

      {/* Important Information */}
      <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
        <h4 className="text-blue-200 font-medium mb-2">Important Information</h4>
        <ul className="text-blue-100 text-sm space-y-1">
          <li>• Please arrive at the theater at least 15 minutes before showtime</li>
          <li>• Bring a valid ID for verification</li>
          <li>• Screenshots or printed tickets are acceptable</li>
          <li>• Contact customer support for any changes or cancellations</li>
        </ul>
      </div>
    </div>
  );
};

export default BookingConfirmation;