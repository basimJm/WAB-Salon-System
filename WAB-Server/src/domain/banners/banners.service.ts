import type { BannerAction } from '../../constants/banners';
import { BANNER_AUDIENCE_BOTH } from '../../constants/banners';
import type { Gender, Language } from '../../constants/enums';
import type { StorageProvider } from '../../providers/storage';
import type { BannersRepository } from '../../repositories/banners.repository';

export interface PublicBanner {
  readonly id: string;
  readonly imageUrl: string;
  readonly actionType: BannerAction;
  readonly actionValue: string | null;
}

export interface BannersService {
  live(gender: Gender, language: Language): Promise<PublicBanner[]>;
}

export interface BannersServiceDeps {
  readonly banners: Pick<BannersRepository, 'findLive'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly now?: () => Date;
}

/** Banners for one audience (plus "both") whose window contains now, in the admin's order. */
export const createBannersService = ({
  banners,
  storage,
  now = () => new Date(),
}: BannersServiceDeps): BannersService => ({
  async live(gender, language) {
    const rows = await banners.findLive([gender, BANNER_AUDIENCE_BOTH], now());
    return rows.map((b) => ({
      id: b.id,
      imageUrl: storage.getPublicUrl(b.imageKey[language]),
      actionType: b.action,
      actionValue: b.actionValue ?? null,
    }));
  },
});
