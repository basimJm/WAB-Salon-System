import { MS_PER_DAY } from '../../constants/time';
import { demoId } from './random';
import type { DemoContext, DemoDataset, DemoDoc } from './types';

/** The last transferred payout ends this many days before the seed run; the rest is still owed. */
const SETTLED_UNTIL_DAYS_AGO = 14;
const TRANSFER_DELAY_DAYS = 2;
const PENDING_UNTIL_DAYS_AGO = 1;
const TRANSFER_REFERENCE_PREFIX = 'DEMO-TRF-';

const sum = (entries: readonly DemoDoc[], type: string): number =>
  entries
    .filter((e) => e['type'] === type)
    .reduce((total, e) => total + (e['amount'] as number), 0);

/**
 * Manual payouts from the salons' ledger, as the admin would have made them: one transferred for
 * the older period (with its PAYOUT ledger line) and one pending for the recent period of the
 * salon that earned most. `net = gross − fees − refunds` (no adjustments in the demo).
 */
export const buildPayouts = (ctx: DemoContext, data: DemoDataset): void => {
  const settledUntil = new Date(ctx.now.getTime() - SETTLED_UNTIL_DAYS_AGO * MS_PER_DAY);
  const pendingUntil = new Date(ctx.now.getTime() - PENDING_UNTIL_DAYS_AGO * MS_PER_DAY);
  const bySalon = new Map<string, DemoDoc[]>();
  for (const entry of data.LedgerEntry) {
    const key = String(entry['salonId']);
    bySalon.set(key, [...(bySalon.get(key) ?? []), entry]);
  }
  const ranked = [...bySalon.entries()].sort((a, b) => sum(b[1], 'CHARGE') - sum(a[1], 'CHARGE'));
  ranked.forEach(([salonKey, entries], rank) => {
    const salonId = entries[0]?.['salonId'];
    const periodFrom = new Date(
      Math.min(...entries.map((e) => (e['createdAt'] as Date).getTime())),
    );
    const periods = [
      { label: 'settled', from: periodFrom, to: settledUntil, transferred: true },
      ...(rank === 0
        ? [{ label: 'pending', from: settledUntil, to: pendingUntil, transferred: false }]
        : []),
    ];
    for (const period of periods) {
      const inPeriod = entries.filter((e) => {
        const at = (e['createdAt'] as Date).getTime();
        return at >= period.from.getTime() && at < period.to.getTime();
      });
      const gross = sum(inPeriod, 'CHARGE');
      const fees = -sum(inPeriod, 'GATEWAY_FEE');
      const refunds = -sum(inPeriod, 'REFUND');
      const net = gross - fees - refunds;
      if (net <= 0) continue;
      const id = demoId(`payout:${salonKey}:${period.label}`);
      const transferredAt = new Date(period.to.getTime() + TRANSFER_DELAY_DAYS * MS_PER_DAY);
      data.Payout.push({
        _id: id,
        salonId,
        periodFrom: period.from,
        periodTo: period.to,
        gross,
        fees,
        refunds,
        adjustments: 0,
        net,
        status: period.transferred ? 'TRANSFERRED' : 'PENDING',
        ...(period.transferred
          ? {
              transferredAt,
              transferReference: `${TRANSFER_REFERENCE_PREFIX}${id.toString().slice(-6).toUpperCase()}`,
            }
          : {}),
        createdBy: ctx.adminId,
        createdAt: period.to,
      });
      if (period.transferred) {
        data.LedgerEntry.push({
          _id: demoId(`ledger:payout:${id.toString()}`),
          salonId,
          type: 'PAYOUT',
          amount: -net,
          payoutId: id,
          createdAt: transferredAt,
        });
      }
    }
  });
};
