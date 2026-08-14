export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  selectedSize: string;
}

export interface ShippingInfo {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  apartment?: string;
  region: string;
  city: string;
  rut?: string;
  shipping_method?: 'shipping' | 'pickup';
  shipping_cost?: number;
}

export interface DiscountInfo {
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  amount: number;
}

export interface Order {
  id: string;
  user_id: string;
  created_at: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
  shipping_info: ShippingInfo;
  discount_info?: DiscountInfo | null;
  payment_id?: string | null;
}

export interface OrderDTO {
  id: string;
  userId: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  discountInfo: DiscountInfo | null;
  paymentId: string | null;
}
