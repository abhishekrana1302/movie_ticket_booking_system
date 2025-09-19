import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocketHandlers(io: Server) {
  // Socket.IO authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join showtime room for real-time updates
    socket.on('join-showtime', (showtimeId: string) => {
      socket.join(`showtime-${showtimeId}`);
      console.log(`User ${socket.userId} joined showtime ${showtimeId}`);
    });

    // Handle seat selection (temporary lock)
    socket.on('select-seats', async (data: {
      showtimeId: string;
      seatIds: string[];
      action: 'select' | 'deselect';
    }) => {
      try {
        const { showtimeId, seatIds, action } = data;

        if (action === 'select') {
          // Temporarily lock seats for 10 minutes
          const lockExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
          
          for (const seatId of seatIds) {
            await supabase
              .from('seat_locks')
              .upsert({
                seat_id: seatId,
                showtime_id: showtimeId,
                user_id: socket.userId,
                locked_until: lockExpiry.toISOString()
              });
          }

          // Notify other users in the same showtime
          socket.to(`showtime-${showtimeId}`).emit('seats-locked', {
            seatIds,
            lockedBy: socket.userId,
            lockedUntil: lockExpiry
          });

        } else if (action === 'deselect') {
          // Release seat locks
          for (const seatId of seatIds) {
            await supabase
              .from('seat_locks')
              .delete()
              .eq('seat_id', seatId)
              .eq('user_id', socket.userId);
          }

          // Notify other users
          socket.to(`showtime-${showtimeId}`).emit('seats-released', {
            seatIds
          });
        }

      } catch (error) {
        console.error('Error handling seat selection:', error);
        socket.emit('seat-selection-error', { 
          error: 'Failed to lock/unlock seats' 
        });
      }
    });

    // Handle booking confirmation (permanent booking)
    socket.on('confirm-booking', async (data: {
      showtimeId: string;
      bookingId: string;
      seatIds: string[];
    }) => {
      try {
        const { showtimeId, bookingId, seatIds } = data;

        // Remove temporary locks and mark seats as booked
        for (const seatId of seatIds) {
          await supabase
            .from('seat_locks')
            .delete()
            .eq('seat_id', seatId)
            .eq('user_id', socket.userId);
        }

        // Notify all users in showtime that seats are now permanently booked
        io.to(`showtime-${showtimeId}`).emit('seats-booked', {
          seatIds,
          bookingId
        });

      } catch (error) {
        console.error('Error confirming booking:', error);
        socket.emit('booking-confirmation-error', { 
          error: 'Failed to confirm booking' 
        });
      }
    });

    // Leave showtime room
    socket.on('leave-showtime', (showtimeId: string) => {
      socket.leave(`showtime-${showtimeId}`);
      console.log(`User ${socket.userId} left showtime ${showtimeId}`);
    });

    socket.on('disconnect', async () => {
      console.log(`User ${socket.userId} disconnected`);
      
      // Release all locks held by this user
      try {
        await supabase
          .from('seat_locks')
          .delete()
          .eq('user_id', socket.userId);
      } catch (error) {
        console.error('Error releasing locks on disconnect:', error);
      }
    });
  });

  // Clean up expired locks every minute
  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      const { data: expiredLocks } = await supabase
        .from('seat_locks')
        .select('showtime_id, seat_id')
        .lt('locked_until', now);

      if (expiredLocks && expiredLocks.length > 0) {
        // Group by showtime for efficient notification
        const locksByShowtime: Record<string, string[]> = {};
        
        expiredLocks.forEach(lock => {
          if (!locksByShowtime[lock.showtime_id]) {
            locksByShowtime[lock.showtime_id] = [];
          }
          locksByShowtime[lock.showtime_id].push(lock.seat_id);
        });

        // Remove expired locks
        await supabase
          .from('seat_locks')
          .delete()
          .lt('locked_until', now);

        // Notify users about released seats
        Object.entries(locksByShowtime).forEach(([showtimeId, seatIds]) => {
          io.to(`showtime-${showtimeId}`).emit('seats-released', { seatIds });
        });
      }
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
    }
  }, 60000); // Run every minute
}