export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address?: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  followUpNotes?: FollowUpNote[];
}

export interface FollowUpNote {
  id: number;
  note: string;
  customerId: number;
  createdBy: number;
  createdAt: string;
  createdByUser?: { id: number; name: string };
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category?: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  warehouseLocation?: string;
  imageUrl?: string;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdBy: number;
  createdAt: string;
  createdByUser?: { id: number; name: string };
}

export interface Challan {
  id: number;
  challanNumber: string;
  customerId: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  createdBy: number;
  createdAt: string;
  customer?: { id: number; name: string; businessName?: string };
  createdByUser?: { id: number; name: string };
  items?: ChallanItem[];
  _count?: { items: number };
}

export interface ChallanItem {
  id: number;
  challanId: number;
  productId: number;
  quantity: number;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  product?: { id: number; sku: string };
}
