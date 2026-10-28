import type { HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('wab-card', className)} {...rest} />;
}
