import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '@/constants/i18n';
import { ImageUploader, type ImageUploaderProps, type UploadedImage } from './ImageUploader';

export type LocalizedImages = Readonly<Record<Language, UploadedImage | null>>;

export interface LocalizedImageUploaderProps extends Omit<
  ImageUploaderProps,
  'value' | 'onChange' | 'label'
> {
  label: string;
  value: LocalizedImages;
  onChange: (value: LocalizedImages) => void;
}

/** The Arabic and English versions of one image (banners, catalog art): two uploaders side by side. */
export function LocalizedImageUploader({
  label,
  value,
  onChange,
  ...rest
}: LocalizedImageUploaderProps) {
  const { t } = useTranslation();
  return (
    <div className="wab-uploader-pair" role="group" aria-label={label}>
      {LANGUAGES.map((language) => (
        <ImageUploader
          key={language}
          {...rest}
          label={`${label} · ${t(`media.language.${language}`)}`}
          value={value[language]}
          onChange={(next) => onChange({ ...value, [language]: next })}
        />
      ))}
    </div>
  );
}
