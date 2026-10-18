import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GALLERY_DOC_SVG,
  GALLERY_FAIL_MARKER,
  GALLERY_UPLOAD_STEPS,
  GALLERY_UPLOAD_STEP_MS,
} from '@/constants/media';
import { Card } from '../../components/core/Card';
import { Heading } from '../../components/core/Heading';
import { Text } from '../../components/core/Text';
import { DocumentViewer } from '../../components/media/DocumentViewer';
import type { UploadedImage } from '../../components/media/ImageUploader';
import {
  LocalizedImageUploader,
  type LocalizedImages,
} from '../../components/media/LocalizedImageUploader';
import { PhonePreview } from '../../components/media/PhonePreview';

/** Fake presign -> PUT -> confirm: steps through progress, then answers with a local preview URL. */
async function fakeUpload(file: File, onProgress: (ratio: number) => void): Promise<UploadedImage> {
  for (let step = 1; step <= GALLERY_UPLOAD_STEPS; step += 1) {
    await new Promise((resolve) => setTimeout(resolve, GALLERY_UPLOAD_STEP_MS));
    onProgress(step / GALLERY_UPLOAD_STEPS);
  }
  if (file.name.includes(GALLERY_FAIL_MARKER)) throw new Error('simulated failure');
  return { key: `banners/${file.name}`, url: URL.createObjectURL(file) };
}

/** Gallery section for the media kit (ADM-020): image uploader (ar/en), document viewer, phone preview. */
export function MediaSection() {
  const { t } = useTranslation();
  const k = (key: string) => t(`designKits.media.${key}`);
  const [images, setImages] = useState<LocalizedImages>({ ar: null, en: null });
  const docUrl = useMemo(
    () => URL.createObjectURL(new Blob([GALLERY_DOC_SVG], { type: 'image/svg+xml' })),
    [],
  );
  return (
    <Card className="wab-stack" aria-label={k('title')}>
      <Heading level={2}>{k('title')}</Heading>
      <LocalizedImageUploader
        label={k('banner')}
        value={images}
        onChange={setImages}
        upload={fakeUpload}
      />
      <Text tone="muted">{k('failHint')}</Text>
      <div className="wab-grid">
        <DocumentViewer url={docUrl} kind="image" label={k('license')} filename="license.svg" />
        <PhonePreview language="ar" label={k('previewAr')}>
          {images.ar ? <img src={images.ar.url} alt={k('previewAr')} /> : <Text>{k('previewEmptyAr')}</Text>}
        </PhonePreview>
        <PhonePreview language="en" label={k('previewEn')}>
          {images.en ? <img src={images.en.url} alt={k('previewEn')} /> : <Text>{k('previewEmptyEn')}</Text>}
        </PhonePreview>
      </div>
    </Card>
  );
}
