import type { AreasRepository, CitiesRepository } from '../../repositories/locations.repository';
import { ValidationError } from '../../utils/errors';
import { invalidField } from '../auth/phoneVerifier';

/**
 * A city and/or area a client sent must exist and be active, and the area must belong to the
 * city. Failing fields are reported together as `<prefix>.cityId` / `<prefix>.areaId`.
 */
export const assertPlace = async (
  places: { cities: Pick<CitiesRepository, 'findOne'>; areas: Pick<AreasRepository, 'findOne'> },
  prefix: string,
  cityId?: string,
  areaId?: string,
): Promise<void> => {
  if (cityId === undefined && areaId === undefined) return;
  const [city, area] = await Promise.all([
    cityId === undefined ? null : places.cities.findOne({ _id: cityId, active: true }),
    areaId === undefined ? null : places.areas.findOne({ _id: areaId, active: true }),
  ]);
  const details = [
    ...(cityId !== undefined && city === null ? [invalidField(`${prefix}.cityId`)] : []),
    ...(areaId !== undefined && (area === null || (cityId !== undefined && area.cityId !== cityId))
      ? [invalidField(`${prefix}.areaId`)]
      : []),
  ];
  if (details.length > 0) throw new ValidationError({ details });
};
