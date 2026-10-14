import type { Language } from '../constants/defaults';

/** Text resources per language (the equivalent of locale files). `{name}` marks a placeholder. */
export const TEMPLATE_IDS = ['ADMIN_2FA', 'ALERT', 'REPORT_READY'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateMessages {
  readonly subject: string;
  readonly heading: string;
  readonly body: string;
  readonly footer: string;
  readonly action?: string;
}

export const MESSAGES: Record<Language, Record<TemplateId, TemplateMessages>> = {
  en: {
    ADMIN_2FA: {
      subject: '{brand}: your sign-in code',
      heading: 'Your sign-in code',
      body: 'Use this code to finish signing in: {code}. It expires in {minutes} minutes. If this was not you, ignore this email.',
      footer: 'Never share this code with anyone.',
    },
    ALERT: {
      subject: '{brand} alert: {title}',
      heading: '{title}',
      body: '{message}',
      footer: 'You receive this because you are an administrator of {brand}.',
      action: 'Open in admin panel',
    },
    REPORT_READY: {
      subject: '{brand}: your report is ready',
      heading: 'Your report is ready',
      body: 'The report "{reportName}" is ready to download. The link expires soon.',
      footer: 'This is an automatic message from {brand}.',
      action: 'Download report',
    },
  },
  ar: {
    ADMIN_2FA: {
      subject: '{brand}: رمز تسجيل الدخول',
      heading: 'رمز تسجيل الدخول',
      body: 'استخدم هذا الرمز لإكمال تسجيل الدخول: {code}. تنتهي صلاحيته خلال {minutes} دقائق. إذا لم تكن أنت، تجاهل هذه الرسالة.',
      footer: 'لا تشارك هذا الرمز مع أي شخص.',
    },
    ALERT: {
      subject: 'تنبيه {brand}: {title}',
      heading: '{title}',
      body: '{message}',
      footer: 'وصلتك هذه الرسالة لأنك مسؤول في {brand}.',
      action: 'فتح لوحة التحكم',
    },
    REPORT_READY: {
      subject: '{brand}: تقريرك جاهز',
      heading: 'تقريرك جاهز',
      body: 'التقرير "{reportName}" جاهز للتنزيل. ينتهي الرابط قريباً.',
      footer: 'هذه رسالة تلقائية من {brand}.',
      action: 'تنزيل التقرير',
    },
  },
};
