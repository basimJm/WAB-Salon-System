import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { BookingDetails } from '@/domain/bookings/bookings';
import { Select } from '../components/form/Select';
import { reasonError, ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';

/** Gives one person of the booking another staff member out of those free for the whole time. */
export function ReassignDrawer({ b, onClose }: { b: BookingDetails; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [person, setPerson] = useState(0);
  const [staffId, setStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const eligible = useQuery({
    queryKey: ['getBookingsByIdEligibleStaff', b.id, person],
    queryFn: () => repositories.bookings.eligibleStaff(b.id, person),
  });
  const options = (eligible.data ?? []).map((s) => ({ value: s.staffId, label: s.name }));
  const chosen = staffId || options[0]?.value || '';
  const move = useMutation({
    mutationFn: () => repositories.bookings.reassign(b.id, person, chosen, reason.trim()),
    onSuccess: async () => {
      toast.show(t('bookings.reassigned'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getBookingsById'] });
      onClose();
    },
  });
  const submit = () => {
    setTried(true);
    if (chosen !== '' && !reasonError(reason)) move.mutate();
  };
  return (
    <ResourceDrawer
      title={t('bookings.reassign')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={move.isPending}
      error={move.error ?? eligible.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Select
        label={t('bookings.person')}
        value={String(person)}
        options={b.persons.map((p, i) => ({ value: String(i), label: p.name }))}
        onChange={(e) => {
          setPerson(Number(e.target.value));
          setStaffId('');
        }}
      />
      <Select
        label={t('bookings.newStaff')}
        value={chosen}
        options={options}
        error={tried && chosen === '' ? t('bookings.noEligible') : undefined}
        onChange={(e) => setStaffId(e.target.value)}
      />
      {eligible.data && options.length === 0 ? <p>{t('bookings.noEligible')}</p> : null}
    </ResourceDrawer>
  );
}
