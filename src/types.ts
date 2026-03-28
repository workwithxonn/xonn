export type ProductType = 'thumbnail' | 'gfx' | 'kit';
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'processing' | 'completed' | 'cancelled' | 'delivered';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  type: ProductType;
  popular?: boolean;
}

export interface Order {
  id?: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerUpiId: string;
  channelName?: string;
  niche?: string;
  projectDetails: string;
  budget?: string;
  referenceImages?: string[];
  productId: string;
  status: OrderStatus;
  createdAt: any; // Firestore Timestamp
  amount: number;
  advancePaid: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  deliveryLink?: string;
  deliveryFileUrl?: string;
  deliveredAt?: any;
}

export interface AdminDevice {
  id: string;
  name: string;
  userAgent: string;
  lastUsed: any; // Firestore Timestamp
  isTrusted: boolean;
}
