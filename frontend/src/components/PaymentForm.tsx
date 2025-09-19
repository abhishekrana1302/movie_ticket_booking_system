import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { ArrowLeft, CreditCard, Calendar, Clock, MapPin } from 'lucide-react';

interface PaymentFormProps {
  booking: any;
  onSuccess: () => void;
  onBack: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ booking, onSuccess, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setIsProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-confirmation/${booking.id}`,
      },
      redirect: 'if_required'
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Booking Summary */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Booking Summary</h2>

        {/* Movie Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            {booking.showtimes.movies.title}
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-red-400" />
              <span className="text-gray-300">{formatDate(booking.showtimes.show_date)}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-red-400" />
              <span className="text-gray-300">{formatTime(booking.showtimes.show_time)}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-4 w-4 text-red-400" />
              <span className="text-gray-300">{booking.showtimes.theaters.name}</span>
            </div>
          </div>
        </div>

        {/* Seats */}
        <div className="mb-6">
          <h4 className="font-semibold text-white mb-2">Selected Seats</h4>
          <div className="flex flex-wrap gap-2">
            {booking.booking_seats.map((bs: any, index: number) => (
              <span
                key={index}
                className="bg-gray-700 px-3 py-1 rounded-full text-sm text-white"
              >
                {String.fromCharCode(64 + bs.seats.row_number)}{bs.seats.seat_number}
              </span>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-gray-700 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Tickets ({booking.booking_seats.length})</span>
              <span className="text-white">${booking.total_amount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">Total</span>
              <span className="text-red-400">${booking.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Payment Details</h2>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Address Element */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Billing Address
              </label>
              <AddressElement
                options={{
                  mode: 'billing',
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorBackground: '#374151',
                      colorText: '#ffffff',
                      colorPrimary: '#dc2626',
                      borderRadius: '6px',
                    },
                  },
                }}
              />
            </div>

            {/* Payment Element */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method
              </label>
              <PaymentElement
                options={{
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorBackground: '#374151',
                      colorText: '#ffffff',
                      colorPrimary: '#dc2626',
                      borderRadius: '6px',
                    },
                  },
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!stripe || !elements || isProcessing}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Pay ${booking.total_amount.toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-gray-700 rounded-md">
          <p className="text-sm text-gray-300">
            🔒 Your payment information is secure and encrypted. We use Stripe for secure payment processing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;