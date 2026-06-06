import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Initialize Socket client with autoconnect disabled by default
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

/**
 * Socket listener/emitter helpers
 */
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
    console.log('Socket client manual connection initialized');
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log('Socket client manual disconnection executed');
  }
};
