import type { ReactNode } from 'react';
import type { Language } from '@/constants/i18n';
import { formatNumber } from '@/domain/shared/format';
import { Icon } from '../core/Icon';

/** First visible character, upper-cased (Arabic letters stay as they are). */
export const initialOf = (name: string): string =>
  Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '';

/** Design table "user" cell: initial on a soft square, the name, an optional second line and badge. */
export function EntityCell({
  name,
  sub,
  badge,
}: {
  name: string;
  sub?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <span className="wab-entity">
      <span className="wab-entity__initial" aria-hidden="true">
        {initialOf(name)}
      </span>
      <span className="wab-entity__text">
        <span className="wab-entity__name">{name}</span>
        {sub ? <span className="wab-entity__sub">{sub}</span> : null}
        {badge}
      </span>
    </span>
  );
}

/** Design "stars" cell: amber star, the average and the number of reviews. */
export function RatingCell({
  avg,
  count,
  language,
}: {
  avg: number;
  count: number;
  language: Language;
}) {
  return (
    <span className="wab-rating">
      <Icon name="star" size="sm" />
      <span className="wab-rating__avg">{formatNumber(avg, language)}</span>
      <span className="wab-rating__count">({formatNumber(count, language)})</span>
    </span>
  );
}
