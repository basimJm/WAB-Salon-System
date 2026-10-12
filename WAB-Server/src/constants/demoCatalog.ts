import type { Gender } from './enums';
import type { LocalizedName } from './referenceData';

/** Demo catalog (SRV-019): sample data for development only, never for production. */
export const DEMO_IMAGE_PREFIX = 'demo/catalog/';

export interface DemoService {
  readonly gender: Gender;
  readonly name: LocalizedName;
  readonly description: LocalizedName;
  /** File name under `DEMO_IMAGE_PREFIX`; the file does not exist, clients show a placeholder. */
  readonly image: string;
}

export const DEMO_SERVICES: readonly DemoService[] = [
  {
    gender: 'FEMALE',
    image: 'haircut.jpg',
    name: { ar: 'قص الشعر', en: 'Haircut' },
    description: { ar: 'قص وتشكيل حسب الطلب', en: 'Cut and shape to your taste' },
  },
  {
    gender: 'FEMALE',
    image: 'blow-dry.jpg',
    name: { ar: 'سشوار', en: 'Blow dry' },
    description: { ar: 'غسل وتصفيف بالسشوار', en: 'Wash and blow-dry styling' },
  },
  {
    gender: 'FEMALE',
    image: 'hair-color.jpg',
    name: { ar: 'صبغ الشعر', en: 'Hair coloring' },
    description: { ar: 'صبغة كاملة أو خصل', en: 'Full color or highlights' },
  },
  {
    gender: 'FEMALE',
    image: 'keratin.jpg',
    name: { ar: 'كيراتين', en: 'Keratin treatment' },
    description: { ar: 'علاج لتنعيم الشعر', en: 'Smoothing treatment for the hair' },
  },
  {
    gender: 'FEMALE',
    image: 'manicure.jpg',
    name: { ar: 'مانيكير', en: 'Manicure' },
    description: { ar: 'العناية بالأظافر', en: 'Nail care and polish' },
  },
  {
    gender: 'FEMALE',
    image: 'pedicure.jpg',
    name: { ar: 'باديكير', en: 'Pedicure' },
    description: { ar: 'العناية بالقدمين', en: 'Foot and toenail care' },
  },
  {
    gender: 'FEMALE',
    image: 'makeup.jpg',
    name: { ar: 'مكياج', en: 'Makeup' },
    description: { ar: 'مكياج للمناسبات', en: 'Makeup for occasions' },
  },
  {
    gender: 'FEMALE',
    image: 'bridal-makeup.jpg',
    name: { ar: 'مكياج العروس', en: 'Bridal makeup' },
    description: { ar: 'مكياج كامل للعروس', en: 'Complete bridal makeup' },
  },
  {
    gender: 'FEMALE',
    image: 'facial.jpg',
    name: { ar: 'تنظيف البشرة', en: 'Facial' },
    description: { ar: 'تنظيف وترطيب البشرة', en: 'Deep cleansing and hydration' },
  },
  {
    gender: 'FEMALE',
    image: 'waxing.jpg',
    name: { ar: 'إزالة الشعر بالشمع', en: 'Waxing' },
    description: { ar: 'إزالة الشعر الزائد', en: 'Hair removal with wax' },
  },
  {
    gender: 'FEMALE',
    image: 'henna.jpg',
    name: { ar: 'نقش الحناء', en: 'Henna' },
    description: { ar: 'نقش حناء للمناسبات', en: 'Henna designs for occasions' },
  },
  {
    gender: 'MALE',
    image: 'haircut.jpg',
    name: { ar: 'قص الشعر', en: 'Haircut' },
    description: { ar: 'قص وتشكيل حسب الطلب', en: 'Cut and shape to your taste' },
  },
  {
    gender: 'MALE',
    image: 'beard-trim.jpg',
    name: { ar: 'تشذيب اللحية', en: 'Beard trim' },
    description: { ar: 'تحديد وتشذيب اللحية', en: 'Beard shaping and trimming' },
  },
  {
    gender: 'MALE',
    image: 'shave.jpg',
    name: { ar: 'حلاقة', en: 'Shave' },
    description: { ar: 'حلاقة بالموس والمنشفة الساخنة', en: 'Razor shave with a hot towel' },
  },
  {
    gender: 'MALE',
    image: 'hair-color.jpg',
    name: { ar: 'صبغ الشعر', en: 'Hair coloring' },
    description: { ar: 'صبغة كاملة أو تغطية الشيب', en: 'Full color or gray coverage' },
  },
  {
    gender: 'MALE',
    image: 'wash-style.jpg',
    name: { ar: 'غسل وتصفيف', en: 'Wash and style' },
    description: { ar: 'غسل الشعر وتصفيفه', en: 'Hair wash and styling' },
  },
  {
    gender: 'MALE',
    image: 'facial.jpg',
    name: { ar: 'تنظيف البشرة', en: 'Facial' },
    description: { ar: 'تنظيف وترطيب البشرة', en: 'Deep cleansing and hydration' },
  },
  {
    gender: 'MALE',
    image: 'groom.jpg',
    name: { ar: 'باقة العريس', en: 'Groom package' },
    description: { ar: 'قص وحلاقة وتنظيف بشرة', en: 'Haircut, shave and facial' },
  },
];
