import { Schema, model, models, Model, Types } from "mongoose";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: Types.ObjectId | null; // supports nested categories e.g. Men > Upper > Shirts
  gender?: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"],
      index: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    gender: {
      type: String,
      enum: ["MEN", "WOMEN", "UNISEX", "KIDS"],
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ parent: 1, isActive: 1 });

export const Category: Model<ICategory> =
  models.Category || model<ICategory>("Category", CategorySchema);

export default Category;
