import type { Audience, BusinessType } from './enums';
import type { LocalizedName } from './referenceData';

/** Demo catalog (SRV-019): sample data for development only, never for production. */
export const DEMO_IMAGE_PREFIX = 'demo/catalog/';

export interface DemoService {
  readonly businessType: BusinessType;
  readonly audience: Audience;
  readonly name: LocalizedName;
  readonly description: LocalizedName;
  /** File name under `DEMO_IMAGE_PREFIX`; the file does not exist, clients show a placeholder. */
  readonly image: string;
}

export const DEMO_SERVICES: readonly DemoService[] = [
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'haircut.jpg',
    name: { ar: 'قص الشعر', en: 'Haircut' },
    description: { ar: 'قص وتشكيل حسب الطلب', en: 'Cut and shape to your taste' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'blow-dry.jpg',
    name: { ar: 'سشوار', en: 'Blow dry' },
    description: { ar: 'غسل وتصفيف بالسشوار', en: 'Wash and blow-dry styling' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'hair-color.jpg',
    name: { ar: 'صبغ الشعر', en: 'Hair coloring' },
    description: { ar: 'صبغة كاملة أو خصل', en: 'Full color or highlights' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'keratin.jpg',
    name: { ar: 'كيراتين', en: 'Keratin treatment' },
    description: { ar: 'علاج لتنعيم الشعر', en: 'Smoothing treatment for the hair' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'manicure.jpg',
    name: { ar: 'مانيكير', en: 'Manicure' },
    description: { ar: 'العناية بالأظافر', en: 'Nail care and polish' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'pedicure.jpg',
    name: { ar: 'باديكير', en: 'Pedicure' },
    description: { ar: 'العناية بالقدمين', en: 'Foot and toenail care' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'makeup.jpg',
    name: { ar: 'مكياج', en: 'Makeup' },
    description: { ar: 'مكياج للمناسبات', en: 'Makeup for occasions' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'bridal-makeup.jpg',
    name: { ar: 'مكياج العروس', en: 'Bridal makeup' },
    description: { ar: 'مكياج كامل للعروس', en: 'Complete bridal makeup' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'facial.jpg',
    name: { ar: 'تنظيف البشرة', en: 'Facial' },
    description: { ar: 'تنظيف وترطيب البشرة', en: 'Deep cleansing and hydration' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'waxing.jpg',
    name: { ar: 'إزالة الشعر بالشمع', en: 'Waxing' },
    description: { ar: 'إزالة الشعر الزائد', en: 'Hair removal with wax' },
  },
  {
    businessType: 'SALON',
    audience: 'FEMALE',
    image: 'henna.jpg',
    name: { ar: 'نقش الحناء', en: 'Henna' },
    description: { ar: 'نقش حناء للمناسبات', en: 'Henna designs for occasions' },
  },
  {
    businessType: 'SALON',
    audience: 'MALE',
    image: 'haircut.jpg',
    name: { ar: 'قص الشعر', en: 'Haircut' },
    description: { ar: 'قص وتشكيل حسب الطلب', en: 'Cut and shape to your taste' },
  },
  {
    businessType: 'SALON',
    audience: 'MALE',
    image: 'beard-trim.jpg',
    name: { ar: 'تشذيب اللحية', en: 'Beard trim' },
    description: { ar: 'تحديد وتشذيب اللحية', en: 'Beard shaping and trimming' },
  },
  {
    businessType: 'SALON',
    audience: 'MALE',
    image: 'shave.jpg',
    name: { ar: 'حلاقة', en: 'Shave' },
    description: { ar: 'حلاقة بالموس والمنشفة الساخنة', en: 'Razor shave with a hot towel' },
  },
  {
    businessType: 'SALON',
    audience: 'MALE',
    image: 'hair-color.jpg',
    name: { ar: 'صبغ الشعر', en: 'Hair coloring' },
    description: { ar: 'صبغة كاملة أو تغطية الشيب', en: 'Full color or gray coverage' },
  },
  {
    businessType: 'SALON',
    audience: 'MALE',
    image: 'wash-style.jpg',
    name: { ar: 'غسل وتصفيف', en: 'Wash and style' },
    description: { ar: 'غسل الشعر وتصفيفه', en: 'Hair wash and styling' },
  },
  {
    businessType: 'SALON',
    audience: 'MALE',
    image: 'facial.jpg',
    name: { ar: 'تنظيف البشرة', en: 'Facial' },
    description: { ar: 'تنظيف وترطيب البشرة', en: 'Deep cleansing and hydration' },
  },
  {
    businessType: 'SALON',
    audience: 'MALE',
    image: 'groom.jpg',
    name: { ar: 'باقة العريس', en: 'Groom package' },
    description: { ar: 'قص وحلاقة وتنظيف بشرة', en: 'Haircut, shave and facial' },
  },
  // Beauty clinic catalog (§5.19): clinics serve everyone, so every entry is BOTH.
  {
    businessType: 'CLINIC',
    audience: 'BOTH',
    image: 'botox.jpg',
    name: { ar: 'بوتوكس', en: 'Botox' },
    description: { ar: 'حقن البوتوكس لتنعيم التجاعيد', en: 'Botox injections to smooth wrinkles' },
  },
  {
    businessType: 'CLINIC',
    audience: 'BOTH',
    image: 'filler.jpg',
    name: { ar: 'فيلر', en: 'Filler' },
    description: { ar: 'حقن الفيلر للشفاه والوجه', en: 'Lip and face filler injections' },
  },
  {
    businessType: 'CLINIC',
    audience: 'BOTH',
    image: 'laser-hair-removal.jpg',
    name: { ar: 'إزالة الشعر بالليزر', en: 'Laser hair removal' },
    description: { ar: 'جلسة ليزر لإزالة الشعر', en: 'Laser session for hair removal' },
  },
  {
    businessType: 'CLINIC',
    audience: 'BOTH',
    image: 'hydrafacial.jpg',
    name: { ar: 'هايدرافيشل', en: 'HydraFacial' },
    description: {
      ar: 'تنظيف عميق وترطيب للبشرة',
      en: 'Deep cleansing and hydration for the skin',
    },
  },
  {
    businessType: 'CLINIC',
    audience: 'BOTH',
    image: 'chemical-peel.jpg',
    name: { ar: 'تقشير كيميائي', en: 'Chemical peel' },
    description: { ar: 'تقشير لتجديد البشرة', en: 'Peel to renew the skin' },
  },
  {
    businessType: 'CLINIC',
    audience: 'BOTH',
    image: 'prp.jpg',
    name: { ar: 'بلازما', en: 'PRP' },
    description: { ar: 'حقن البلازما للبشرة والشعر', en: 'Platelet-rich plasma for skin and hair' },
  },
  // Tattoo studio catalog (§5.23): studios serve everyone, so every entry is BOTH.
  {
    businessType: 'TATTOO',
    audience: 'BOTH',
    image: 'small-tattoo.jpg',
    name: { ar: 'وشم صغير', en: 'Small tattoo' },
    description: { ar: 'تصميم صغير حتى ١٠ سم', en: 'A small design up to 10 cm' },
  },
  {
    businessType: 'TATTOO',
    audience: 'BOTH',
    image: 'large-tattoo.jpg',
    name: { ar: 'جلسة وشم كبير', en: 'Large tattoo session' },
    description: { ar: 'جلسة لتصميم كبير أو مفصل', en: 'A session for a large or detailed design' },
  },
  {
    businessType: 'TATTOO',
    audience: 'BOTH',
    image: 'cover-up.jpg',
    name: { ar: 'تغطية وشم', en: 'Cover-up tattoo' },
    description: { ar: 'تصميم جديد يغطي وشماً قديماً', en: 'A new design over an old tattoo' },
  },
  {
    businessType: 'TATTOO',
    audience: 'BOTH',
    image: 'piercing.jpg',
    name: { ar: 'ثقب', en: 'Piercing' },
    description: { ar: 'ثقب الأذن أو الأنف أو غيرها', en: 'Ear, nose or other piercing' },
  },
];
