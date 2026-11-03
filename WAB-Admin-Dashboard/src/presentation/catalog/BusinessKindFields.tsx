import { useTranslation } from 'react-i18next';
import {
  audienceFor,
  audiencesFor,
  BUSINESS_TYPES,
  type BusinessKind,
} from '@/domain/shared/businessType';
import { Select } from '../components/form/Select';

export interface BusinessKindFieldsProps {
  value: BusinessKind;
  /** Type and audience are fixed once a service exists (the server's patch takes neither). */
  locked: boolean;
  onChange: (value: BusinessKind) => void;
}

/** Business type + audience of a catalog service (§5.19, §5.23): CLINIC and TATTOO services are always for everyone. */
export function BusinessKindFields({ value, locked, onChange }: BusinessKindFieldsProps) {
  const { t } = useTranslation();
  const audiences = audiencesFor(value.businessType);
  return (
    <>
      <Select
        label={t('business.type')}
        disabled={locked}
        value={value.businessType}
        options={BUSINESS_TYPES.map((b) => ({ value: b, label: t(`status.businessType.${b}`) }))}
        onChange={(e) => {
          const type = BUSINESS_TYPES.find((b) => b === e.target.value) ?? value.businessType;
          onChange({ businessType: type, audience: audienceFor(type, value.audience) });
        }}
      />
      <Select
        label={t('business.audience')}
        disabled={locked || audiences.length === 1}
        value={value.audience}
        options={audiences.map((a) => ({ value: a, label: t(`status.audience.${a}`) }))}
        onChange={(e) =>
          onChange({
            ...value,
            audience: audiences.find((a) => a === e.target.value) ?? value.audience,
          })
        }
      />
      {value.businessType !== 'SALON' ? (
        <p className="wab-field__hint" role="note">
          {t('business.clinicAudience')}
        </p>
      ) : null}
    </>
  );
}
