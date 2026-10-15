import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { Country } from '@/domain/locations/locations';
import { useListController } from '../controllers/useListController';
import { TextField } from '../components/form/TextField';
import { LocationDrawer } from './LocationDrawer';
import { LocationsTable } from './LocationsTable';
import { toName, useLocationForm } from './useLocationForm';
import { useLocationResource } from './useLocationResource';
import { useState } from 'react';

const OPTIONS = { filterKeys: [] as string[] };
const CODE = /^[A-Z]{2}$/;
const DIAL = /^\+[1-9][0-9]{0,3}$/;

function regexError(source: string): string | undefined {
  if (!source.trim()) return 'locations.error.required';
  try {
    new RegExp(source);
    return undefined;
  } catch {
    return 'locations.error.regex';
  }
}

interface Extras {
  code: string;
  dialCode: string;
  flagKey: string;
  phoneRegex: string;
}

function CountryDrawer({
  item,
  resource,
}: {
  item: Country | null;
  resource: ReturnType<typeof useCountryResource>;
}) {
  const { t } = useTranslation();
  const form = useLocationForm(item);
  const [x, setX] = useState<Extras>({
    code: item?.code ?? '',
    dialCode: item?.dialCode ?? '',
    flagKey: item?.flagKey ?? '',
    phoneRegex: item?.phoneRegex ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Extras, string>>>({});
  const msg = (k?: string) => (k ? t(k) : undefined);
  const submit = () => {
    const e: Partial<Record<keyof Extras, string>> = {};
    if (!item && !CODE.test(x.code)) e.code = 'locations.error.code';
    if (!DIAL.test(x.dialCode)) e.dialCode = 'locations.error.dial';
    if (!x.flagKey.trim()) e.flagKey = 'locations.error.required';
    const re = regexError(x.phoneRegex);
    if (re) e.phoneRegex = re;
    setErrors(e);
    if (!form.check() || Object.keys(e).length > 0) return;
    resource.submit(
      {
        ...x,
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
      title={t(item ? 'locations.editCountry' : 'locations.addCountry')}
      form={form}
      saving={resource.saving}
      error={resource.saveError}
      onSubmit={submit}
      onClose={resource.close}
    >
      <TextField
        label={t('locations.code')}
        dir="ltr"
        maxLength={2}
        disabled={item !== null}
        value={x.code}
        error={msg(errors.code)}
        onChange={(e) => setX({ ...x, code: e.target.value.toUpperCase() })}
      />
      <TextField
        label={t('locations.dialCode')}
        dir="ltr"
        value={x.dialCode}
        error={msg(errors.dialCode)}
        onChange={(e) => setX({ ...x, dialCode: e.target.value })}
      />
      <TextField
        label={t('locations.flagKey')}
        dir="ltr"
        value={x.flagKey}
        error={msg(errors.flagKey)}
        onChange={(e) => setX({ ...x, flagKey: e.target.value })}
      />
      <TextField
        label={t('locations.phoneRegex')}
        hint={t('locations.phoneRegexHint')}
        dir="ltr"
        value={x.phoneRegex}
        error={msg(errors.phoneRegex)}
        onChange={(e) => setX({ ...x, phoneRegex: e.target.value })}
      />
    </LocationDrawer>
  );
}

type CountryValues = Extras & {
  name: { ar: string; en: string };
  active: boolean;
  sortOrder: number;
};

function useCountryResource(state: ReturnType<typeof useListController>['state']) {
  const { repositories } = useContainer();
  const repo = repositories.locations.countries;
  return useLocationResource<Country, CountryValues>(state, {
    queryName: 'getLocationsCountries',
    load: (s) => repo.list({ page: s.page, pageSize: s.pageSize }),
    save: (editing, v, reason) => {
      if (!editing) return repo.create(v, reason);
      // The country code is the natural key: it is fixed once created.
      const { dialCode, flagKey, phoneRegex, name, active, sortOrder } = v;
      return repo.update(
        editing.id,
        { dialCode, flagKey, phoneRegex, name, active, sortOrder },
        reason,
      );
    },
  });
}

/** Admin PRD A28 · Locations: countries (name, flag, dial code, phone regex, active). Never deleted: switch off. */
export default function CountriesPage() {
  const { t } = useTranslation();
  const list = useListController(OPTIONS);
  const resource = useCountryResource(list.state);
  return (
    <>
      <LocationsTable<Country>
        title={t('nav.sub.countries')}
        list={list}
        state={list.state}
        query={resource.query}
        extraColumns={[
          { key: 'code', header: t('locations.code'), ltr: true, render: (r) => r.code },
          { key: 'dial', header: t('locations.dialCode'), ltr: true, render: (r) => r.dialCode },
        ]}
        onCreate={resource.openCreate}
        onEdit={resource.openEdit}
      />
      {resource.panel ? (
        <CountryDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          resource={resource}
        />
      ) : null}
    </>
  );
}
