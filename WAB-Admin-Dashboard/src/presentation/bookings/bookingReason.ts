import type { TFunction } from 'i18next';
import type { BookingReason } from '@/domain/bookings/bookings';

/** The reason code in the admin's language (an unknown code shows as sent) plus the free text, if any. */
export function reasonLabel(t: TFunction, reason: BookingReason): string {
  const code = t(`bookings.reasonCode.${reason.reasonCode}`, { defaultValue: reason.reasonCode });
  const text = reason.reasonText?.trim();
  return text ? `${code} · ${text}` : code;
}
