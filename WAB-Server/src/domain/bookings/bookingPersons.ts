import type { BookingPersonRaw } from '../../models/bookingPerson';
import type { CatalogServicesRepository } from '../../repositories/catalog.repository';
import { toObjectId } from '../../utils/database/ids';
import type { BookingPlan } from '../availability/availability.service';

/**
 * The persons of a draft or a booking from a plan (§3.5): service snapshots with the catalog names
 * as they are now, prices and subtotals in fils, and the optional tattoo design image (§5.23).
 * Shared by app drafts (§5.6) and bookings made by the business (§5.20).
 */
export const toBookingPersons = async (input: {
  readonly plan: BookingPlan;
  readonly subtotals: readonly number[];
  readonly references: readonly (string | undefined)[];
  readonly catalog: Pick<CatalogServicesRepository, 'findMany'>;
}): Promise<BookingPersonRaw[]> => {
  const { plan, subtotals, references } = input;
  const catalogIds = [
    ...new Set(plan.persons.flatMap((p) => p.services.map((s) => s.catalogServiceId))),
  ];
  const entries = await input.catalog.findMany({ _id: { $in: catalogIds } });
  const nameOf = new Map(entries.map((c) => [c.id, c.name]));
  return plan.persons.map((p, index) => {
    const reference = references[index];
    return {
      name: p.name,
      isMain: index === 0,
      isBride: p.isBride,
      ...(p.gender === undefined ? {} : { gender: p.gender }),
      services: p.services.map((s) => ({
        salonServiceId: toObjectId(s.id),
        catalogServiceId: toObjectId(s.catalogServiceId),
        name: nameOf.get(s.catalogServiceId) ?? { ar: '', en: '' },
        price: s.price,
        durationMinutes: s.durationMinutes,
      })),
      staffId: toObjectId(p.staffId),
      staffSelection: p.staffSelection,
      start: p.start,
      end: p.end,
      subtotal: subtotals[index] ?? 0,
      ...(reference === undefined ? {} : { referenceImageKey: reference }),
    };
  });
};
