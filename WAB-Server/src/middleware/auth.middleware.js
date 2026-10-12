const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/constants');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      mobile: decoded.mobile,
      role: decoded.role,
    };
    return next();
  } catch (err) {
    return next(new AppError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED));
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', HTTP_STATUS.FORBIDDEN));
    }
    return next();
  };
};

module.exports = { authenticate, authorize };
