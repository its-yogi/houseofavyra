import { Schema, model, models, Model, Types } from "mongoose";

export type DiscountType = "PERCENTAGE" | "FLAT";

export interface ICoupon {
  _id: Types.ObjectId;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number; // percent (1-100) or flat amount, depending on discountType
  minCartValue: number; // cart subtotal must be >= this for the coupon to apply
  maxDiscountAmount?: number; // cap for PERCENTAGE coupons; ignored for FLAT
  usageLimit?: number; // total redemptions allowed across all users; undefined = unlimited
  usedCount: number;
  perUserLimit: number; // redemptions allowed per user
  expiryDate: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[A-Z0-9_-]+$/, "Coupon code may only contain letters, numbers, - and _"],
      index: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [0, "Discount value cannot be negative"],
      validate: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validator: function (this: any, v: number) {
          return this.discountType !== "PERCENTAGE" || v <= 100;
        },
        message: "Percentage discount cannot exceed 100",
      },
    },
    minCartValue: { type: Number, required: true, min: 0, default: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CouponSchema.index({ isActive: 1, expiryDate: 1 });

// NOTE: validity (expiry, usage caps, min cart value) must always be
// re-checked server-side at apply time AND at every cart mutation / order
// creation — never trust a coupon object cached on the client.

export const Coupon: Model<ICoupon> =
  models.Coupon || model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
