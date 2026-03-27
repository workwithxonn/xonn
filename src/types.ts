export type ProductType = 'thumbnail' | 'gfx' | 'kit';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

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
  paymentStatus: 'pending' | 'partial' | 'full';
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
}
