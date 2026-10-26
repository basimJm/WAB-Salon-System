import type { BookingStaff } from '@/domain/bookings/bookings';
import { uniqueStaff } from '@/domain/bookings/bookingRules';
import { Avatar } from '../components/core/Avatar';

const NONE = '—';

/** One staff member: photo (or initials) and full name; a dash when nobody is assigned. */
export function StaffCell({ staff }: { staff: BookingStaff | null }) {
  if (!staff) return NONE;
  return (
    <span className="wab-entity">
      <Avatar name={staff.name} size="sm" {...(staff.photoUrl ? { src: staff.photoUrl } : {})} />
      <span className="wab-entity__name">{staff.name}</span>
    </span>
  );
}

/** Every staff member of a booking once (design 06 "Staff" fact). */
export function StaffList({ staff }: { staff: readonly BookingStaff[] }) {
  const list = uniqueStaff(staff);
  if (list.length === 0) return NONE;
  return (
    <span className="wab-row">
      {list.map((s) => (
        <StaffCell key={s.id} staff={s} />
      ))}
    </span>
  );
}
