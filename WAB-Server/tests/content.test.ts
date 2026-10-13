import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createContentService } from '../src/domain/content';
import { ContentPagesRepository, FaqsRepository } from '../src/repositories/content.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const pages = createFakeModel();
const faqs = createFakeModel();
const text = (ar: string, en: string): { ar: string; en: string } => ({ ar, en });
pages.docs.push(
  {
    _id: new Types.ObjectId(),
    app: 'CUSTOMER',
    kind: 'PRIVACY',
    body: text('خصوصية', 'Privacy C'),
  },
  {
    _id: new Types.ObjectId(),
    app: 'MERCHANT',
    kind: 'PRIVACY',
    body: text('خصوصية م', 'Privacy M'),
  },
);
faqs.docs.push(
  {
    _id: new Types.ObjectId(),
    app: 'CUSTOMER',
    question: text('ثانيا', 'Second'),
    answer: text('ج٢', 'A2'),
    order: 2,
  },
  {
    _id: new Types.ObjectId(),
    app: 'CUSTOMER',
    question: text('أولا', 'First'),
    answer: text('ج١', 'A1'),
    order: 1,
  },
  {
    _id: new Types.ObjectId(),
    app: 'MERCHANT',
    question: text('تاجر', 'Merchant'),
    answer: text('ج', 'A'),
    order: 1,
  },
);
const deps = {
  pages: new ContentPagesRepository(pages.model as never),
  faqs: new FaqsRepository(faqs.model as never),
};
const app = createApp({
  logger,
  services: {
    content: {
      customer: createContentService({ app: 'CUSTOMER', ...deps }),
      merchant: createContentService({ app: 'MERCHANT', ...deps }),
    },
  },
});

interface Body {
  data: Record<string, string>[] & Record<string, string>;
  error: { details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;

describe('/content', () => {
  it('serves each app its own page in the request language', async () => {
    const en = await request(app)
      .get('/customer/v1/content/pages/privacy')
      .set('Accept-Language', 'en');
    expect(bodyOf(en).data).toEqual({ kind: 'PRIVACY', body: 'Privacy C' });
    const ar = await request(app).get('/merchant/v1/content/pages/privacy');
    expect(bodyOf(ar).data.body).toBe('خصوصية م');
  });

  it('answers 404 for a page the admin has not written', async () => {
    const res = await request(app).get('/customer/v1/content/pages/terms');
    expect(res.status).toBe(404);
  });

  it('rejects an unknown page slug', async () => {
    const res = await request(app).get('/customer/v1/content/pages/other');
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain('params.slug');
  });

  it('lists FAQs of the app in admin order', async () => {
    const res = await request(app).get('/customer/v1/content/faqs').set('Accept-Language', 'en');
    expect(bodyOf(res).data.map((f) => f.question)).toEqual(['First', 'Second']);
    const merchant = await request(app)
      .get('/merchant/v1/content/faqs')
      .set('Accept-Language', 'en');
    expect(bodyOf(merchant).data.map((f) => f.question)).toEqual(['Merchant']);
  });

  it('answers 503 when the service is not configured', async () => {
    const res = await request(createApp({ logger })).get('/customer/v1/content/faqs');
    expect(res.status).toBe(503);
  });
});
