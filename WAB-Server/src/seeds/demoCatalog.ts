import { DEMO_IMAGE_PREFIX, DEMO_SERVICES, type DemoService } from '../constants/demoCatalog';
import type { CatalogServicesRepository } from '../repositories/catalog.repository';
import type { SeedCount } from './referenceData';

/**
 * Inserts the demo services that are missing, in display order per business type and audience.
 * Insert-only: a service an admin edited or deactivated is left alone. The same name may exist for
 * several audiences.
 */
export const seedDemoCatalog = async (
  catalog: CatalogServicesRepository,
  services: readonly DemoService[] = DEMO_SERVICES,
): Promise<SeedCount> => {
  const count: SeedCount = { created: 0, existing: 0 };
  const position = new Map<string, number>();
  for (const service of services) {
    const group = `${service.businessType}:${service.audience}`;
    const sortOrder = (position.get(group) ?? 0) + 1;
    position.set(group, sortOrder);
    const { created } = await catalog.insertIfMissing(
      {
        businessType: service.businessType,
        audience: service.audience,
        'name.en': service.name.en,
      },
      {
        businessType: service.businessType,
        audience: service.audience,
        name: service.name,
        description: service.description,
        imageKey: `${DEMO_IMAGE_PREFIX}${service.image}`,
        sortOrder,
        active: true,
      },
    );
    if (created) count.created += 1;
    else count.existing += 1;
  }
  return count;
};
