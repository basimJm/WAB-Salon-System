import type { ReactNode } from 'react';
import type { ToneName } from '@/design/tokens/colors';

export function Badge({ tone = 'grey', children }: { tone?: ToneName; children: ReactNode }) {
  return <span className={`wab-badge wab-badge--${tone}`}>{children}</span>;
}
