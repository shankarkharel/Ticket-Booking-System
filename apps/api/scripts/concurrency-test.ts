import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const CONCURRENCY = Number(process.env.CONCURRENCY || 100);
const TIER_NAME = process.env.TIER_NAME || 'GA';
const QUANTITY = Number(process.env.QUANTITY || 1);

const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
};

const main = async () => {
  const { data: tiers } = await fetchJson(`${API_URL}/tiers`);
  if (!Array.isArray(tiers)) {
    throw new Error('Failed to load tiers. Is the API running?');
  }

  const tier = tiers.find((item) => item.name === TIER_NAME);
  if (!tier) {
    throw new Error(`Tier "${TIER_NAME}" not found.`);
  }

  const startingRemaining = tier.remainingQuantity as number;

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
        items: [{ tierId: tier.id, quantity: QUANTITY }]
      })
    })
  );

  const results = await Promise.allSettled(requests);

  const confirmed = results.filter((result) => {
    if (result.status !== 'fulfilled') return false;
    return result.value.data?.status === 'CONFIRMED';
  }).length;

  const { data: tiersAfter } = await fetchJson(`${API_URL}/tiers`);
  const after = Array.isArray(tiersAfter)
    ? tiersAfter.find((item) => item.id === tier.id)
    : undefined;

  const remaining = after?.remainingQuantity ?? 'unknown';
  const totalBooked = confirmed * QUANTITY;

  console.log('Concurrency test results');
  console.log(`Tier: ${TIER_NAME}`);
  console.log(`Starting remaining: ${startingRemaining}`);
  console.log(`Confirmed bookings: ${confirmed}`);
  console.log(`Total booked: ${totalBooked}`);
  console.log(`Remaining after: ${remaining}`);

  if (totalBooked > startingRemaining) {
    throw new Error('Oversell detected.');
  }

  console.log('No oversell detected.');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
