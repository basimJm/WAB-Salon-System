import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Page } from '@/domain/shared/page';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import type { ListController } from '../controllers/useListController';
import { LocationDrawer } from './LocationDrawer';
import { LocationsTable } from './LocationsTable';
import { toName, useLocationForm } from './useLocationForm';
import { useResourcePanel } from '../hooks/useResourcePanel';
import { useParentOptions } from './useParentOptions';

interface Child {
  id: string;
  name: { ar: string; en: string };
  active: boolean;
  sortOrder: number;
}

export interface ChildValues {
  parent: string;
  name: { ar: string; en: string };
  active: boolean;
  sortOrder: number;
}

export interface ChildLocationPageProps<T extends Child> {
  /** Which parent this kind hangs under: cities under a country, areas under a city. */
  parentKind: 'countries' | 'cities';
  list: ListController;
  filterKey: string;
  title: string;
  parentOf: (row: T) => string;
  queryName: string;
  load: (parent: string | undefined, page: number, pageSize: number) => Promise<Page<T>>;
  save: (editing: T | null, values: ChildValues, reason: string) => Promise<unknown>;
}

/** Shared screen of a location that belongs to a parent (cities, areas): parent filter, parent chosen at creation. */
export function ChildLocationPage<T extends Child /* hardcoded-ok: generic, not JSX */>(
  props: ChildLocationPageProps<T>,
) {
  const { t } = useTranslation();
  const { list, filterKey, parentKind } = props;
  const options = useParentOptions(parentKind);
  const parent = list.state.filters[filterKey]?.[0];
  const resource = useResourcePanel<T, ChildValues>(list.state, {
    queryName: props.queryName,
    load: (s) => props.load(parent, s.page, s.pageSize),
    save: props.save,
  });
  const parentLabel = (value: string) => options.find((o) => o.value === value)?.label ?? value;
  const columns: Column<T>[] = [
    {
      key: 'parent',
      header: t(`locations.parent.${parentKind}`),
      render: (r) => parentLabel(props.parentOf(r)),
    },
  ];
  return (
    <>
      <LocationsTable<T>
        title={props.title}
        list={list}
        state={list.state}
        query={resource.query}
        extraColumns={columns}
        filter={{
          controls: (
            <Select
              label={t(`locations.parent.${parentKind}`)}
              value={parent ?? ''}
              options={[{ value: '', label: t('locations.all') }, ...options]}
              onChange={(e) => list.setFilter(filterKey, e.target.value ? [e.target.value] : [])}
            />
          ),
          active: parent
            ? [
                {
                  key: filterKey,
                  label: `${t(`locations.parent.${parentKind}`)}: ${parentLabel(parent)}`,
                  onRemove: () => list.setFilter(filterKey, []),
                },
              ]
            : [],
        }}
        onCreate={resource.openCreate}
        onEdit={resource.openEdit}
      />
      {resource.panel ? (
        <ChildDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          parentKind={parentKind}
          options={options}
          defaultParent={parent}
          parentOf={props.parentOf}
          resource={resource}
        />
      ) : null}
    </>
  );
}

interface DrawerProps<T extends Child> {
  item: T | null;
  parentKind: 'countries' | 'cities';
  options: { value: string; label: string }[];
  defaultParent: string | undefined;
  parentOf: (row: T) => string;
  resource: {
    saving: boolean;
    saveError: unknown;
    close: () => void;
    submit: (v: ChildValues, reason: string) => void;
  };
}

function ChildDrawer<T extends Child>({
  item,
  parentKind,
  options,
  defaultParent,
  parentOf,
  resource,
}: DrawerProps<T>) {
  const { t } = useTranslation();
  const form = useLocationForm(item);
  const [parent, setParent] = useState(item ? parentOf(item) : (defaultParent ?? ''));
  const [parentError, setParentError] = useState<string>();
  const submit = () => {
    const missing = !item && !parent;
    setParentError(missing ? t('locations.error.required') : undefined);
    if (!form.check() || missing) return;
    resource.submit(
      {
        parent,
        name: toName(form.values),
        active: form.values.active,
        sortOrder: Number(form.values.sortOrder),
      },
      form.values.reason.trim(),
    );
  };
  return (
    <LocationDrawer
      open
      title={t(item ? `locations.editTitle.${parentKind}` : `locations.addTitle.${parentKind}`)}
      form={form}
      saving={resource.saving}
      error={resource.saveError}
      onSubmit={submit}
      onClose={resource.close}
    >
      <Select
        label={t(`locations.parent.${parentKind}`)}
        value={parent}
        disabled={item !== null}
        error={parentError}
        options={[{ value: '', label: t('locations.choose') }, ...options]}
        onChange={(e) => setParent(e.target.value)}
      />
    </LocationDrawer>
  );
}
