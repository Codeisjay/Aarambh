import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocketInterview(sessionId) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setSocket(null);
      return undefined;
    }

    const connection = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    connection.emit('join-session', { sessionId });
    setSocket(connection);

    return () => {
      connection.disconnect();
      setSocket(null);
    };
  }, [sessionId]);

  return socket;
}
