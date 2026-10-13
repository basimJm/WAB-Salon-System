import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { AppVersionRaw } from '../../models/appVersion.model';
import type { ContactInfoRaw } from '../../models/contactInfo.model';
import type { ContentPageRaw } from '../../models/contentPage.model';
import type { FaqRaw } from '../../models/faq.model';
import type { MaintenanceRaw } from '../../models/maintenance.model';
import type {
  AppVersionsRepository,
  ContactInfoRepository,
  MaintenanceRepository,
} from '../../repositories/appConfig.repository';
import type { ContentPagesRepository, FaqsRepository } from '../../repositories/content.repository';
import { ValidationError } from '../../utils/errors';
import { compareVersions } from '../../utils/version';
import type { AuditWriter } from '../audit/audit.service';
import { createAdminCrud, type AdminCrudService } from './adminCrud.service';

export interface AdminContentDeps {
  readonly pages: ContentPagesRepository;
  readonly faqs: FaqsRepository;
  readonly contactInfo: ContactInfoRepository;
  readonly appVersions: AppVersionsRepository;
  readonly maintenance: MaintenanceRepository;
  readonly audit: AuditWriter;
}

export interface AdminContentServices {
  readonly pages: AdminCrudService<ContentPageRaw>;
  readonly faqs: AdminCrudService<FaqRaw>;
  readonly contactInfo: AdminCrudService<ContactInfoRaw>;
  readonly appVersions: AdminCrudService<AppVersionRaw>;
  readonly maintenance: AdminCrudService<MaintenanceRaw>;
}

const invalid = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      },
    ],
  });

/** The oldest allowed build can never be newer than the newest build (checked on the merged values). */
type VersionFields = Partial<Record<'latest' | 'minSupported', string | undefined>>;
export const assertVersionOrder = (patch: VersionFields, current?: VersionFields): void => {
  const latest = patch.latest ?? current?.latest;
  const minSupported = patch.minSupported ?? current?.minSupported;
  if (
    latest !== undefined &&
    minSupported !== undefined &&
    compareVersions(minSupported, latest) > 0
  ) {
    throw invalid('minSupported');
  }
};

export const createAdminContentServices = (deps: AdminContentDeps): AdminContentServices => {
  const { audit } = deps;
  return {
    pages: createAdminCrud<ContentPageRaw>({
      name: 'CONTENT_PAGE',
      entityType: 'contentPage',
      store: deps.pages,
      audit,
    }),
    faqs: createAdminCrud<FaqRaw>({ name: 'FAQ', entityType: 'faq', store: deps.faqs, audit }),
    contactInfo: createAdminCrud<ContactInfoRaw>({
      name: 'CONTACT_INFO',
      entityType: 'contactInfo',
      store: deps.contactInfo,
      audit,
    }),
    appVersions: createAdminCrud<AppVersionRaw>({
      name: 'APP_VERSION',
      entityType: 'appVersion',
      store: deps.appVersions,
      audit,
      checkReferences: (data, current) => {
        assertVersionOrder(data, current);
        return Promise.resolve();
      },
    }),
    maintenance: createAdminCrud<MaintenanceRaw>({
      name: 'MAINTENANCE',
      entityType: 'maintenance',
      store: deps.maintenance,
      audit,
    }),
  };
};
