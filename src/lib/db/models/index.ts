export { default as User } from "./User";
export { default as Category } from "./Category";
export { default as Product } from "./Product";
export { default as Coupon } from "./Coupon";
export { default as Order } from "./Order";

export type { IUser, IAddress, ICartItem, UserRole } from "./User";
export type { ICategory } from "./Category";
export type { IProduct, IProductVariant, IProductImage } from "./Product";
export type { ICoupon, DiscountType } from "./Coupon";
export type {
  IOrder,
  IOrderItem,
  IShippingAddressSnapshot,
  OrderStatus,
  PaymentStatus,
} from "./Order";
