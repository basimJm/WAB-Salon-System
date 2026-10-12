import { DEMO_IMAGE_PREFIX, DEMO_SERVICES, type DemoService } from '../constants/demoCatalog';
import type { CatalogServicesRepository } from '../repositories/catalog.repository';
import type { SeedCount } from './referenceData';

/**
 * Inserts the demo services that are missing, in display order per audience. Insert-only: a
 * service an admin edited or deactivated is left alone. The same name may exist for both genders.
 */
export const seedDemoCatalog = async (
  catalog: CatalogServicesRepository,
  services: readonly DemoService[] = DEMO_SERVICES,
): Promise<SeedCount> => {
  const count: SeedCount = { created: 0, existing: 0 };
  const position = { MALE: 0, FEMALE: 0 };
  for (const service of services) {
    position[service.gender] += 1;
    const { created } = await catalog.insertIfMissing(
      { gender: service.gender, 'name.en': service.name.en },
      {
        gender: service.gender,
        name: service.name,
        description: service.description,
        imageKey: `${DEMO_IMAGE_PREFIX}${service.image}`,
        sortOrder: position[service.gender],
        active: true,
      },
    );
    if (created) count.created += 1;
    else count.existing += 1;
  }
  return count;
};
