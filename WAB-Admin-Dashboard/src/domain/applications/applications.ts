import type { Page, PageQuery } from '@/domain/shared/page';
import type { SalonState } from '@/domain/salons/salons';
import type { Audience, BusinessType } from '@/domain/shared/businessType';

export interface ApplicationOwner {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
}
export interface Application {
  readonly id: string;
  readonly name: string;
  readonly businessType: BusinessType;
  readonly audience: Audience;
  readonly state: SalonState;
  readonly cityId: string | null;
  readonly owner: ApplicationOwner | null;
  readonly submittedAt: string;
  readonly resubmissionCount: number;
  readonly rejectionReason: string | null;
}
export interface ApplicationDetails extends Application {
  readonly description: string | null;
  readonly areaId: string | null;
  /** Short-lived signed links to the private license documents. */
  readonly documentUrls: readonly string[];
  /** CLINIC only (§5.19): signed links to the medical license documents; empty for a SALON. */
  readonly medicalLicenseUrls: readonly string[];
}

export interface ApplicationsRepository {
  list(
    query: PageQuery & { state?: SalonState; businessType?: BusinessType },
  ): Promise<Page<Application>>;
  get(id: string): Promise<ApplicationDetails>;
  approve(id: string, reason: string): Promise<void>;
  reject(id: string, reason: string): Promise<void>;
}

/** A CLINIC must upload a medical license besides the trade license (§5.19); a SALON never does. */
export const needsMedicalLicense = (a: Pick<Application, 'businessType'>): boolean =>
  a.businessType === 'CLINIC';

const PDF = /\.pdf$/i;
/** The viewer needs to know how to draw a document; signed links keep their extension before the query. */
export const documentKind = (url: string): 'pdf' | 'image' =>
  PDF.test(url.split('?')[0] ?? '') ? 'pdf' : 'image';
