import { applyTransition, nextStatuses, type Actor } from '../src/domain/bookings/stateMachine';
import type { BookingStatus } from '../src/constants/enums';
import { BaseError } from '../src/utils/errors';

const H = 3_600_000;
const start = new Date('2026-10-13T10:00:00Z');
const facts = (
  status: BookingStatus,
  windowHours = 24,
): Parameters<typeof applyTransition>[0]['facts'] => ({
  status,
  appointmentStart: start,
  respondBy: new Date(start.getTime() + H),
  cancellationWindowHours: windowHours,
});
const member = (...permissions: string[]): Actor => ({ type: 'MEMBER', id: 'm1', permissions });
const customer: Actor = { type: 'CUSTOMER', id: 'c1' };
const system: Actor = { type: 'SYSTEM' };
const at = (offsetMs: number): Date => new Date(start.getTime() + offsetMs);
const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof BaseError ? e.code : 'OTHER';
  }
  return undefined;
};
const run = (
  status: BookingStatus,
  to: BookingStatus,
  actor: Actor,
  now: Date,
  reason?: string,
  window = 24,
): unknown => applyTransition({ facts: facts(status, window), to, actor, now, reason });

describe('state machine', () => {
  it('a member with BOOKINGS_RESPOND approves; reject needs a reason', () => {
    const ok = run('PENDING', 'APPROVED', member('BOOKINGS_RESPOND'), at(-5 * H));
    expect(ok).toMatchObject({ status: 'APPROVED', actorType: 'MEMBER', actorId: 'm1' });
    expect(codeOf(() => run('PENDING', 'REJECTED', member('BOOKINGS_RESPOND'), at(-H)))).toBe(
      'VALIDATION_ERROR',
    );
    expect(run('PENDING', 'REJECTED', member('BOOKINGS_RESPOND'), at(-H), ' full ')).toMatchObject({
      reason: 'full',
    });
    expect(codeOf(() => run('PENDING', 'APPROVED', member('BOOKINGS_OPERATE'), at(-H)))).toBe(
      'PERMISSION_DENIED',
    );
    expect(codeOf(() => run('PENDING', 'APPROVED', customer, at(-H)))).toBe('PERMISSION_DENIED');
  });

  it('a customer cancels a pending booking at any time, even after the start', () => {
    expect(run('PENDING', 'CANCELLED_BY_CUSTOMER', customer, at(5 * H))).toMatchObject({
      actorType: 'CUSTOMER',
    });
  });

  it('an approved booking can be cancelled by the customer only before the window closes', () => {
    expect(run('APPROVED', 'CANCELLED_BY_CUSTOMER', customer, at(-25 * H))).toBeTruthy();
    expect(codeOf(() => run('APPROVED', 'CANCELLED_BY_CUSTOMER', customer, at(-24 * H)))).toBe(
      'CANCELLATION_WINDOW_PASSED',
    );
    expect(codeOf(() => run('APPROVED', 'CANCELLED_BY_CUSTOMER', customer, at(-H)))).toBe(
      'CANCELLATION_WINDOW_PASSED',
    );
    expect(run('APPROVED', 'CANCELLED_BY_CUSTOMER', customer, at(-H), undefined, 0)).toBeTruthy();
  });

  it('the salon cancels an approved booking before the start, with a reason', () => {
    const m = member('BOOKINGS_OPERATE');
    expect(run('APPROVED', 'CANCELLED_BY_SALON', m, at(-1), 'closed')).toMatchObject({
      reason: 'closed',
    });
    expect(codeOf(() => run('APPROVED', 'CANCELLED_BY_SALON', m, at(-1)))).toBe('VALIDATION_ERROR');
    expect(codeOf(() => run('APPROVED', 'CANCELLED_BY_SALON', m, at(0), 'late'))).toBe(
      'INVALID_TRANSITION',
    );
  });

  it('complete and no-show only at or after the start', () => {
    const m = member('BOOKINGS_OPERATE');
    for (const to of ['COMPLETED', 'NO_SHOW'] as const) {
      expect(codeOf(() => run('APPROVED', to, m, at(-1)))).toBe('INVALID_TRANSITION');
      expect(run('APPROVED', to, m, at(0))).toMatchObject({ status: to });
    }
    expect(codeOf(() => run('APPROVED', 'COMPLETED', member('BOOKINGS_RESPOND'), at(0)))).toBe(
      'PERMISSION_DENIED',
    );
  });

  it('the system auto-cancels a pending booking only from respondBy on', () => {
    expect(codeOf(() => run('PENDING', 'AUTO_CANCELLED', system, at(H - 1)))).toBe(
      'INVALID_TRANSITION',
    );
    expect(run('PENDING', 'AUTO_CANCELLED', system, at(H))).toMatchObject({ actorType: 'SYSTEM' });
    expect(codeOf(() => run('PENDING', 'AUTO_CANCELLED', customer, at(H)))).toBe(
      'PERMISSION_DENIED',
    );
  });

  it('already decided and impossible moves are told apart', () => {
    const m = member('BOOKINGS_RESPOND', 'BOOKINGS_OPERATE');
    expect(codeOf(() => run('APPROVED', 'APPROVED', m, at(-H)))).toBe('ALREADY_HANDLED');
    expect(codeOf(() => run('REJECTED', 'APPROVED', m, at(-H)))).toBe('ALREADY_HANDLED');
    expect(codeOf(() => run('COMPLETED', 'CANCELLED_BY_SALON', m, at(H), 'x'))).toBe(
      'ALREADY_HANDLED',
    );
    expect(codeOf(() => run('PENDING', 'COMPLETED', m, at(H)))).toBe('INVALID_TRANSITION');
  });

  it('an admin may move any booking, always with a reason', () => {
    const admin: Actor = { type: 'ADMIN', id: 'a1' };
    expect(run('COMPLETED', 'CANCELLED_BY_SALON', admin, at(H), 'fix')).toMatchObject({
      actorType: 'ADMIN',
    });
    expect(codeOf(() => run('PENDING', 'APPROVED', admin, at(0)))).toBe('VALIDATION_ERROR');
    expect(codeOf(() => run('PENDING', 'PENDING', admin, at(0), 'x'))).toBe('ALREADY_HANDLED');
  });

  it('lists the next statuses without the clock', () => {
    expect(nextStatuses('PENDING').sort()).toEqual([
      'APPROVED',
      'AUTO_CANCELLED',
      'CANCELLED_BY_CUSTOMER',
      'REJECTED',
    ]);
    expect(nextStatuses('NO_SHOW')).toEqual([]);
  });
});
