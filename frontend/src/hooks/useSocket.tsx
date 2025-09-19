import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface SocketContextType {
  socket: Socket | null;
  joinShowtime: (showtimeId: string) => void;
  leaveShowtime: (showtimeId: string) => void;
  selectSeats: (showtimeId: string, seatIds: string[], action: 'select' | 'deselect') => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        const newSocket = io(import.meta.env.VITE_API_URL, {
          auth: { token }
        });

        newSocket.on('connect', () => {
          console.log('Connected to server');
        });

        newSocket.on('disconnect', () => {
          console.log('Disconnected from server');
        });

        setSocket(newSocket);

        return () => {
          newSocket.close();
        };
      }
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [user]);

  const joinShowtime = (showtimeId: string) => {
    if (socket) {
      socket.emit('join-showtime', showtimeId);
    }
  };

  const leaveShowtime = (showtimeId: string) => {
    if (socket) {
      socket.emit('leave-showtime', showtimeId);
    }
  };

  const selectSeats = (showtimeId: string, seatIds: string[], action: 'select' | 'deselect') => {
    if (socket) {
      socket.emit('select-seats', { showtimeId, seatIds, action });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinShowtime, leaveShowtime, selectSeats }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};