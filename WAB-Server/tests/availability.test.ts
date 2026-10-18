import {
  computeAvailability,
  lastBookableDate,
  pickAnyStaff,
  type AvailabilityInput,
  type AvailabilityStaff,
  type BusyInterval,
} from '../src/domain/availability/availability';
import type { DayOfWeek } from '../src/constants/time';

const TZ = 'Asia/Amman';
// Monday 2026-10-12 11:00 in Amman (UTC+3).
const NOW = new Date('2026-10-12T08:00:00Z');
const DAYS: DayOfWeek[] = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
const schedule = (off: DayOfWeek[] = ['FRI']): AvailabilityInput['schedule'] =>
  DAYS.map((day) => ({ day, isOff: off.includes(day), open: '09:00', close: '18:00' }));
const allDays = DAYS.map((day) => ({ day }));
const staff = (id: string, over: Partial<AvailabilityStaff> = {}): AvailabilityStaff => ({
  id,
  active: true,
  providesServices: true,
  serviceIds: ['cut', 'color'],
  brideQualified: false,
  workingDays: allDays,
  ...over,
});
const amman = (date: string, hhmm: string): Date => new Date(`${date}T${hhmm}:00+03:00`);

const base = (over: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  date: '2026-10-13', // Tuesday
  now: NOW,
  timeZone: TZ,
  slotMinutes: 15,
  maxDaysAhead: 90,
  minLeadMinutes: 0,
  schedule: schedule(),
  closures: [],
  staff: [staff('s1')],
  leaves: [],
  busy: [],
  person: { serviceIds: ['cut'], durationMinutes: 60, isBride: false, hasBrideOnlyService: false },
  ...over,
});
const starts = (input: AvailabilityInput): string[] =>
  computeAvailability(input)
    .slots.filter((s) => s.available)
    .map((s) => s.start.toISOString());
const busy = (staffId: string, date: string, from: string, to: string): BusyInterval => ({
  staffId,
  start: amman(date, from),
  end: amman(date, to),
});

describe('the slot grid', () => {
  it('starts every 15 minutes from opening while the whole duration fits before closing', () => {
    const out = computeAvailability(base());
    expect(out.reason).toBeNull();
    expect(out.slots[0]?.start).toEqual(amman('2026-10-13', '09:00'));
    expect(out.slots[1]?.start).toEqual(amman('2026-10-13', '09:15'));
    // A 60 minute service must end by 18:00, so 17:00 is the last start.
    expect(out.slots.at(-1)?.start).toEqual(amman('2026-10-13', '17:00'));
    expect(out.slots).toHaveLength(33);
  });

  it('a duration that is not a multiple of the grid still must fit before closing', () => {
    const out = computeAvailability(base({ person: { ...base().person, durationMinutes: 50 } }));
    // 17:15 + 50 = 18:05 does not fit; 17:00 + 50 = 17:50 does.
    expect(out.slots.at(-1)?.start).toEqual(amman('2026-10-13', '17:00'));
  });

  it('a service longer than the opening hours has no slots', () => {
    const out = computeAvailability(base({ person: { ...base().person, durationMinutes: 600 } }));
    expect(out.slots).toEqual([]);
    expect(out.reason).toBeNull();
  });

  it('uses the slot length from settings', () => {
    const out = computeAvailability(base({ slotMinutes: 30 }));
    expect(out.slots[1]?.start).toEqual(amman('2026-10-13', '09:30'));
  });
});

describe('which days can be booked', () => {
  it('rejects past days and allows today', () => {
    expect(computeAvailability(base({ date: '2026-10-11' })).reason).toBe('PAST');
    expect(computeAvailability(base({ date: '2026-10-12' })).reason).toBeNull();
  });

  it('today ends at Amman midnight (21:00Z), not at UTC midnight', () => {
    const justBefore = new Date('2026-10-12T20:59:59.999Z');
    const atMidnight = new Date('2026-10-12T21:00:00.000Z');
    expect(computeAvailability(base({ date: '2026-10-12', now: justBefore })).reason).toBeNull();
    expect(computeAvailability(base({ date: '2026-10-12', now: atMidnight })).reason).toBe('PAST');
    expect(computeAvailability(base({ date: '2026-10-13', now: atMidnight })).reason).toBeNull();
  });

  it('allows exactly maxDaysAhead days ahead', () => {
    expect(lastBookableDate(NOW, TZ, 90)).toBe('2027-01-10');
    expect(computeAvailability(base({ date: '2027-01-10' })).reason).toBeNull();
    expect(computeAvailability(base({ date: '2027-01-11' })).reason).toBe('TOO_FAR');
    expect(computeAvailability(base({ date: '2027-01-11', maxDaysAhead: 91 })).reason).toBeNull();
  });

  it('is closed on a weekly day off and during a closure', () => {
    expect(computeAvailability(base({ date: '2026-10-16' })).reason).toBe('CLOSED'); // Friday
    const closed = base({ closures: [{ from: '2026-10-13', to: '2026-10-14', reason: 'Eid' }] });
    expect(computeAvailability(closed).reason).toBe('CLOSED');
    expect(computeAvailability({ ...closed, date: '2026-10-15' }).reason).toBeNull();
  });
});

