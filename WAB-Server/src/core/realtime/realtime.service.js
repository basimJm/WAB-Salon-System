const { Server } = require('socket.io');
const { socketAuth } = require('./socketAuth.middleware');
const { REALTIME_ROOMS, REALTIME_EVENTS } = require('../../utils/constants');

let io = null;

const initRealtime = (httpServer) => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { user } = socket.data;

    socket.join(REALTIME_ROOMS.user(user.id));
    socket.join(REALTIME_ROOMS.role(user.role));

    socket.emit(REALTIME_EVENTS.CONNECTED, {
      userId: user.id,
      role: user.role,
    });

    socket.on(REALTIME_EVENTS.DISCONNECTED, () => {
      socket.leave(REALTIME_ROOMS.user(user.id));
      socket.leave(REALTIME_ROOMS.role(user.role));
    });
  });

  return io;
};

const getIo = () => io;

const emitToUser = (userId, event, data) => {
  if (!io) {
    return false;
  }
  return io.to(REALTIME_ROOMS.user(userId)).emit(event, data);
};

const emitToRole = (role, event, data) => {
  if (!io) {
    return false;
  }
  return io.to(REALTIME_ROOMS.role(role)).emit(event, data);
};

const emitToRoom = (room, event, data) => {
  if (!io) {
    return false;
  }
  return io.to(room).emit(event, data);
};

const emitToAll = (event, data) => {
  if (!io) {
    return false;
  }
  return io.emit(event, data);
};

module.exports = {
  initRealtime,
  getIo,
  emitToUser,
  emitToRole,
  emitToRoom,
  emitToAll,
};
