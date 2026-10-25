import { OPEN_BRANCH_STATUSES } from '../../constants/branches';
import { DEMO_BRANCHES } from '../../constants/demoSeed';
import { BranchModel } from '../../models/branch.model';
import { SalonModel } from '../../models/salon.model';
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
      gender: salon.gender,
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
