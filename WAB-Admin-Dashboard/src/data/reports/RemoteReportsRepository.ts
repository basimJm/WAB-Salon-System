import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { ReportsRepository } from '@/domain/reports/reports';

const O = OPERATIONS;
const daily = defineEndpoint(O.getReportsDaily, {
  data: dto.getReportsDailyDataSchema,
  query: dto.getReportsDailyQuerySchema,
});
const weekly = defineEndpoint(O.getReportsWeekly, {
  data: dto.getReportsWeeklyDataSchema,
  query: dto.getReportsWeeklyQuerySchema,
});
const monthly = defineEndpoint(O.getReportsMonthly, {
  data: dto.getReportsMonthlyDataSchema,
  query: dto.getReportsMonthlyQuerySchema,
});

export class RemoteReportsRepository implements ReportsRepository {
  constructor(private readonly api: ApiClient) {}

  daily: ReportsRepository['daily'] = async (date) =>
    (await this.api.execute(daily, { query: { date } })).data;

  weekly: ReportsRepository['weekly'] = async (from) =>
    (await this.api.execute(weekly, { query: { from } })).data;

  monthly: ReportsRepository['monthly'] = async (month) =>
    (await this.api.execute(monthly, { query: { month } })).data;
}
