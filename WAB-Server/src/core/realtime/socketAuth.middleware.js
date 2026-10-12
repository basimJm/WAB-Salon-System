const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = {
      id: decoded.id,
      mobile: decoded.mobile,
      role: decoded.role,
    };
    return next();
  } catch (err) {
    return next(new Error('UNAUTHORIZED'));
  }
};

module.exports = { socketAuth };
