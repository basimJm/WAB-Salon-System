package com.fab.wab.merchant.core.data.contract

import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.Operation
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonHoursClosuresByIdData
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonServicesByIdData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonHoursClosuresData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonServicesData
import com.fab.wab.merchant.core.data.contract.generated.PutSalonHoursWeeklyData
import kotlinx.serialization.KSerializer
import kotlinx.serialization.serializer

/** The contract operations the merchant app calls (`grep MerchantOperations.` in core, feature and composeApp code). */
internal object AppOperations {
    val all: List<Operation> = listOf(
        MerchantOperations.deleteBranchesByBranchIdHoursClosuresById, MerchantOperations.deleteSalonGalleryById,
        MerchantOperations.deleteSalonHoursClosuresById, MerchantOperations.deleteTeamMembersByIdLeavesByLeaveId,
        MerchantOperations.getBookings, MerchantOperations.getBookingsById, MerchantOperations.getBookingsCalendar,
        MerchantOperations.getBranches, MerchantOperations.getBranchesByBranchIdHours, MerchantOperations.getBranchesByBranchIdServices,
        MerchantOperations.getCatalogRequests, MerchantOperations.getCatalogServices, MerchantOperations.getConfig,
        MerchantOperations.getContentFaqs, MerchantOperations.getContentPagesBySlug, MerchantOperations.getDashboard,
        MerchantOperations.getFinanceBalance, MerchantOperations.getFinancePayouts, MerchantOperations.getFinanceRefunds,
        MerchantOperations.getFinanceTransactions, MerchantOperations.getLocationsAreas, MerchantOperations.getLocationsCities,
        MerchantOperations.getLocationsCountries, MerchantOperations.getMe, MerchantOperations.getNotifications,
        MerchantOperations.getNotificationsUnreadCount, MerchantOperations.getReviews, MerchantOperations.getSalon,
        MerchantOperations.getSalonApplication, MerchantOperations.getSalonGallery, MerchantOperations.getSalonHours,
        MerchantOperations.getSalonPayoutDetails, MerchantOperations.getSalonPolicy, MerchantOperations.getSalonServices,
        MerchantOperations.getStatistics, MerchantOperations.getSubscription, MerchantOperations.getTeamMembers,
        MerchantOperations.getTeamMembersById, MerchantOperations.getTeamMembersByIdLeaves, MerchantOperations.getTeamMembersByIdStaff,
        MerchantOperations.patchBranchesByBranchId, MerchantOperations.patchBranchesByBranchIdHoursClosuresById,
        MerchantOperations.patchBranchesByBranchIdServicesById, MerchantOperations.patchInstallationsPushEnabled,
        MerchantOperations.patchMe, MerchantOperations.patchSalonHoursClosuresById, MerchantOperations.patchSalonProfile,
        MerchantOperations.patchSalonServicesById, MerchantOperations.patchTeamMembersById,
        MerchantOperations.patchTeamMembersByIdLeavesByLeaveId, MerchantOperations.postAuthChangePhone,
        MerchantOperations.postAuthCheckPhone, MerchantOperations.postAuthLogin, MerchantOperations.postAuthLogout,
        MerchantOperations.postAuthOtpRequest, MerchantOperations.postAuthOtpWrongAttempt, MerchantOperations.postBookingsByIdApprove,
        MerchantOperations.postBookingsByIdCancel, MerchantOperations.postBookingsByIdComplete,
        MerchantOperations.postBookingsByIdNoShow, MerchantOperations.postBookingsByIdReassign,
        MerchantOperations.postBookingsByIdReject, MerchantOperations.postBookingsCancelAffected, MerchantOperations.postBranches,
        MerchantOperations.postBranchesByBranchIdClose, MerchantOperations.postBranchesByBranchIdHoursClosures,
        MerchantOperations.postBranchesByBranchIdMain, MerchantOperations.postBranchesByBranchIdOffline,
        MerchantOperations.postBranchesByBranchIdOnline, MerchantOperations.postBranchesByBranchIdServices,
        MerchantOperations.postCatalogRequests, MerchantOperations.postMeLeave, MerchantOperations.postNotificationsRead,
        MerchantOperations.postSalonApplicationResubmit, MerchantOperations.postSalonApplications,
        MerchantOperations.postSalonDeletionRequest, MerchantOperations.postSalonGallery, MerchantOperations.postSalonHoursClosures,
        MerchantOperations.postSalonServices, MerchantOperations.postTeamMembers, MerchantOperations.postTeamMembersByIdDeactivate,
        MerchantOperations.postTeamMembersByIdLeaves, MerchantOperations.postTeamMembersByIdReactivate,
        MerchantOperations.postUploadsConfirm, MerchantOperations.postUploadsLicenseConfirm,
        MerchantOperations.postUploadsLicensePresign, MerchantOperations.postUploadsPresign,
        MerchantOperations.putBranchesByBranchIdHoursWeekly, MerchantOperations.putInstallations,
        MerchantOperations.putSalonGalleryOrder, MerchantOperations.putSalonHoursWeekly, MerchantOperations.putSalonPayoutDetails,
        MerchantOperations.putSalonPolicy, MerchantOperations.putTeamMembersByIdStaff,
    )

    /**
     * Not captured (docs/REMOTE_DEV_GAPS.md): complete / no-show need a booking whose start has passed; resubmit needs an
     * application an admin rejected; switching the main branch would change the seeded salon; every catalog service is
     * already offered by the seeded salon (its branch twins are captured and decode with the same DTOs, see [decodedAs]);
     * leave = `data: null`, answered 200 on the local stack (MER-054 run 1).
     */
    val notCapturable: List<Operation> = listOf(
        MerchantOperations.postBookingsByIdComplete,
        MerchantOperations.postBookingsByIdNoShow,
        MerchantOperations.postSalonApplicationResubmit,
        MerchantOperations.postBranchesByBranchIdMain,
        MerchantOperations.postSalonServices,
        MerchantOperations.patchSalonServicesById,
        MerchantOperations.postMeLeave,
    )

    /** Operations the app decodes with another operation's DTO (branch paths through `branchPath`, branch actions). */
    val decodedAs: List<Pair<Operation, KSerializer<*>>> = listOf(
        MerchantOperations.getBranches to serializer<List<GetBranchesByBranchIdData>>(),
        MerchantOperations.postBranches to serializer<GetBranchesByBranchIdData>(),
        MerchantOperations.patchBranchesByBranchId to serializer<GetBranchesByBranchIdData>(),
        MerchantOperations.postBranchesByBranchIdOffline to serializer<GetBranchesByBranchIdData>(),
        MerchantOperations.postBranchesByBranchIdOnline to serializer<GetBranchesByBranchIdData>(),
        MerchantOperations.postBranchesByBranchIdClose to serializer<GetBranchesByBranchIdData>(),
        MerchantOperations.getBranchesByBranchIdHours to serializer<GetSalonHoursData>(),
        MerchantOperations.putBranchesByBranchIdHoursWeekly to serializer<PutSalonHoursWeeklyData>(),
        MerchantOperations.postBranchesByBranchIdHoursClosures to serializer<PostSalonHoursClosuresData>(),
        MerchantOperations.patchBranchesByBranchIdHoursClosuresById to serializer<PatchSalonHoursClosuresByIdData>(),
        MerchantOperations.getBranchesByBranchIdServices to serializer<List<GetSalonServicesDataItem>>(),
        MerchantOperations.postBranchesByBranchIdServices to serializer<PostSalonServicesData>(),
        MerchantOperations.patchBranchesByBranchIdServicesById to serializer<PatchSalonServicesByIdData>(),
    )
}
