import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '../../utils/cx';
import { toggleKey } from '../../utils/selection';
import { SelectBox } from './SelectBox';
import type { Column, TableSelection } from './tableTypes';

export interface TableRowProps<Row> {
  row: Row;
  rowId: string;
  columns: readonly Column<Row>[];
  selection?: TableSelection<Row> | undefined;
  actions?: ((row: Row) => ReactNode) | undefined;
  onRowClick?: ((row: Row) => void) | undefined;
}

export function TableRow<Row>({
  row,
  rowId,
  columns,
  selection,
  actions,
  onRowClick,
}: TableRowProps<Row>) {
  const { t } = useTranslation();
  const checked = selection?.selected.has(rowId) ?? false;
  return (
    <tr
      className={cx(onRowClick && 'wab-table__row--click', checked && 'wab-table__row--selected')}
      aria-selected={selection ? checked : undefined}
      {...(onRowClick
        ? {
            onClick: () => onRowClick(row),
            tabIndex: 0,
            onKeyDown: (event) => {
              // Enter inside a checkbox or action button belongs to that control, not to the row.
              if (event.key === 'Enter' && event.target === event.currentTarget) onRowClick(row);
            },
          }
        : {})}
    >
      {selection ? (
        <td className="wab-table__select">
          <SelectBox
            label={t('table.selectRow', { name: selection.rowLabel(row) })}
            checked={checked}
            onChange={() => selection.onChange(toggleKey(selection.selected, rowId))}
          />
        </td>
      ) : null}
      {columns.map((c) => (
        <td key={c.key} dir={c.ltr ? 'ltr' : undefined}>
          {c.render(row)}
        </td>
      ))}
      {actions ? (
        <td className="wab-table__actions" onClick={(event) => event.stopPropagation()}>
          {actions(row)}
        </td>
      ) : null}
    </tr>
  );
}
