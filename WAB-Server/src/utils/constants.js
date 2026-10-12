const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

const MESSAGES = {
  OTP_SENT: 'تم إرسال رمز التحقق بنجاح',
  VERIFICATION_SUCCESS: 'تم التحقق بنجاح',
  LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
  REGISTRATION_SUCCESS: 'تم التسجيل بنجاح',
  INVALID_OTP: 'رمز التحقق غير صحيح',
  OTP_EXPIRED: 'انتهت صلاحية رمز التحقق',
  USER_NOT_FOUND: 'المستخدم غير موجود',
  MOBILE_ALREADY_EXISTS: 'رقم الجوال مسجل مسبقاً',
  EMAIL_ALREADY_EXISTS: 'البريد الإلكتروني مستخدم مسبقاً',
  VALIDATION_ERROR: 'خطأ في التحقق من البيانات',
  INTERNAL_ERROR: 'خطأ داخلي في الخادم',
  UNAUTHORIZED: 'دخول غير مصرح به',
};

const ROLES = {
  ADMIN: 'admin',
  MERCHANT: 'merchant',
  CUSTOMER: 'customer',
};

const VALIDATION_RULES = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 50,
  OTP_LENGTH: 4,
  DEV_OTP: '0000',
  JORDANIAN_MOBILE_REGEX: /^07[7-9]\d{7}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  OTP_REGEX: /^\d{4}$/,
};

const OTP_EXPIRY_MINUTES = 10;

const JWT_EXPIRES_IN = '7d';

const CLOUDINARY_FOLDERS = {
  USER_IMAGES: 'wab/users',
};

const DEVICE_PLATFORMS = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
};

const REALTIME_EVENTS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  NOTIFICATION: 'notification',
};

const REALTIME_ROOMS = {
  user: (userId) => `user:${userId}`,
  role: (role) => `role:${role}`,
};

const WELCOME_NOTIFICATION = {
  title: 'Welcome to WAB',
  body: 'Your account is ready!',
};

module.exports = {
  HTTP_STATUS,
  MESSAGES,
  ROLES,
  VALIDATION_RULES,
  OTP_EXPIRY_MINUTES,
  JWT_EXPIRES_IN,
  CLOUDINARY_FOLDERS,
  DEVICE_PLATFORMS,
  REALTIME_EVENTS,
  REALTIME_ROOMS,
  WELCOME_NOTIFICATION,
};
