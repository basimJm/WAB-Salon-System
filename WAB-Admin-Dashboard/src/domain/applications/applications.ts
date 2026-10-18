import type { Page, PageQuery } from '@/domain/shared/page';
import type { SalonGender, SalonState } from '@/domain/salons/salons';

export interface ApplicationOwner {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
}
export interface Application {
  readonly id: string;
  readonly name: string;
  readonly gender: SalonGender;
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
}

export interface ApplicationsRepository {
  list(query: PageQuery & { state?: SalonState }): Promise<Page<Application>>;
  get(id: string): Promise<ApplicationDetails>;
  approve(id: string, reason: string): Promise<void>;
  reject(id: string, reason: string): Promise<void>;
}

const PDF = /\.pdf$/i;
/** The viewer needs to know how to draw a document; signed links keep their extension before the query. */
export const documentKind = (url: string): 'pdf' | 'image' =>
  PDF.test(url.split('?')[0] ?? '') ? 'pdf' : 'image';
