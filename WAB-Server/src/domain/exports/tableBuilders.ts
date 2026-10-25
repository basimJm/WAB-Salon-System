import { EXPORT_MAX_ROWS, EXPORT_PAGE_SIZE, type ExportKind } from '../../constants/exports';
import { formatJod } from '../../utils/money';
import type { AdminSettingsService } from '../adminSettings/adminSettings.service';
import type { AdminTransactionsService } from '../finance/adminTransactions.service';
import type { BookingQueriesService } from '../bookings/bookingQueries.service';
import type { DailyFacts } from '../reports/reportSource';
import type { ReportsService } from '../reports/reports.service';
import type { Cell, ExportTable } from './writers';

/** Thrown while building a table that would not fit one export. */
export class TooManyRowsError extends Error {
  constructor() {
    super('too many rows');
    this.name = 'TooManyRowsError';
  }
}

export type TableBuilder = (params: Record<string, unknown>) => Promise<ExportTable>;
export type TableBuilders = Readonly<Record<ExportKind, TableBuilder>>;

const REPORT_COLUMNS = ['Section', 'Metric', 'Value'] as const;

/** Flattens a report's figures into Section / Metric / Value rows (money as JOD text). */
export const factRows = (f: DailyFacts): Cell[][] => [
  ['Bookings', 'Total', f.bookings.total],
  ...Object.entries(f.bookings.byStatus).map(([status, n]): Cell[] => ['Bookings', status, n]),
  ['Bookings', 'With bride', f.bookings.bride],
  ['Payments', 'Attempts', f.payments.attempts],
  ['Payments', 'Succeeded', f.payments.succeeded],
  ['Payments', 'Failed', f.payments.failed],
  ['Payments', 'Cancelled', f.payments.cancelled],
  ['Payments', 'Collected (JOD)', formatJod(f.payments.collected)],
  ['Payments', 'Gateway fees (JOD)', formatJod(f.payments.gatewayFees)],
  ['Refunds', 'Created', f.refunds.created],
  ['Refunds', 'Completed', f.refunds.completed],
  ['Refunds', 'Failed', f.refunds.failed],
  ['Refunds', 'Amount (JOD)', formatJod(f.refunds.amount)],
  ['Registrations', 'Customers', f.registrations.customers],
  ['Registrations', 'Salon applications', f.registrations.applications],
  ['Reviews', 'Submitted', f.reviews.submitted],
];

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const optionalDate = (value: unknown): Date | undefined =>
  typeof value === 'string' ? new Date(value) : undefined;

/** Pages through a list until it ends; more than `EXPORT_MAX_ROWS` rows is an error. */
const collect = async <T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number }>,
): Promise<T[]> => {
  const all: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchPage(page);
    if (result.total > EXPORT_MAX_ROWS) throw new TooManyRowsError();
    all.push(...result.items);
    if (result.items.length === 0 || all.length >= result.total) return all;
  }
};

