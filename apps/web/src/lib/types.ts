export type Tier = {
  id: number;
  name: string;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
};

export type BookingItem = {
  tierId: number;
  quantity: number;
  unitPrice: number;
};

export type BookingResponse = {
  id: number;
  bookingReference: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  items: BookingItem[];
  totalAmount: number;
  idempotent: boolean;
};
