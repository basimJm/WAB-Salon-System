import { cx } from '../../utils/cx';
import { initialsOf } from '../../utils/initials';

export interface AvatarProps {
  /** Person or salon name: used for the initials and the accessible name. */
  name: string;
  /** Picture URL; the initials show when it is missing. */
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cx('wab-avatar', `wab-avatar--${size}`, className)}
      role="img"
      aria-label={name}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}
