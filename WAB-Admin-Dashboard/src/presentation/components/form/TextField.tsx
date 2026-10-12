import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export function TextField({ label, error, hint, className, ...rest }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx('wab-field', error && 'wab-field--error', className)}>
      <label className="wab-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="wab-field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
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
