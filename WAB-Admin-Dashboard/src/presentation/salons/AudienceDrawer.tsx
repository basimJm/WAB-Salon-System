import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { SalonDetails } from '@/domain/salons/salons';
import { AUDIENCES, isWidening, type Audience } from '@/domain/shared/businessType';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { useLazyStrings } from '../hooks/useLazyStrings';
import { SALON_AUDIENCE_STRINGS } from '@/locales/lazy/salonAudience';
import { BusinessBadges } from '../shared/BusinessBadges';
import { AudienceConflicts } from './AudienceConflicts';
import { conflictBookingIds } from './conflictBookings';

export interface AudienceDrawerProps {
  salon: SalonDetails;
  onClose: () => void;
}

/**
 * Change a SALON's audience (§5.19, admin only, reason required): widening to men & women keeps everything;
 * narrowing switches off services that no longer fit and is refused while future bookings exist — the server's
 * conflict list (§5.12) is shown so the admin can resolve those bookings first.
 */
export function AudienceDrawer({ salon, onClose }: AudienceDrawerProps) {
  useLazyStrings(SALON_AUDIENCE_STRINGS);
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const choices = AUDIENCES.filter((a) => a !== salon.audience);
  const [audience, setAudience] = useState<Audience>(choices[0] ?? salon.audience);
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const save = useMutation({
    mutationFn: () => repositories.salons.changeAudience(salon.id, audience, reason.trim()),
    onSuccess: async () => {
      toast.show(t('salons.actionDone'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getSalonsById'] });
      await queryClient.invalidateQueries({ queryKey: ['getSalons'] });
      onClose();
    },
  });
  const conflicts = conflictBookingIds(save.error);
  const widening = isWidening(salon.audience, audience);
  return (
    <ResourceDrawer
      title={t('salons.changeAudience')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={save.isPending}
      error={conflicts.length > 0 ? null : save.error}
      onSubmit={() => {
        setTried(true);
        if (!reasonError(reason)) save.mutate();
      }}
      onClose={onClose}
    >
      <div className="wab-field">
        <span className="wab-field__label">{t('salonAudience.now')}</span>
        <BusinessBadges businessType={salon.businessType} audience={salon.audience} />
      </div>
      <Select
        label={t('business.audience')}
        value={audience}
        options={choices.map((a) => ({ value: a, label: t(`status.audience.${a}`) }))}
        onChange={(e) => {
          save.reset();
          setAudience(choices.find((a) => a === e.target.value) ?? audience);
        }}
      />
      <p className="wab-field__hint" role="note">
        {t(widening ? 'salonAudience.widen' : 'salonAudience.narrow')}
      </p>
      <AudienceConflicts ids={conflicts} />
    </ResourceDrawer>
  );
}
