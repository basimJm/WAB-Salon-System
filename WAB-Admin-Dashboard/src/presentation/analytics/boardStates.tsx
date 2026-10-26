import type { ReactNode } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { Skeleton } from '../components/feedback/Skeleton';

/**
 * Panel body for a card whose chart is still loading (skeleton) or failed (error), keyed by the card id; empty
 * once the chart is ready (the page then passes the chart itself).
 */
export function pendingOrError(
  state: { pending: boolean; error: unknown },
  cardId: string,
): Record<string, ReactNode> {
  if (state.error !== null && state.error !== undefined)
    return { [cardId]: <ErrorState error={state.error} /> };
  if (state.pending) return { [cardId]: <Skeleton height="lg" /> };
  return {};
}