describe('today and the lead time', () => {
  it('drops slots that already started', () => {
    const out = starts(base({ date: '2026-10-12' }));
    expect(out[0]).toBe(amman('2026-10-12', '11:00').toISOString()); // now = 11:00 exactly
  });

  it('adds the minimum lead time', () => {
    const out = starts(base({ date: '2026-10-12', minLeadMinutes: 40 }));
    expect(out[0]).toBe(amman('2026-10-12', '11:45').toISOString());
  });

  it('later days are not affected by the lead time', () => {
    const out = starts(base({ minLeadMinutes: 600 }));
    expect(out[0]).toBe(amman('2026-10-13', '09:00').toISOString());
  });
});

describe('who is eligible', () => {
  const eligible = (input: AvailabilityInput): string[] =>
    computeAvailability(input).slots[0]?.eligibleStaffIds.slice() ?? [];

  it('needs an active staff member who provides services', () => {
    const input = base({
      staff: [staff('a', { active: false }), staff('b', { providesServices: false }), staff('c')],
    });
    expect(eligible(input)).toEqual(['c']);
  });

  it('needs ALL selected services, not just one', () => {
    const input = base({
      staff: [
        staff('a', { serviceIds: ['cut'] }),
        staff('b', { serviceIds: ['cut', 'color', 'x'] }),
      ],
      person: { ...base().person, serviceIds: ['cut', 'color'] },
    });
    expect(eligible(input)).toEqual(['b']);
  });

  it('needs to work on that weekday and not be on leave', () => {
    const input = base({
      staff: [staff('a', { workingDays: [{ day: 'MON' }] }), staff('b'), staff('c')],
      leaves: [
        { staffId: 'c', from: '2026-10-13', to: '2026-10-13' },
        { staffId: 'b', from: '2026-10-01', to: '2026-10-12' },
      ],
    });
    expect(eligible(input)).toEqual(['b']);
    // The leave of b ended the day before; the one of c covers the date (both ends inclusive).
    expect(
      eligible({ ...input, leaves: [{ staffId: 'c', from: '2026-10-10', to: '2026-10-13' }] }),
    ).toEqual(['b']);
    expect(
      eligible({ ...input, leaves: [{ staffId: 'b', from: '2026-10-13', to: '2026-10-20' }] }),
    ).toEqual(['c']);
  });

  it('a bride needs a bride-qualified staff member', () => {
    const input = base({
      staff: [staff('a'), staff('b', { brideQualified: true })],
      person: { ...base().person, isBride: true },
    });
    expect(eligible(input)).toEqual(['b']);
  });

  it('a bride-only (VIP) service can only be booked by a bride', () => {
    const vip = { ...base().person, hasBrideOnlyService: true };
    const crew = [staff('a', { brideQualified: true })];
    expect(
      computeAvailability(base({ staff: crew, person: vip })).slots.every((s) => !s.available),
    ).toBe(true);
    expect(eligible(base({ staff: crew, person: { ...vip, isBride: true } }))).toEqual(['a']);
  });

  it('a chosen staff member restricts the answer to them', () => {
    const input = base({
      staff: [staff('a'), staff('b')],
      person: { ...base().person, staffId: 'b' },
    });
    expect(eligible(input)).toEqual(['b']);
    expect(eligible({ ...input, person: { ...input.person, staffId: 'nobody' } })).toEqual([]);
  });

  it('lists staff lowest id first', () => {
    expect(eligible(base({ staff: [staff('c'), staff('a'), staff('b')] }))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('working hours of a staff member', () => {
  it('custom hours narrow the salon hours', () => {
    const input = base({
      staff: [staff('a', { workingDays: [{ day: 'TUE', start: '12:00', end: '15:00' }] })],
    });
    const out = starts(input);
    expect(out[0]).toBe(amman('2026-10-13', '12:00').toISOString());
    expect(out.at(-1)).toBe(amman('2026-10-13', '14:00').toISOString()); // 14:00 + 60 = 15:00
  });

  it('hours outside the salon hours are cut back to them', () => {
    const input = base({
      staff: [staff('a', { workingDays: [{ day: 'TUE', start: '07:00', end: '22:00' }] })],
    });
    const out = starts(input);
    expect(out[0]).toBe(amman('2026-10-13', '09:00').toISOString());
    expect(out.at(-1)).toBe(amman('2026-10-13', '17:00').toISOString());
  });

  it('hours that do not overlap the salon at all give no slots', () => {
    const input = base({
      staff: [staff('a', { workingDays: [{ day: 'TUE', start: '19:00', end: '21:00' }] })],
    });
    expect(starts(input)).toEqual([]);
  });
});

describe('busy times', () => {
  it('a booking blocks every slot it overlaps, and back-to-back slots stay free', () => {
    const input = base({ busy: [busy('s1', '2026-10-13', '10:00', '11:00')] });
    const free = starts(input);
    const has = (hhmm: string): boolean => free.includes(amman('2026-10-13', hhmm).toISOString());
    expect(has('09:00')).toBe(true); // 09:00-10:00 ends exactly when the booking starts
    expect(has('09:15')).toBe(false);
    expect(has('10:45')).toBe(false);
    expect(has('11:00')).toBe(true); // starts exactly when the booking ends
  });

  it('only blocks the staff member who is busy', () => {
    const input = base({
      staff: [staff('a'), staff('b')],
      busy: [busy('a', '2026-10-13', '09:00', '18:00')],
    });
    const first = computeAvailability(input).slots[0];
    expect(first?.available).toBe(true);
    expect(first?.eligibleStaffIds).toEqual(['b']);
  });

  it('a slot is unavailable when every eligible staff member is busy', () => {
    const input = base({
      staff: [staff('a'), staff('b')],
      busy: [busy('a', '2026-10-13', '09:00', '10:00'), busy('b', '2026-10-13', '09:30', '10:30')],
    });
    const slot = computeAvailability(input).slots.find(
      (s) => s.start.getTime() === amman('2026-10-13', '09:00').getTime(),
    );
    expect(slot).toMatchObject({ available: false, eligibleStaffIds: [] });
  });

  it('a busy time of one person in the same draft blocks that staff member', () => {
    const input = base({ busy: [busy('s1', '2026-10-13', '09:00', '09:15')] });
    expect(starts(input)[0]).toBe(amman('2026-10-13', '09:15').toISOString());
  });
});

describe('days that are not 24 hours long', () => {
  it('computes slot instants with the zone rules (New York, spring-forward day)', () => {
    const input = base({
      timeZone: 'America/New_York',
      now: new Date('2026-03-01T12:00:00Z'),
      date: '2026-03-08',
      schedule: DAYS.map((day) => ({ day, isOff: false, open: '09:00', close: '10:00' })),
      person: { ...base().person, durationMinutes: 60 },
      staff: [staff('a')],
    });
    // 09:00 EDT = 13:00Z on the day the clocks jump (a plain +9 h from midnight would say 14:00Z).
    expect(computeAvailability(input).slots[0]?.start.toISOString()).toBe(
      '2026-03-08T13:00:00.000Z',
    );
  });
});

describe('pickAnyStaff', () => {
  it('chooses the free staff member with the fewest bookings that day', () => {
    expect(
      pickAnyStaff(
        ['a', 'b', 'c'],
        new Map([
          ['a', 3],
          ['b', 1],
          ['c', 2],
        ]),
      ),
    ).toBe('b');
  });

  it('breaks ties with the lowest id and treats missing counts as zero', () => {
    expect(pickAnyStaff(['c', 'b', 'a'], new Map())).toBe('a');
    expect(
      pickAnyStaff(
        ['b', 'a'],
        new Map([
          ['a', 2],
          ['b', 2],
        ]),
      ),
    ).toBe('a');
    expect(pickAnyStaff(['a', 'b'], new Map([['a', 1]]))).toBe('b');
  });

  it('returns null when nobody is free', () => {
    expect(pickAnyStaff([], new Map())).toBeNull();
  });
});
