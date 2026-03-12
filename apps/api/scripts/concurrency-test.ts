import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const CONCURRENCY = Number(process.env.CONCURRENCY || 100);
const TIER_NAME = process.env.TIER_NAME || 'GA';
const SEAT_COUNT = Number(process.env.SEAT_COUNT || 5);

const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
};

const main = async () => {
  const { data: tiers } = await fetchJson(`${API_URL}/tiers`);
  const { data: seats } = await fetchJson(`${API_URL}/seats`);
  if (!Array.isArray(tiers) || !Array.isArray(seats)) {
    throw new Error('Failed to load tiers or seats. Is the API running?');
  }

  const tier = tiers.find((item) => item.name === TIER_NAME);
  if (!tier) {
    throw new Error(`Tier "${TIER_NAME}" not found.`);
  }

  const availableSeats = seats.filter(
    (seat) => seat.tierId === tier.id && seat.status === 'AVAILABLE'
  );
  const targetSeats = availableSeats.slice(0, SEAT_COUNT).map((seat) => seat.id);

  if (targetSeats.length < SEAT_COUNT) {
    throw new Error(`Not enough available seats for ${TIER_NAME}.`);
  }

  const { data: hold } = await fetchJson(`${API_URL}/holds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ seatIds: targetSeats })
  });

  if (!hold?.holdToken) {
    throw new Error('Failed to hold seats for concurrency test.');
  }

  const requests = Array.from({ length: CONCURRENCY }, () =>
    fetchJson(`${API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': randomUUID()
      },
      body: JSON.stringify({
        name: 'Load Test',
        email: 'loadtest@example.com',
        holdToken: hold.holdToken,
        seatIds: targetSeats
      })
    })
  );

  const results = await Promise.allSettled(requests);

  const confirmed = results.filter((result) => {
    if (result.status !== 'fulfilled') return false;
    return result.value.data?.status === 'CONFIRMED';
  }).length;

  const { data: seatsAfter } = await fetchJson(`${API_URL}/seats`);
  const afterSeats = Array.isArray(seatsAfter)
    ? seatsAfter.filter((seat) => targetSeats.includes(seat.id))
    : [];
  const bookedSeats = afterSeats.filter((seat) => seat.status === 'BOOKED').length;

  console.log('Concurrency test results');
  console.log(`Tier: ${TIER_NAME}`);
  console.log(`Seat set size: ${targetSeats.length}`);
  console.log(`Confirmed bookings: ${confirmed}`);
  console.log(`Booked seats after: ${bookedSeats}`);

  if (confirmed > 1 || bookedSeats > targetSeats.length) {
    throw new Error('Double-booking detected.');
  }

  console.log('No double-booking detected.');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
