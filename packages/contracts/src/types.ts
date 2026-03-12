export type Tier = {
  id: number;
  name: string;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
};

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  BOOKED = 'BOOKED'
}

export type Seat = {
  id: number;
  tierId: number;
  row: string;
  number: number;
  label: string;
  status: SeatStatus;
};

export type HoldResponse = {
  holdToken: string;
  expiresAt: string;
  seatIds: number[];
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
  seatIds: number[];
  totalAmount: number;
  idempotent: boolean;
};

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'MISSING_IDEMPOTENCY_KEY'
  | 'INSUFFICIENT_INVENTORY'
  | 'SEAT_UNAVAILABLE'
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
