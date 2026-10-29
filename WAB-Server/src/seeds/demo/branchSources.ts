import { OPEN_BRANCH_STATUSES } from '../../constants/branches';
import { DEMO_BRANCHES } from '../../constants/demoSeed';
import { RATING_DECIMAL_SCALE } from '../../constants/reviews';
import { BookingModel } from '../../models/booking.model';
import { BranchModel } from '../../models/branch.model';
import { MemberModel } from '../../models/member.model';
import { SalonModel } from '../../models/salon.model';
import { ReviewsRepository } from '../../repositories/reviews.repository';
import { SalonServiceModel } from '../../models/salonService.model';
import type { DemoBranchSource } from './branches';
import { demoId } from './random';

/**
 * Reads what `buildDemoBranches` needs from the database: the demo salons that are LIVE and
 * already have their main branch (the migration ran), with the main branch's active services.
 */
export const loadDemoBranchSources = async (): Promise<Map<string, DemoBranchSource>> => {
  const sources = new Map<string, DemoBranchSource>();
  for (const key of new Set(DEMO_BRANCHES.map((spec) => spec.salon))) {
    const salonId = demoId(`salon:${key}`);
    const salon = await SalonModel.findOne({ _id: salonId, state: 'LIVE' }).lean();
    const main = await BranchModel.findOne({ salonId, isMain: true }).lean();
    if (salon === null || main === null) continue;
    const services = await SalonServiceModel.find({
      salonId,
      branchId: main._id,
      active: true,
    }).lean();
    sources.set(key, {
      salonId,
      // Extra branches only go to the original single-gender demo salons.
      gender: salon.audience === 'MALE' ? 'MALE' : 'FEMALE',
      services: services.map((service) => ({
        catalogServiceId: service.catalogServiceId,
        price: service.price,
        durationMinutes: service.durationMinutes,
        brideOnly: service.brideOnly,
      })),
    });
  }
  return sources;
};

/** `salons.branchCount` = the salon's open branches (the migration set it to 1). */
export const syncBranchCounts = async (sources: Map<string, DemoBranchSource>): Promise<void> => {
  for (const { salonId } of sources.values()) {
    const open = await BranchModel.countDocuments({
      salonId,
      status: { $in: [...OPEN_BRANCH_STATUSES] },
    });
    await SalonModel.updateOne({ _id: salonId }, { $set: { branchCount: open } });
  }
};

const ratingOf = ({
  sum,
  count,
}: {
  sum: number;
  count: number;
}): { avg: number; count: number } => ({
  avg: count === 0 ? 0 : Math.round((sum / count) * RATING_DECIMAL_SCALE) / RATING_DECIMAL_SCALE,
  count,
});

/**
 * Salon and staff ratings (APPROVED reviews) and staff customer counts (COMPLETED bookings) from
 * what is stored, after branch bookings and reviews were added to salons seeded earlier (SRV-160).
 */
export const syncDemoRatings = async (sources: Map<string, DemoBranchSource>): Promise<void> => {
  const reviews = new ReviewsRepository();
  for (const { salonId } of sources.values()) {
    const salonRating = ratingOf(await reviews.approvedTotals({ salonId, target: 'SALON' }));
    await SalonModel.updateOne({ _id: salonId }, { $set: { rating: salonRating } });
    const staff = await MemberModel.find({ salonId, staff: { $exists: true } }, { _id: 1 }).lean();
    for (const { _id: staffId } of staff) {
      const rating = ratingOf(await reviews.approvedTotals({ salonId, target: 'STAFF', staffId }));
      const customersCount = await BookingModel.countDocuments({
        status: 'COMPLETED',
        'persons.staffId': staffId,
      });
      await MemberModel.updateOne(
        { _id: staffId },
        { $set: { 'staff.rating': rating, 'staff.customersCount': customersCount } },
      );
    }
  }
};
