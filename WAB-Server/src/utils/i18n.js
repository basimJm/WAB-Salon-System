const locales = {
  en: {
    firstName_required: 'First name is required',
    firstName_minLength: 'First name must be at least 3 characters',
    lastName_required: 'Last name is required',
    lastName_minLength: 'Last name must be at least 3 characters',
    email_required: 'Email is required',
    email_invalid: 'Invalid email format',
    mobile_required: 'Mobile number is required',
    mobile_invalid: 'Mobile must be a valid Jordanian number starting with 07[7,8,9]',
    otp_required: 'OTP is required',
    otp_invalid: 'OTP must be 4 digits',
    deviceToken_required: 'Device token is required',
    deviceToken_invalid: 'Device token must be at least 20 characters',
    platform_invalid: 'Platform must be one of: ios, android, web',

    OTP_SENT: 'OTP sent successfully',
    VERIFICATION_SUCCESS: 'Verified successfully',
    INVALID_OTP: 'Invalid OTP',
    OTP_EXPIRED: 'OTP has expired',
    USER_NOT_FOUND: 'User not found',
    MOBILE_ALREADY_EXISTS: 'Mobile number already registered',
    EMAIL_ALREADY_EXISTS: 'Email already in use',
    INTERNAL_ERROR: 'Internal server error',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access denied',
    VALIDATION_ERROR: 'Validation failed',
    DEVICE_TOKEN_REGISTERED: 'Device token registered successfully',
  },
  ar: {
    firstName_required: 'الاسم الأول مطلوب',
    firstName_minLength: 'الاسم الأول يجب أن يكون 3 أحرف على الأقل',
    lastName_required: 'الاسم الأخير مطلوب',
    lastName_minLength: 'الاسم الأخير يجب أن يكون 3 أحرف على الأقل',
    email_required: 'البريد الإلكتروني مطلوب',
    email_invalid: 'صيغة البريد الإلكتروني غير صالحة',
    mobile_required: 'رقم الجوال مطلوب',
    mobile_invalid: 'رقم الجوال يجب أن يكون رقم أردني صحيح يبدأ بـ 07 متبوعاً بـ 7 أو 8 أو 9',
    otp_required: 'رمز التحقق مطلوب',
    otp_invalid: 'رمز التحقق يجب أن يكون 4 أرقام',
    deviceToken_required: 'رمز الجهاز مطلوب',
    deviceToken_invalid: 'رمز الجهاز يجب أن يكون 20 حرفاً على الأقل',
    platform_invalid: 'المنصة يجب أن تكون واحدة من: ios, android, web',

    OTP_SENT: 'تم إرسال رمز التحقق بنجاح',
    VERIFICATION_SUCCESS: 'تم التحقق بنجاح',
    INVALID_OTP: 'رمز التحقق غير صحيح',
    OTP_EXPIRED: 'انتهت صلاحية رمز التحقق',
    USER_NOT_FOUND: 'المستخدم غير موجود',
    MOBILE_ALREADY_EXISTS: 'رقم الجوال مسجل مسبقاً',
    EMAIL_ALREADY_EXISTS: 'البريد الإلكتروني مستخدم مسبقاً',
    INTERNAL_ERROR: 'خطأ داخلي في الخادم',
    UNAUTHORIZED: 'دخول غير مصرح به',
    FORBIDDEN: 'تم رفض الوصول',
    VALIDATION_ERROR: 'خطأ في التحقق من البيانات',
    DEVICE_TOKEN_REGISTERED: 'تم تسجيل رمز الجهاز بنجاح',
  },
};

const supportedLangs = Object.keys(locales);

const t = (lang, key) => {
  const resolved = locales[lang]?.[key] || locales.ar[key] || key;
  return resolved;
};

module.exports = { t, supportedLangs, locales };
