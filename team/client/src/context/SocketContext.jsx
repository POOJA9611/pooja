import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketTargetUrl = (typeof window !== 'undefined' && window.location.port === '5173')
      ? 'http://localhost:5000'
      : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

    const socketInstance = io(socketTargetUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('new_notification', (notification) => {
      console.log('🔔 Received real-time notification:', notification);
      // Check role relevance
      if (
        notification.audience === 'both' ||
        (user.role === 'student' && notification.audience === 'students') ||
        (user.role === 'faculty' && notification.audience === 'faculty') ||
        user.role === 'hod'
      ) {
        setLatestNotification(notification);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        latestNotification,
        clearLatestNotification: () => setLatestNotification(null)
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
