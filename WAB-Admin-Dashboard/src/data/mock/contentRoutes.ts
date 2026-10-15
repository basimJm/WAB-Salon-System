import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { collection } from './mockCollection';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const ops = OPERATIONS;

export function contentRoutes(): readonly MockRoute[] {
  let counter = 500;
  const nextId = () => `64c${String((counter += 1)).padStart(21, '0')}`;
  const pages = collection(
    [
      {
        id: '64c000000000000000000001',
        app: 'CUSTOMER' as const,
        kind: 'PRIVACY' as const,
        body: { ar: '<p>سياسة الخصوصية</p>', en: '<p>Privacy policy</p>' },
      },
      {
        id: '64c000000000000000000002',
        app: 'CUSTOMER' as const,
        kind: 'TERMS' as const,
        body: { ar: '<p>الشروط</p>', en: '<p>Terms of use</p>' },
      },
    ],
    nextId,
  );
  const faqs = collection(
    [
      {
        id: '64c000000000000000000011',
        app: 'CUSTOMER' as const,
        question: { ar: 'كيف أحجز؟', en: 'How do I book?' },
        answer: { ar: 'اختر الصالون ثم الموعد.', en: 'Pick a salon, then a time.' },
        order: 1,
      },
    ],
    nextId,
    { order: 0 },
  );
  const contact = collection(
    [
      {
        id: '64c000000000000000000021',
        app: 'CUSTOMER' as const,
        phone: '+962790000000',
        whatsapp: '+962790000001',
        email: 'help@example.test', // hardcoded-ok: mock data
      },
    ],
    nextId,
  );
  const extra = [
    mockRoute(
      defineEndpoint(ops.getContentFaqs, {
        data: dto.getContentFaqsDataSchema,
        query: dto.getContentFaqsQuerySchema,
      }),
      faqs.list,
    ),
    mockRoute(
      defineEndpoint(ops.postContentFaqs, {
        data: dto.postContentFaqsDataSchema,
        body: dto.postContentFaqsBodySchema,
      }),
      faqs.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchContentFaqsById, {
        data: dto.patchContentFaqsByIdDataSchema,
        body: dto.patchContentFaqsByIdBodySchema,
      }),
      faqs.update,
    ),
    mockRoute(
      defineEndpoint(ops.getContentContactInfo, {
        data: dto.getContentContactInfoDataSchema,
        query: dto.getContentContactInfoQuerySchema,
      }),
      contact.list,
    ),
    mockRoute(
      defineEndpoint(ops.postContentContactInfo, {
        data: dto.postContentContactInfoDataSchema,
        body: dto.postContentContactInfoBodySchema,
      }),
      contact.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchContentContactInfoById, {
        data: dto.patchContentContactInfoByIdDataSchema,
        body: dto.patchContentContactInfoByIdBodySchema,
      }),
      contact.update,
    ),
  ];
  return [
    ...extra,
    mockRoute(
      defineEndpoint(ops.getContentPages, {
        data: dto.getContentPagesDataSchema,
        query: dto.getContentPagesQuerySchema,
      }),
      pages.list,
    ),
    mockRoute(
      defineEndpoint(ops.postContentPages, {
        data: dto.postContentPagesDataSchema,
        body: dto.postContentPagesBodySchema,
      }),
      pages.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchContentPagesById, {
        data: dto.patchContentPagesByIdDataSchema,
        body: dto.patchContentPagesByIdBodySchema,
      }),
      pages.update,
    ),
  ];
}
