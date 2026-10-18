import type { ReactNode } from 'react';
import type { Language } from '@/constants/i18n';
import { directionOf } from '@/infrastructure/i18n/i18n';

export interface PhonePreviewProps {
  /** What the customer app would show, drawn with the admin's own components. */
  children: ReactNode;
  /** Language of the app screen: sets `lang` and the reading direction inside the frame only. */
  language: Language;
  /** Accessible name of the preview region (e.g. "Banner preview in Arabic"). */
  label: string;
}

/** A phone-shaped frame for previewing banners and content as customers see them (Admin PRD A17). */
export function PhonePreview({ children, language, label }: PhonePreviewProps) {
  return (
    <div className="wab-phone" role="group" aria-label={label}>
      <div className="wab-phone__screen" lang={language} dir={directionOf(language)}>
        {children}
      </div>
    </div>
  );
}
