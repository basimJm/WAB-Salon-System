import type { BannerAction } from '../../constants/banners';
import { BANNER_AUDIENCE_BOTH } from '../../constants/banners';
import type { Gender, Language } from '../../constants/enums';
import type { StorageProvider } from '../../providers/storage';
import type { BannersRepository } from '../../repositories/banners.repository';
import type { Logger } from '../../utils/logger';
import { createSafePublicUrl } from '../uploads/safePublicUrl';

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
  readonly logger?: Logger;
}

/**
 * Banners for one audience (plus "both") whose window contains now, in the admin's order. A banner
 * whose image key is invalid is left out (a banner without its image has nothing to show).
 */
export const createBannersService = ({
  banners,
  storage,
  now = () => new Date(),
  logger,
}: BannersServiceDeps): BannersService => {
  const publicUrl = createSafePublicUrl(storage, logger);
  return {
    async live(gender, language) {
      const rows = await banners.findLive([gender, BANNER_AUDIENCE_BOTH], now());
      return rows.flatMap((b) => {
        const imageUrl = publicUrl(b.imageKey[language], { banner: b.id });
        if (imageUrl === null) return [];
        return [{ id: b.id, imageUrl, actionType: b.action, actionValue: b.actionValue ?? null }];
      });
    },
  };
};
