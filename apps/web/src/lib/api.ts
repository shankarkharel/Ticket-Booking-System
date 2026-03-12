import type {
  BookingResponse,
  Tier,
  ApiErrorResponse,
  Seat,
  HoldResponse
} from '@ticket/contracts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const fetchTiers = async (): Promise<Tier[]> => {
  const response = await fetch(`${API_URL}/tiers`);
  if (!response.ok) {
    throw new Error('Failed to load tiers.');
  }
  return response.json();
};

export const fetchSeats = async (): Promise<Seat[]> => {
  const response = await fetch(`${API_URL}/seats`);
  if (!response.ok) {
    throw new Error('Failed to load seats.');
  }
  return response.json();
};

export const createHold = async (payload: { seatIds: number[] }): Promise<HoldResponse> => {
  const response = await fetch(`${API_URL}/holds`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const errorPayload = body as ApiErrorResponse | null;
    const message = errorPayload?.error?.message || body?.error || 'Unable to hold seats.';
    throw new Error(message);
  }

  return body as HoldResponse;
};

export const releaseHold = async (holdToken: string) => {
  const response = await fetch(`${API_URL}/holds/release`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ holdToken })
  });

  if (!response.ok) {
    throw new Error('Unable to release hold.');
  }
};

export const createBooking = async (payload: {
  seatIds: number[];
  holdToken: string;
  name: string;
  email: string;
}) => {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID()
    },
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const errorPayload = body as ApiErrorResponse | null;
    const message =
      errorPayload?.error?.message || body?.error || 'Booking failed. Please try again.';
    throw new Error(message);
  }

  return body as BookingResponse;
};
