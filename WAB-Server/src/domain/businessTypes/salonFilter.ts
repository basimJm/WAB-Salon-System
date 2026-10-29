import type { BusinessType } from '../../constants/enums';
import type { SalonsRepository } from '../../repositories/salons.repository';

/**
 * The `salonId` part of a filter on a collection that only stores the salon (reviews, catalog
 * requests): an explicit salon stays as it is (empty when it is not of the type), a business type
 * becomes the ids of its businesses (§5.19 admin filters). Nothing asked = no condition.
 */
export const salonIdFilter = async (
  salons: Pick<SalonsRepository, 'findMany'>,
  input: { salonId?: string | undefined; businessType?: BusinessType | undefined },
): Promise<Record<string, unknown>> => {
  if (input.businessType === undefined) {
    return input.salonId === undefined ? {} : { salonId: input.salonId };
  }
  const ids = (await salons.findMany({ businessType: input.businessType })).map((s) => s.id);
  if (input.salonId === undefined) return { salonId: { $in: ids } };
  return { salonId: { $in: ids.includes(input.salonId) ? [input.salonId] : [] } };
};
