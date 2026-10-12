const multer = require('multer');
const { HTTP_STATUS, MESSAGES } = require('../utils/constants');
const { sendError } = require('../utils/response');

const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-'));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, {
        message: 'File size must be less than 5MB',
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      });
    }
    return sendError(res, {
      message: err.message,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    });
  }
  if (err) {
    return sendError(res, {
      message: err.message,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    });
  }
  next();
};

module.exports = { upload, handleUploadError };
