import type { HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export type TextTone = 'default' | 'muted' | 'faint' | 'accent' | 'success' | 'danger';
export type TextSize = 'sm' | 'base' | 'md';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div';
  tone?: TextTone;
  size?: TextSize;
  strong?: boolean;
  /** Render left-to-right inside Arabic text (ids, phone numbers, amounts, emails). */
  ltr?: boolean;
}

/** Body text. Use instead of ad-hoc `<p>` / `<span>` classes so size, color and weight come from tokens. */
export function Text({
  as: Tag = 'p',
  tone = 'default',
  size = 'base',
  strong = false,
  ltr = false,
  className,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={cx(
        'wab-text',
        `wab-text--${tone}`,
        `wab-text--${size}`,
        strong && 'wab-text--strong',
        className,
      )}
      dir={ltr ? 'ltr' : undefined}
      {...rest}
    />
  );
}
