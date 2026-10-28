import { useId, type ComponentProps, type ReactNode } from 'react';
import type { IconName } from '@/constants/icons';
import { cx } from '../../utils/cx';
import { Icon } from '../core/Icon';

export interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: string;
  /** Control shown inside the field at the end (e.g. show/hide password). */
  endSlot?: ReactNode;
  /** Decorative icon inside the field at the start (design: mail, lock). */
  startIcon?: IconName;
}

export function TextField({
  label,
  error,
  hint,
  endSlot,
  startIcon,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx('wab-field', error && 'wab-field--error', className)}>
      <label className="wab-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="wab-field__box">
        <input
          id={id}
          className={cx(
            'wab-field__control',
            endSlot ? 'wab-field__control--with-end' : false,
            startIcon ? 'wab-field__control--with-start' : false,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {startIcon ? (
          <span className="wab-field__start">
            <Icon name={startIcon} size="sm" />
          </span>
        ) : null}
        {endSlot ? <span className="wab-field__end">{endSlot}</span> : null}
      </div>
      {error ? (
        <span id={`${id}-error`} className="wab-field__error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="wab-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
