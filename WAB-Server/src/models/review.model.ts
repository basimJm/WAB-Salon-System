import { Schema, model, type Types } from 'mongoose';
import {
  REVIEW_STATUSES,
  REVIEW_TARGETS,
  type ReviewStatus,
  type ReviewTarget,
} from '../constants/enums';
import {
  REVIEWS_COLLECTION,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from '../constants/reviews';

/** A customer's rating of a salon or one of its staff, shown after admin approval. */
export interface ReviewRaw {
  target: ReviewTarget;
  salonId: Types.ObjectId;
  /** Branch of the visit (from the booking, or picked by the customer): a label only; the salon rating spans every branch. */
  branchId?: Types.ObjectId;
  /** The staff member (a `members` row) when the target is STAFF. */
  staffId?: Types.ObjectId;
  customerId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  moderation?: { by: Types.ObjectId; at: Date; reason?: string };
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewRaw>(
  {
    target: { type: String, enum: REVIEW_TARGETS, required: true },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: function (this: unknown): boolean {
        return (this as { target?: ReviewTarget }).target === 'STAFF';
      },
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    rating: {
      type: Number,
      required: true,
      min: REVIEW_RATING_MIN,
      max: REVIEW_RATING_MAX,
      validate: Number.isInteger,
    },
    comment: { type: String, trim: true, maxlength: REVIEW_COMMENT_MAX_LENGTH },
    status: { type: String, enum: REVIEW_STATUSES, default: 'PENDING', required: true },
    moderation: {
      type: new Schema(
        {
          by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
          at: { type: Date, required: true },
          reason: { type: String },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true, collection: REVIEWS_COLLECTION },
);
reviewSchema.index({ salonId: 1, target: 1, status: 1, createdAt: -1 });
reviewSchema.index({ staffId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, target: 1, salonId: 1, staffId: 1, status: 1 });
reviewSchema.index({ branchId: 1, status: 1, createdAt: -1 });

export const ReviewModel = model<ReviewRaw>('Review', reviewSchema);
