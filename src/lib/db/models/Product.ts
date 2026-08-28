import { Schema, model, models, Model, Types } from "mongoose";

export interface IProductImage {
  url: string;
  publicId: string; // Cloudinary public_id, needed to delete/replace the asset
  isPrimary: boolean;
}

export interface IProductVariant {
  _id?: Types.ObjectId;
  sku: string; // unique identifier for this exact size/color combination
  size: string; // e.g. "S", "M", "L", "XL", "38", "40"
  color: string; // display name, e.g. "Midnight Blue"
  colorHex?: string; // for swatch rendering
  stock: number; // atomic source of truth for inventory
  priceOverride?: number; // optional per-variant price; falls back to product price
}

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: Types.ObjectId;
  brand?: string;
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  images: IProductImage[];
  price: number; // MRP
  discountPrice?: number; // selling price, must be <= price
  variants: IProductVariant[];
  tags: string[];
  ratingsAverage: number;
  ratingsCount: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema<IProductVariant>({
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  size: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  colorHex: {
    type: String,
    trim: true,
    match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color"],
  },
  stock: {
    type: Number,
    required: true,
    min: [0, "Stock cannot be negative"],
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: "Stock must be an integer",
    },
  },
  priceOverride: { type: Number, min: 0 },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"],
      index: true,
    },
    description: { type: String, required: true, maxlength: 5000 },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    brand: { type: String, trim: true, maxlength: 80 },
    gender: {
      type: String,
      enum: ["MEN", "WOMEN", "UNISEX", "KIDS"],
      required: true,
      index: true,
    },
    images: {
      type: [ProductImageSchema],
      validate: {
        validator: (v: IProductImage[]) => v.length > 0,
        message: "At least one product image is required",
      },
    },
    price: { type: Number, required: true, min: 0 },
    discountPrice: {
      type: Number,
      min: 0,
      validate: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validator: function (this: any, v: number) {
          return v === undefined || v === null || v <= this.price;
        },
        message: "Discount price cannot exceed MRP",
      },
    },
    variants: {
      type: [ProductVariantSchema],
      validate: {
        validator: (v: IProductVariant[]) => v.length > 0,
        message: "At least one size/color variant is required",
      },
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", description: "text", tags: "text" });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ gender: 1, isActive: 1 });

// Total stock across all variants — used for list-view "out of stock" badges
// without needing a separate aggregation query.
ProductSchema.virtual("totalStock").get(function (this: IProduct) {
  return this.variants.reduce((sum, v) => sum + v.stock, 0);
});

ProductSchema.set("toJSON", { virtuals: true });
ProductSchema.set("toObject", { virtuals: true });

export const Product: Model<IProduct> =
  models.Product || model<IProduct>("Product", ProductSchema);

export default Product;
