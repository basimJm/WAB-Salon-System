import { isAnalyticsError } from '../src/errors';
import type { StoredEvent } from '../src/types';

export const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return isAnalyticsError(error) ? error.code : 'NOT_ANALYTICS';
  }
  return 'NO_ERROR';
};

export const codeOfAsync = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return isAnalyticsError(error) ? error.code : 'NOT_ANALYTICS';
  }
  return 'NO_ERROR';
};

export const at = (iso: string): Date => new Date(iso);

export const ev = (
  name: string,
  iso: string,
  extra: Partial<Omit<StoredEvent, 'name' | 'ts'>> = {},
): StoredEvent => ({
  name,
  ts: new Date(iso),
  actorType: 'CUSTOMER',
  params: {},
  ...extra,
});

export const sleepless = (): { sleep: (ms: number) => Promise<void>; slept: number[] } => {
  const slept: number[] = [];
  return {
    slept,
    sleep: (ms) => {
      slept.push(ms);
      return Promise.resolve();
    },
  };
};
