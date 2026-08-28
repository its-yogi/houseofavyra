import { Schema, model, models, Model, Types } from "mongoose";

export type OrderStatus =
  | "PENDING_PAYMENT" // Razorpay order created, awaiting payment confirmation
  | "PAID"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED"
  | "PAYMENT_FAILED";

export type PaymentStatus = "CREATED" | "PAID" | "FAILED" | "REFUNDED";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string; // snapshot — product may change/be deleted after purchase
  image: string;
  sku: string;
  size: string;
  color: string;
  unitPrice: number; // price actually paid per unit at time of purchase
  quantity: number;
}

export interface IShippingAddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string; // human-readable, e.g. ORD-20260827-0001
  user: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddressSnapshot;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  coupon?: {
    code: string;
    discountType: "PERCENTAGE" | "FLAT";
    discountValue: number;
  } | null;
  payment: {
    method: "RAZORPAY";
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    status: PaymentStatus;
    refundId?: string;
    failureReason?: string;
  };
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: Date; note?: string }[];
  stockDecremented: boolean; // guards against double-decrementing on webhook retries
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    sku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema<IShippingAddressSnapshot>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: "India" },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: {
      type: [OrderItemSchema],
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: "Order must contain at least one item",
      },
    },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    coupon: {
      type: {
        code: { type: String },
        discountType: { type: String, enum: ["PERCENTAGE", "FLAT"] },
        discountValue: { type: Number },
      },
      default: null,
    },
    payment: {
      method: { type: String, enum: ["RAZORPAY"], default: "RAZORPAY" },
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: { type: String, index: true },
      razorpaySignature: { type: String },
      status: {
        type: String,
        enum: ["CREATED", "PAID", "FAILED", "REFUNDED"],
        default: "CREATED",
      },
      refundId: { type: String },
      failureReason: { type: String },
    },
    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "PAID",
        "CONFIRMED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
        "PAYMENT_FAILED",
      ],
      default: "PENDING_PAYMENT",
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    stockDecremented: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrderSchema.index({ user: 1, createdAt: -1 });

// total = subtotal + shippingFee - discount, always validated server-side
// (in the order-creation route) before save — never trust a client-sent total.

export const Order: Model<IOrder> =
  models.Order || model<IOrder>("Order", OrderSchema);

export default Order;
