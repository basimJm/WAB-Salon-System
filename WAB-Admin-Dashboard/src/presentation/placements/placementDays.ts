import { addDays, localDateOf, parseInstant } from '@/domain/shared/time';

/** An instant shown as an Amman calendar day; an end instant is the start of the NEXT day, so it shows the day before. */
export function instantDay(iso: string, isEnd: boolean): string {
  if (!iso) return '';
  const day = localDateOf(parseInstant(iso));
  return isEnd ? addDays(day, -1) : day;
}
