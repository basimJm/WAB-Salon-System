import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SETTING_TABS } from '@/constants/settings';
import { READ_ONLY_SETTING_KEYS } from '@/domain/settings/registry';
import { settingToText } from '@/domain/settings/validate';
import { Card } from '../components/core/Card';
import { PageHeader } from '../components/core/PageHeader';
import { AsyncView } from '../components/feedback/AsyncView';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Skeleton } from '../components/feedback/Skeleton';
import { Tabs } from '../components/data/Tabs';
import { KeyValue } from '../components/core/KeyValue';
import { FormActions } from '../components/form/FormActions';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';
import { SettingRowField } from './SettingRowField';
import { useSettingsController } from './useSettingsController';
import { useSettingsDraft } from './useSettingsDraft';

function PlatformFacts({
  entries,
}: {
  entries: ReturnType<typeof useSettingsController>['query']['data'];
}) {
  const { t } = useTranslation();
  return (
    <Card aria-label={t('settings.group.platform')}>
      <h2 className="wab-settings__title">{t('settings.group.platform')}</h2>
      <KeyValue
        placeholder={t('settings.notSet')}
        items={READ_ONLY_SETTING_KEYS.map((key) => ({
          key,
          label: t(`settings.key.${key}`),
          value: settingToText(entries?.find((e) => e.key === key)?.value),
          ltr: true,
        }))}
      />
    </Card>
  );
}

/** Admin PRD A28 (core): discovery, booking rules and OTP. Every save asks for a reason and is audited. */
export default function SettingsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { query, save } = useSettingsController();
  const draft = useSettingsDraft(query.data);
  const [asking, setAsking] = useState(false);
  const [tab, setTab] = useState(SETTING_TABS[0]?.id ?? '');

  const onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (draft.dirty && !draft.hasErrors) setAsking(true);
  };
  const confirm = (reason: string) =>
    save.mutate(
      { changes: draft.changes, reason },
      {
        onSuccess: () => {
          setAsking(false);
          draft.discard();
          toast.show(t('settings.saved'), 'success');
        },
        onError: () => setAsking(false),
      },
    );

  return (
    <>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />
      <AsyncView
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        skeleton={<Skeleton height="lg" />}
      >
        <form onSubmit={onSubmit} noValidate className="wab-settings">
          <Tabs
            ariaLabel={t('settings.tabsLabel')}
            activeId={tab}
            onChange={setTab}
            items={SETTING_TABS.map(({ id, groups }) => ({
              id,
              label: t(`settings.tab.${id}`),
              content: (
                <div className="wab-settings">
                  {groups.map((group) => (
                    <Card key={group} aria-label={t(`settings.group.${group}`)}>
                      <h2 className="wab-settings__title">{t(`settings.group.${group}`)}</h2>
                      <div className="wab-settings__grid">
                        {draft.rows
                          .filter((r) => r.def.group === group)
                          .map((row) => (
                            <SettingRowField
                              key={row.id}
                              row={row}
                              onText={draft.setText}
                              onUseDefault={draft.useDefault}
                            />
                          ))}
                      </div>
                    </Card>
                  ))}
                  {id === 'limits' ? <PlatformFacts entries={query.data} /> : null}
                </div>
              ),
            }))}
          />
          {save.isError ? <InlineAlert error={save.error} /> : null}
          <FormActions
            dirty={draft.dirty && !draft.hasErrors}
            submitting={save.isPending}
            onCancel={draft.discard}
          />
        </form>
      </AsyncView>
      <ReasonDialog
        open={asking}
        title={t('settings.confirmTitle', { count: draft.changes.length })}
        description={t('settings.confirmText')}
        confirmLabel={t('form.save')}
        loading={save.isPending}
        onConfirm={confirm}
        onClose={() => setAsking(false)}
      />
    </>
  );
}
