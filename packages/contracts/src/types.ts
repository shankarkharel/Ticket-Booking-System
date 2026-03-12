export type Tier = {
  id: number;
  name: string;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
};

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED'
}

export type BookingItem = {
  tierId: number;
  quantity: number;
  unitPrice: number;
};

export type BookingResponse = {
  id: number;
  bookingReference: string;
  status: BookingStatus;
  items: BookingItem[];
  totalAmount: number;
  idempotent: boolean;
};

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'MISSING_IDEMPOTENCY_KEY'
  | 'INSUFFICIENT_INVENTORY'
  | 'INTERNAL_ERROR'
  | 'PAYMENT_FAILED';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  error: ApiError;
};