export const createTableBuilders = (deps: {
  reports: Pick<ReportsService, 'daily' | 'weekly' | 'monthly'>;
  transactions: Pick<AdminTransactionsService, 'list'>;
  adminSettings: Pick<AdminSettingsService, 'auditLogs'>;
  bookings: Pick<BookingQueriesService, 'list'>;
}): TableBuilders => ({
  async REPORT_DAILY(params) {
    const r = await deps.reports.daily(text(params['date']));
    return { title: `Daily report ${r.date}`, columns: REPORT_COLUMNS, rows: factRows(r.facts) };
  },
  async REPORT_WEEKLY(params) {
    const r = await deps.reports.weekly(text(params['from']));
    return {
      title: `Weekly report ${r.from} to ${r.to}`,
      columns: REPORT_COLUMNS,
      rows: [
        ...factRows(r.facts),
        ...r.topSalons.map((s): Cell[] => ['Top salons', s.salonId, s.bookings]),
      ],
    };
  },
  async REPORT_MONTHLY(params) {
    const r = await deps.reports.monthly(text(params['month']));
    return {
      title: `Monthly report ${r.month}`,
      columns: REPORT_COLUMNS,
      rows: [
        ...factRows(r.facts),
        ['Payouts', 'Transferred', r.payouts.count],
        ['Payouts', 'Amount (JOD)', formatJod(r.payouts.amount)],
        ['Subscriptions', 'Trial', r.snapshot.subscriptions.trial],
        ['Subscriptions', 'Active', r.snapshot.subscriptions.active],
        ['Subscriptions', 'Expired', r.snapshot.subscriptions.expired],
        ...r.topSalons.map((s): Cell[] => ['Top salons', s.salonId, s.bookings]),
      ],
    };
  },
  async TRANSACTIONS(params) {
    const filter = {
      status: params['status'] as never,
      type: params['type'] as never,
      salonId: params['salonId'] as string | undefined,
      branchId: params['branchId'] as string | undefined,
      customerId: params['customerId'] as string | undefined,
      bookingId: params['bookingId'] as string | undefined,
      from: optionalDate(params['from']),
      to: optionalDate(params['to']),
    };
    const items = await collect((page) =>
      deps.transactions.list({ params: { page, pageSize: EXPORT_PAGE_SIZE }, filter }),
    );
    return {
      title: 'Transactions',
      columns: [
        'Time',
        'Salon',
        'Branch',
        'Customer',
        'Booking',
        'Type',
        'Amount (JOD)',
        'Status',
        'Gateway code',
        'Fee (JOD)',
        'Attempt',
      ],
      rows: items.map((t): Cell[] => [
        t.createdAt.toISOString(),
        t.salonId,
        t.branchId ?? null,
        t.customerId,
        t.bookingId ?? null,
        t.type,
        formatJod(t.amount),
        t.status,
        t.gatewayCode ?? null,
        t.gatewayFee === undefined ? null : formatJod(t.gatewayFee),
        t.attempt,
      ]),
    };
  },
  async AUDIT_LOGS(params) {
    const filter = {
      adminId: params['adminId'] as string | undefined,
      action: params['action'] as string | undefined,
      entityType: params['entityType'] as string | undefined,
      entityId: params['entityId'] as string | undefined,
      from: optionalDate(params['from']),
      to: optionalDate(params['to']),
    };
    const items = await collect((page) =>
      deps.adminSettings.auditLogs({ filter, params: { page, pageSize: EXPORT_PAGE_SIZE } }),
    );
    return {
      title: 'Audit log',
      columns: ['Time', 'Admin', 'Action', 'Entity type', 'Entity', 'Reason', 'IP'],
      rows: items.map((a): Cell[] => [
        a.createdAt.toISOString(),
        a.adminId,
        a.action,
        a.entityType,
        a.entityId,
        a.reason,
        a.ip,
      ]),
    };
  },
  async BOOKINGS(params) {
    const query = {
      statuses: params['statuses'] as never,
      paymentStatus: params['paymentStatus'] as never,
      salonId: params['salonId'] as string | undefined,
      customerId: params['customerId'] as string | undefined,
      from: typeof params['from'] === 'string' ? params['from'] : undefined,
      to: typeof params['to'] === 'string' ? params['to'] : undefined,
      q: typeof params['q'] === 'string' ? params['q'] : undefined,
    };
    const items = await collect((page) =>
      deps.bookings.list({
        audience: { kind: 'ADMIN' },
        query,
        params: { page, pageSize: EXPORT_PAGE_SIZE },
        language: 'en',
      }),
    );
    return {
      title: 'Bookings',
      columns: [
        'Reference',
        'Status',
        'Appointment start',
        'Salon',
        'Customer',
        'Phone',
        'Persons',
        'Staff',
        'Payment',
        'Payment status',
        'Total (JOD)',
      ],
      rows: items.map((b): Cell[] => [
        b.referenceNumber,
        b.status,
        b.appointmentStart,
        b.salon?.name ?? null,
        b.customer?.name ?? null,
        b.customer?.phone ?? null,
        b.personsCount,
        b.staff.map((s) => s.name).join(', '),
        b.paymentMethod,
        b.paymentStatus,
        b.total,
      ]),
    };
  },
});
