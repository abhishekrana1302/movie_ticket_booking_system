import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, CreditCard, Users } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { Seat } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import SeatMap from '../components/SeatMap';
import PaymentForm from '../components/PaymentForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Booking: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinShowtime, leaveShowtime, selectSeats } = useSocket();
  
  const [showtime, setShowtime] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'seats' | 'payment'>('seats');
  const [booking, setBooking] = useState<any>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  useEffect(() => {
    if (showtimeId) {
      fetchSeats();
      if (socket) {
        joinShowtime(showtimeId);
      }
    }

    return () => {
      if (showtimeId && socket) {
        leaveShowtime(showtimeId);
      }
    };
  }, [showtimeId, socket]);

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time seat updates
    socket.on('seats-locked', (data) => {
      if (data.lockedBy !== user?.id) {
        updateSeatStatus(data.seatIds, 'locked', data.lockedBy, data.lockedUntil);
      }
    });

    socket.on('seats-released', (data) => {
      updateSeatStatus(data.seatIds, 'available');
    });

    socket.on('seats-booked', (data) => {
      updateSeatStatus(data.seatIds, 'booked');
    });

    return () => {
      socket.off('seats-locked');
      socket.off('seats-released');
      socket.off('seats-booked');
    };
  }, [socket, user?.id]);

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/movies/showtimes/${showtimeId}/seats`);
      setShowtime(response.showtime);
      setSeats(response.seats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seats');
    } finally {
      setLoading(false);
    }
  };

  const updateSeatStatus = (seatIds: string[], status: 'available' | 'locked' | 'booked', lockedBy?: string, lockedUntil?: string) => {
    setSeats(prevSeats =>
      prevSeats.map(seat =>
        seatIds.includes(seat.id)
          ? { ...seat, status, lockedBy, lockedUntil }
          : seat
      )
    );
  };

  const handleSeatSelect = (seat: Seat) => {
    if (seat.status === 'booked' || (seat.status === 'locked' && seat.lockedBy !== user?.id)) {
      return;
    }

    const isSelected = selectedSeats.some(s => s.id === seat.id);
    let newSelectedSeats: Seat[];

    if (isSelected) {
      newSelectedSeats = selectedSeats.filter(s => s.id !== seat.id);
    } else {
      if (selectedSeats.length >= 10) {
        alert('Maximum 10 seats can be selected');
        return;
      }
      newSelectedSeats = [...selectedSeats, seat];
    }

    setSelectedSeats(newSelectedSeats);

    // Send seat selection to server
    if (socket && showtimeId) {
      const action = isSelected ? 'deselect' : 'select';
      selectSeats(showtimeId, [seat.id], action);
    }
  };

  const handleContinueToPayment = async () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    try {
      // Create booking
      const totalAmount = selectedSeats.reduce((sum, seat) => sum + showtime.price, 0);
      const bookingResponse = await apiService.post('/bookings', {
        showtimeId,
        seatIds: selectedSeats.map(s => s.id),
        totalAmount
      });

      setBooking(bookingResponse.booking);

      // Create payment intent
      const paymentResponse = await apiService.post('/payments/create-intent', {
        bookingId: bookingResponse.booking.id
      });

      setPaymentIntent(paymentResponse);
      setCurrentStep('payment');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create booking');
    }
  };

  const handlePaymentSuccess = () => {
    navigate(`/booking-confirmation/${booking.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !showtime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-gray-300">{error || 'Showtime not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 bg-red-600 hover:bg-red-700 px-6 py-2 rounded-md transition-colors"
          >
            Go Back
          </button>
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

  const totalAmount = selectedSeats.reduce((sum, seat) => sum + showtime.price, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-8">
          <div className={`flex items-center space-x-2 ${currentStep === 'seats' ? 'text-red-400' : 'text-green-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'seats' ? 'bg-red-600' : 'bg-green-600'} text-white font-medium`}>
              1
            </div>
            <span className="font-medium">Select Seats</span>
          </div>
          
          <div className={`w-16 h-1 ${currentStep === 'payment' ? 'bg-red-600' : 'bg-gray-600'}`} />
          
          <div className={`flex items-center space-x-2 ${currentStep === 'payment' ? 'text-red-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'payment' ? 'bg-red-600' : 'bg-gray-600'} text-white font-medium`}>
              2
            </div>
            <span className="font-medium">Payment</span>
          </div>
        </div>
      </div>

      {/* Movie & Showtime Info */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-gray-400 text-sm">Date</p>
              <p className="text-white font-medium">{formatDate(showtime.show_date)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-gray-400 text-sm">Time</p>
              <p className="text-white font-medium">{formatTime(showtime.show_time)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-gray-400 text-sm">Theater</p>
              <p className="text-white font-medium">{showtime.theaters.name}</p>
            </div>
          </div>
        </div>
      </div>

      {currentStep === 'seats' ? (
        <>
          {/* Seat Selection */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Select Your Seats</h2>
            
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center space-x-6 mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 rounded"></div>
                <span className="text-gray-300">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded"></div>
                <span className="text-gray-300">Selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                <span className="text-gray-300">Locked</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-500 rounded"></div>
                <span className="text-gray-300">Booked</span>
              </div>
            </div>

            <SeatMap
              seats={seats}
              selectedSeats={selectedSeats}
              onSeatSelect={handleSeatSelect}
            />
          </div>

          {/* Booking Summary */}
          {selectedSeats.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Booking Summary</h3>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Selected Seats:</span>
                  <span className="text-white">
                    {selectedSeats.map(seat => `${seat.row_number}${seat.seat_number}`).join(', ')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Ticket Price:</span>
                  <span className="text-white">${showtime.price} each</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Number of Tickets:</span>
                  <span className="text-white">{selectedSeats.length}</span>
                </div>
                
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Total Amount:</span>
                    <span className="text-lg font-bold text-red-400">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinueToPayment}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <CreditCard className="h-5 w-5" />
                <span>Continue to Payment</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Payment Step */
        paymentIntent && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: paymentIntent.clientSecret,
              appearance: { theme: 'night' }
            }}
          >
            <PaymentForm
              booking={booking}
              onSuccess={handlePaymentSuccess}
              onBack={() => setCurrentStep('seats')}
            />
          </Elements>
        )
      )}
    </div>
  );
};

export default Booking;