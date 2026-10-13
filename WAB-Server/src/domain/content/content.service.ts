import type { ContentKind } from '../../constants/content';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { AppKind, Language } from '../../constants/enums';
import type { ContentPagesRepository, FaqsRepository } from '../../repositories/content.repository';
import { NotFoundError } from '../../utils/errors';

export interface PublicFaq {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export interface ContentService {
  page(kind: ContentKind, language: Language): Promise<{ kind: ContentKind; body: string }>;
  faqs(language: Language): Promise<PublicFaq[]>;
}

export interface ContentServiceDeps {
  readonly app: AppKind;
  readonly pages: Pick<ContentPagesRepository, 'findFor'>;
  readonly faqs: Pick<FaqsRepository, 'findMany'>;
}

/** One service per app: a page the admin has not written yet is a 404, FAQ order is admin-defined. */
export const createContentService = ({ app, pages, faqs }: ContentServiceDeps): ContentService => ({
  async page(kind, language) {
    const row = await pages.findFor(app, kind);
    if (row === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return { kind, body: row.body[language] };
  },
  async faqs(language) {
    const rows = await faqs.findMany({ app }, { order: 1 });
    return rows.map((f) => ({
      id: f.id,
      question: f.question[language],
      answer: f.answer[language],
    }));
  },
});
