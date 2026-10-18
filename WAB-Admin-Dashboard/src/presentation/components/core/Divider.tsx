import { cx } from '../../utils/cx';

export function Divider({
  vertical = false,
  className,
}: {
  vertical?: boolean;
  className?: string;
}) {
  return (
    <hr
      className={cx('wab-divider', vertical && 'wab-divider--vertical', className)}
      aria-orientation={vertical ? 'vertical' : undefined}
    />
  );
}
