/** Built-in defaults of the core settings (BUSINESS_DOMAIN §10), used by the mock server. */
export const MOCK_SETTING_DEFAULTS: Readonly<Record<string, unknown>> = {
  'discovery.nearbyRadiusKm': 10,
  'booking.slotMinutes': 15,
  'booking.maxDaysAhead': 90,
  'booking.maxCompanions': 5,
  'booking.minLeadMinutes': 0,
  'booking.paymentHoldMinutes': 10,
  'booking.autoCancelAfterStartMinutes': 60,
  'booking.pendingAlertBeforeMinutes': 30,
  'booking.reminderMinutes': [60, 15],
  'otp.length': 6,
  'otp.resendAfterSec': 60,
  'otp.maxRequests': 5,
  'otp.requestWindowSec': 300,
  'otp.maxWrong': 5,
  'otp.blockSec': 900,
};
