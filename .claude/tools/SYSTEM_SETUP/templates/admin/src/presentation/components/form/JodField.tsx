import type { FocusEventHandler } from 'react';
import { JOD_DECIMAL_PLACES } from '@/constants/kernel';
import { sanitizeDecimal } from '../../utils/numericInput';
import { Field } from './Field';

export interface JodFieldProps {
  label: string;
  /** JOD decimal string (`"12.500"`), `""` when empty. Never a float. */
  value: string;
  onValueChange: (value: string) => void;
  /** Currency name shown after the input (translated by the caller). */
  currencyLabel?: string;
  error?: string | undefined;
  hint?: string | undefined;
  name?: string;
  disabled?: boolean;
  onBlur?: FocusEventHandler<HTMLInputElement>;
}

/** Money input: edits a JOD string with at most 3 decimals; validation (positive, range) lives in the schema. */
export function JodField({
  label,
  value,
  onValueChange,
  currencyLabel,
  error,
  hint,
  name,
  disabled,
  onBlur,
}: JodFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(control) => (
        <div className="wab-field__box">
          <input
            {...control}
            className="wab-field__control wab-field__control--with-end"
            name={name}
            disabled={disabled}
            inputMode="decimal"
            autoComplete="off"
            dir="ltr"
            value={value}
            onBlur={onBlur}
            onChange={(event) =>
              onValueChange(
                sanitizeDecimal(event.target.value, { maxDecimals: JOD_DECIMAL_PLACES }),
              )
            }
          />
          {currencyLabel ? (
            <span className="wab-field__end wab-field__unit">{currencyLabel}</span>
          ) : null}
        </div>
      )}
    </Field>
  );
}
