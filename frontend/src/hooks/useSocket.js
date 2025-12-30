import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Custom hook for Socket.IO connection
 * @param {string} tournamentId - Tournament ID to join
 * @returns {Object} Socket instance
 */
export const useSocket = (tournamentId) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!tournamentId) return;

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    // Join tournament room
    newSocket.emit('join_tournament', tournamentId);

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.emit('leave_tournament', tournamentId);
      newSocket.close();
    };
  }, [tournamentId]);

  return socket;
};

