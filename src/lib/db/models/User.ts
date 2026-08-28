import { Schema, model, models, Model, Types } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "USER" | "ADMIN";

export interface IAddress {
  _id?: Types.ObjectId;
  label: string; // e.g. "Home", "Work"
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface ICartItem {
  product: Types.ObjectId;
  sku: string; // references Product.variants.sku — the exact size/color variant
  quantity: number;
  addedAt: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string; // absent for OAuth-only accounts
  image?: string;
  role: UserRole;
  provider: "credentials" | "google";
  emailVerified?: Date | null;
  phone?: string;
  addresses: IAddress[];
  cart: ICartItem[];
  wishlist: Types.ObjectId[];
  appliedCoupon?: {
    code: string;
    appliedAt: Date;
  } | null;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const AddressSchema = new Schema<IAddress>(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[+]?[0-9]{10,15}$/, "Invalid phone number"],
    },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9A-Za-z\- ]{3,12}$/, "Invalid postal code"],
    },
    country: { type: String, required: true, trim: true, default: "India" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const CartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      max: [20, "Quantity cannot exceed 20 per item"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
      index: true,
    },
    password: {
      type: String,
      select: false, // never returned by default queries
      minlength: 8,
    },
    image: { type: String },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      required: true,
    },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      required: true,
      default: "credentials",
    },
    emailVerified: { type: Date, default: null },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[0-9]{10,15}$/, "Invalid phone number"],
    },
    addresses: { type: [AddressSchema], default: [] },
    cart: { type: [CartItemSchema], default: [] },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    appliedCoupon: {
      type: {
        code: { type: String, uppercase: true, trim: true },
        appliedAt: { type: Date },
      },
      default: null,
    },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Only one default address at a time — enforced at application layer in the
// address API route (Mongoose can't atomically unset siblings on save here).

UserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const User: Model<IUser> =
  models.User || model<IUser>("User", UserSchema);

export default User;
