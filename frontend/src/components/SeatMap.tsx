import React from 'react';
import { Seat } from '../types';

interface SeatMapProps {
  seats: Seat[];
  selectedSeats: Seat[];
  onSeatSelect: (seat: Seat) => void;
}

const SeatMap: React.FC<SeatMapProps> = ({ seats, selectedSeats, onSeatSelect }) => {
  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row_number]) {
      acc[seat.row_number] = [];
    }
    acc[seat.row_number].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);

  // Sort rows and seats
  const sortedRows = Object.keys(seatsByRow)
    .map(Number)
    .sort((a, b) => a - b);

  Object.values(seatsByRow).forEach(rowSeats => {
    rowSeats.sort((a, b) => a.seat_number - b.seat_number);
  });

  const getSeatColor = (seat: Seat) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    
    if (isSelected) return 'bg-blue-500 hover:bg-blue-600';
    if (seat.status === 'booked') return 'bg-red-500 cursor-not-allowed';
    if (seat.status === 'locked') return 'bg-yellow-500 cursor-not-allowed';
    return 'bg-green-500 hover:bg-green-600 cursor-pointer';
  };

  const getSeatLabel = (seat: Seat) => {
    // Convert row number to letter (1=A, 2=B, etc.)
    const rowLetter = String.fromCharCode(64 + seat.row_number);
    return `${rowLetter}${seat.seat_number}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Screen */}
      <div className="mb-8">
        <div className="w-full max-w-2xl mx-auto h-2 bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full mb-2"></div>
        <p className="text-center text-gray-400 text-sm">SCREEN</p>
      </div>

      {/* Seats */}
      <div className="space-y-4">
        {sortedRows.map(rowNumber => (
          <div key={rowNumber} className="flex items-center justify-center space-x-2">
            {/* Row Label */}
            <div className="w-8 text-center text-gray-300 font-medium">
              {String.fromCharCode(64 + rowNumber)}
            </div>

            {/* Seats in Row */}
            <div className="flex space-x-1">
              {seatsByRow[rowNumber].map(seat => (
                <button
                  key={seat.id}
                  onClick={() => onSeatSelect(seat)}
                  disabled={seat.status === 'booked' || (seat.status === 'locked' && !selectedSeats.some(s => s.id === seat.id))}
                  className={`
                    w-8 h-8 rounded-t-lg text-xs font-medium text-white transition-colors
                    ${getSeatColor(seat)}
                    ${seat.seat_type === 'premium' ? 'ring-2 ring-yellow-400' : ''}
                    ${seat.seat_type === 'vip' ? 'ring-2 ring-purple-400' : ''}
                  `}
                  title={`Seat ${getSeatLabel(seat)} - ${seat.seat_type} - $${
                    seat.seat_type === 'premium' ? '15' : seat.seat_type === 'vip' ? '20' : '12'
                  }`}
                >
                  {seat.seat_number}
                </button>
              ))}
            </div>

            {/* Row Label (Right side) */}
            <div className="w-8 text-center text-gray-300 font-medium">
              {String.fromCharCode(64 + rowNumber)}
            </div>
          </div>
        ))}
      </div>

      {/* Seat Type Legend */}
      <div className="mt-8 flex flex-wrap justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded ring-0"></div>
          <span className="text-gray-300">Regular - $12</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded ring-2 ring-yellow-400"></div>
          <span className="text-gray-300">Premium - $15</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded ring-2 ring-purple-400"></div>
          <span className="text-gray-300">VIP - $20</span>
        </div>
      </div>
    </div>
  );
};

export default SeatMap;