let ioInstance = null;

function initializeSocket(server) {
  const { Server } = require('socket.io');
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  ioInstance = new Server(server, {
    cors: {
      origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    socket.on('join-session', ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      socket.emit('session-joined', { sessionId });
    });

    socket.on('disconnect', () => {
      // socket cleanup handled by server lifecycle
    });
  });

  return ioInstance;
}

function emitSessionMetrics(sessionId, payload) {
  if (!ioInstance || !sessionId) return;
  ioInstance.to(sessionId).emit('live-metrics', payload);
}

function emitSessionFeedback(sessionId, payload) {
  if (!ioInstance || !sessionId) return;
  ioInstance.to(sessionId).emit('live-feedback', payload);
}

function emitConfidenceUpdate(sessionId, payload) {
  if (!ioInstance || !sessionId) return;
  ioInstance.to(sessionId).emit('confidence-update', payload);
}

module.exports = {
  initializeSocket,
  emitSessionMetrics,
  emitSessionFeedback,
  emitConfidenceUpdate,
};
