import { calculateAmounts, type PaymentOption } from '../src/domain/pricing/pricing';
import { createRandom, randomBetween } from './helpers/random';

const svc = (price: number, durationMinutes = 30): { price: number; durationMinutes: number } => ({
  price,
  durationMinutes,
});

describe('calculateAmounts', () => {
  it('sums services per person and persons into the total', () => {
    const out = calculateAmounts({
      persons: [{ services: [svc(12500, 45), svc(7500, 30)] }, { services: [svc(10000, 60)] }],
      paymentOption: 'PAY_ON_ARRIVAL',
    });
    expect(out.persons).toEqual([
      { subtotal: 20000, durationMinutes: 75 },
      { subtotal: 10000, durationMinutes: 60 },
    ]);
    expect(out.total).toBe(30000);
  });

  it('pay on arrival: nothing online, everything remaining', () => {
    const out = calculateAmounts({
      persons: [{ services: [svc(30000)] }],
      paymentOption: 'PAY_ON_ARRIVAL',
      depositPercentage: 20,
    });
    expect(out).toMatchObject({ deposit: 6000, dueOnline: 0, remaining: 30000 });
  });

  it('deposit: the share of the total is due online, the rest at the salon', () => {
    const out = calculateAmounts({
      persons: [{ services: [svc(30000)] }],
      paymentOption: 'DEPOSIT',
      depositPercentage: 20,
    });
    expect(out).toMatchObject({ total: 30000, deposit: 6000, dueOnline: 6000, remaining: 24000 });
  });

  it('full online: the whole total is due, nothing remains', () => {
    const out = calculateAmounts({
      persons: [{ services: [svc(30000)] }],
      paymentOption: 'FULL_ONLINE',
      depositPercentage: 25,
    });
    expect(out).toMatchObject({ deposit: 7500, dueOnline: 30000, remaining: 0 });
  });

  it('full online without any deposit policy has a zero deposit', () => {
    const out = calculateAmounts({
      persons: [{ services: [svc(1234)] }],
      paymentOption: 'FULL_ONLINE',
    });
    expect(out).toMatchObject({ deposit: 0, dueOnline: 1234, remaining: 0 });
  });

  it.each([
    // total fils, percent, expected deposit (half-up to one fils)
    [1, 50, 1], // 0.5 rounds up
    [3, 50, 2], // 1.5 -> 2
    [999, 10, 100], // 99.9 -> 100
    [1005, 10, 101], // 100.5 -> 101
    [1004, 10, 100], // 100.4 -> 100
    [12345, 33, 4074], // 4073.85 -> 4074
    [100, 100, 100],
    [0, 20, 0],
  ])('deposit of %i fils at %i%% is %i fils', (total, percent, expected) => {
    const out = calculateAmounts({
      persons: [{ services: [svc(total)] }],
      paymentOption: 'DEPOSIT',
      depositPercentage: percent,
    });
    expect(out.deposit).toBe(expected);
    expect(out.dueOnline + out.remaining).toBe(total);
  });

  it('rounds the deposit once on the total, not once per person', () => {
    // Per person 0.5 would round to 1 each (2 in total); on the total 1 × 50% rounds once to 1.
    const out = calculateAmounts({
      persons: [{ services: [svc(1)] }, { services: [svc(1)] }],
      paymentOption: 'DEPOSIT',
      depositPercentage: 50,
    });
    expect(out.total).toBe(2);
    expect(out.deposit).toBe(1);
  });

  it('a free service (price 0) is allowed', () => {
    const out = calculateAmounts({
      persons: [{ services: [svc(0), svc(500)] }],
      paymentOption: 'FULL_ONLINE',
    });
    expect(out.total).toBe(500);
  });

  it.each<[string, Parameters<typeof calculateAmounts>[0]]>([
    ['no persons', { persons: [], paymentOption: 'PAY_ON_ARRIVAL' }],
    ['a person without services', { persons: [{ services: [] }], paymentOption: 'PAY_ON_ARRIVAL' }],
    ['a negative price', { persons: [{ services: [svc(-1)] }], paymentOption: 'PAY_ON_ARRIVAL' }],
    ['a zero duration', { persons: [{ services: [svc(1, 0)] }], paymentOption: 'PAY_ON_ARRIVAL' }],
    [
      'a fractional duration',
      { persons: [{ services: [svc(1, 7.5)] }], paymentOption: 'PAY_ON_ARRIVAL' },
    ],
    [
      'a deposit without a percentage',
      { persons: [{ services: [svc(1)] }], paymentOption: 'DEPOSIT' },
    ],
    [
      'a percentage above 100',
      { persons: [{ services: [svc(1)] }], paymentOption: 'DEPOSIT', depositPercentage: 101 },
    ],
  ])('rejects %s', (_name, input) => {
    expect(() => calculateAmounts(input)).toThrow();
  });

  it('rejects non-integer prices (no floats in money)', () => {
    expect(() =>
      calculateAmounts({ persons: [{ services: [svc(10.5)] }], paymentOption: 'PAY_ON_ARRIVAL' }),
    ).toThrow(TypeError);
  });

  it('keeps the invariants for random bookings', () => {
    const rand = createRandom(20261013);
    const options: PaymentOption[] = ['PAY_ON_ARRIVAL', 'DEPOSIT', 'FULL_ONLINE'];
    for (let i = 0; i < 500; i += 1) {
      const persons = Array.from({ length: randomBetween(rand, 1, 6) }, () => ({
        services: Array.from({ length: randomBetween(rand, 1, 4) }, () =>
          svc(randomBetween(rand, 0, 500000), randomBetween(rand, 1, 8) * 15),
        ),
      }));
      const percent = randomBetween(rand, 1, 100);
      const paymentOption = options[randomBetween(rand, 0, 2)] ?? 'DEPOSIT';
      const out = calculateAmounts({ persons, paymentOption, depositPercentage: percent });
      const expectedTotal = persons.flatMap((p) => p.services).reduce((t, s) => t + s.price, 0);
      expect(out.total).toBe(expectedTotal);
      expect(out.persons.reduce((t, p) => t + p.subtotal, 0)).toBe(out.total);
      expect(out.dueOnline + out.remaining).toBe(out.total);
      expect(out.deposit).toBeGreaterThanOrEqual(0);
      expect(out.deposit).toBeLessThanOrEqual(out.total);
      // Exact half-up check without floating point: 2*deposit is within one unit of 2*total*pct/100.
      expect(Math.abs(200 * out.deposit - 2 * out.total * percent)).toBeLessThanOrEqual(100);
      if (paymentOption === 'FULL_ONLINE') expect(out.dueOnline).toBe(out.total);
      if (paymentOption === 'PAY_ON_ARRIVAL') expect(out.dueOnline).toBe(0);
      if (paymentOption === 'DEPOSIT') expect(out.dueOnline).toBe(out.deposit);
    }
  });
});
