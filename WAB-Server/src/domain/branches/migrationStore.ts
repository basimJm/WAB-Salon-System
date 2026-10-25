import type { mongo } from 'mongoose';
import { AreaModel } from '../../models/area.model';
import { BookingModel } from '../../models/booking.model';
import { BookingDraftModel } from '../../models/bookingDraft.model';
import { BranchModel } from '../../models/branch.model';
import { LedgerEntryModel } from '../../models/ledgerEntry.model';
import { MemberModel } from '../../models/member.model';
import { RefundModel } from '../../models/refund.model';
import { ReviewModel } from '../../models/review.model';
import { SalonModel } from '../../models/salon.model';
import { SalonClosureModel } from '../../models/salonClosure.model';
import { SalonServiceModel } from '../../models/salonService.model';
import { StaffLeaveModel } from '../../models/staffLeave.model';
import { TransactionModel } from '../../models/transaction.model';
import { toObjectId } from '../../utils/database/ids';
import type { BranchBackfillTarget, BranchMigrationStore, SalonForMigration } from './migration';

/**
 * Driver-level collections: the backfill only adds the missing branch reference, so it goes
 * around the append-only guard of the ledger on purpose (amounts and history are never touched).
 */
const COLLECTIONS: Record<BranchBackfillTarget, () => mongo.Collection> = {
  salonServices: () => SalonServiceModel.collection,
  salonClosures: () => SalonClosureModel.collection,
  members: () => MemberModel.collection,
  staffLeaves: () => StaffLeaveModel.collection,
  bookingDrafts: () => BookingDraftModel.collection,
  bookings: () => BookingModel.collection,
  transactions: () => TransactionModel.collection,
  refunds: () => RefundModel.collection,
  ledgerEntries: () => LedgerEntryModel.collection,
  reviews: () => ReviewModel.collection,
};
const OWNER_ROLE = 'OWNER';

const withoutBranch = (target: BranchBackfillTarget, salonId: string): Record<string, unknown> => ({
  salonId: toObjectId(salonId),
  branchId: { $exists: false },
  ...(target === 'members' ? { role: { $ne: OWNER_ROLE } } : {}),
});

/** The migration's reads and writes against MongoDB (`npm run migrate:branches`). */
export const createMongoBranchMigrationStore = (): BranchMigrationStore => ({
  async salonsWithoutBranch() {
    const rows = await SalonModel.find({ mainBranchId: { $exists: false } })
      .lean()
      .exec();
    return rows.map((salon): SalonForMigration => ({
      id: salon._id.toString(),
      ...(salon.location?.coordinates.length === 2 ? { location: salon.location } : {}),
      ...(salon.locationText === undefined ? {} : { locationText: salon.locationText }),
      ...(salon.cityId === undefined ? {} : { cityId: salon.cityId.toString() }),
      ...(salon.areaId === undefined ? {} : { areaId: salon.areaId.toString() }),
      ...(salon.phone === undefined ? {} : { phone: salon.phone }),
      ...(salon.whatsapp === undefined ? {} : { whatsapp: salon.whatsapp }),
      weeklySchedule: salon.weeklySchedule,
    }));
  },
  async existingMainBranch(salonId) {
    const branch = await BranchModel.findOne({ salonId: toObjectId(salonId), isMain: true })
      .lean()
      .exec();
    return branch === null ? null : { id: branch._id.toString(), name: branch.name };
  },
  async areaName(areaId) {
    const area = await AreaModel.findById(areaId).lean().exec();
    return area === null ? null : area.name;
  },
  activeServiceCount: (salonId) =>
    SalonServiceModel.countDocuments({ salonId: toObjectId(salonId), active: true }).exec(),
  async qualifiedStaffCount(salonId) {
    const staff = await MemberModel.find({
      salonId: toObjectId(salonId),
      active: true,
      providesServices: true,
    })
      .lean()
      .exec();
    return staff.filter(
      (m) => (m.staff?.serviceIds.length ?? 0) > 0 && (m.staff?.workingDays.length ?? 0) > 0,
    ).length;
  },
  async insertMainBranch(input) {
    const created = await BranchModel.create({
      salonId: toObjectId(input.salonId),
      name: input.name,
      isMain: true,
      status: 'ACTIVE',
      ...(input.location === undefined ? {} : { location: input.location }),
      ...(input.locationText === undefined ? {} : { locationText: input.locationText }),
      ...(input.cityId === undefined ? {} : { cityId: toObjectId(input.cityId) }),
      ...(input.areaId === undefined ? {} : { areaId: toObjectId(input.areaId) }),
      ...(input.phone === undefined ? {} : { phone: input.phone }),
      ...(input.whatsapp === undefined ? {} : { whatsapp: input.whatsapp }),
      weeklySchedule: [...input.weeklySchedule],
      completeness: input.completeness,
    });
    return created._id.toString();
  },
  async linkSalon(salonId, branchId) {
    await SalonModel.updateOne(
      { _id: toObjectId(salonId) },
      { $set: { mainBranchId: toObjectId(branchId), branchCount: 1 } },
    ).exec();
  },
  countWithoutBranch: (target, salonId) =>
    COLLECTIONS[target]().countDocuments(withoutBranch(target, salonId)),
  async backfill(target, salonId, branch) {
    const set: Record<string, unknown> = { branchId: toObjectId(branch.id) };
    if (target === 'bookings') {
      set['branchSnapshot'] = {
        name: branch.name,
        ...(branch.locationText === undefined ? {} : { locationText: branch.locationText }),
        ...(branch.phone === undefined ? {} : { phone: branch.phone }),
      };
    }
    const result = await COLLECTIONS[target]().updateMany(withoutBranch(target, salonId), {
      $set: set,
    });
    return result.modifiedCount;
  },
});
