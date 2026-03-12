# Single-Concert Ticket Booking System

## 1. Project overview
A focused booking system for a single concert with three tiers (VIP, Front Row, GA). Pricing is fixed at VIP $100, Front Row $50, GA $10. Inventory is tracked by tier, bookings are transaction-safe, and idempotency prevents double-submit issues.

## 2. Why this architecture
- Monolith + Postgres: simplest reliable path for a take-home that still shows production judgment.
- Inventory per tier: the requirement is quantities, not seat numbers, so we avoid unnecessary complexity.
- USD-only display supports a global user base without multi-currency complexity.
- Fastify + Prisma: fast development, strong Postgres transaction support.
- Idempotency keys: protects against retries and double-clicks.

## 3. Concurrency strategy
The booking endpoint uses an atomic, conditional update for each tier inside a transaction:
- Requests are sorted by `tierId` to reduce deadlocks.
- `UPDATE ... SET remaining_quantity = remaining_quantity - $qty WHERE remaining_quantity >= $qty RETURNING *`.
- If any tier fails the update, the transaction aborts and no inventory is changed.

This guarantees no oversell under concurrent load.

## 4. Trade-offs
- Inventory-per-tier instead of seat numbers keeps scope aligned with requirements.
- Monolith over microservices for clarity and fast evaluation.
- Payment simulation happens after the reservation to avoid long-held locks.

## 5. Scale discussion
To support 1,000,000 DAU, 50,000 concurrent users, p95 < 500ms, and 99.99% availability:
- Stateless API replicas behind a load balancer.
- Postgres primary + read replicas for read-heavy endpoints.
- Redis cache for tier catalog reads.
- CDN for static web assets.
- Background workers for payment retries and reservation expiry.
- Aggressive observability: logs, metrics, tracing.
- Rate limiting + idempotency to protect the booking endpoint.

## 6. Reliability discussion
- Idempotency protects against duplicate requests.
- Inventory updates happen inside ACID transactions.
- Booking status transitions are explicit (`PENDING`, `CONFIRMED`, `FAILED`).
- Failed payments compensate inventory immediately.
- Designed for easy extension to reservation expiry or queue-based payment processing.

## 7. Run instructions
Prereqs: Docker + Docker Compose.

```bash
docker compose up --build
```

Services:
- API: `http://localhost:4000`
- Web: `http://localhost:5173`

Seed data is inserted automatically on container start.

### Useful API endpoints
- `GET /tiers`
- `POST /bookings`
  - header: `Idempotency-Key: <uuid>`
  - body: `{ "items": [{ "tierId": 1, "quantity": 2 }] }`

### Simulate payment failure
Send `x-fail-payment: 1` to force a failure and see inventory rollback.

### Concurrency proof
Run the script below while the stack is up:

```bash
docker compose exec api npm run test:concurrency
```

It fires 100 parallel requests against the GA tier and asserts confirmed bookings never exceed inventory.

## 8. Future improvements
- Reservation expiry with a background release job.
- Payment queue + retry policy.
- WebSocket live inventory updates.
- Audit logs for booking changes.
- Feature flags for pricing experiments.

## Project layout
- `apps/web`: React + Vite + Tailwind UI
- `apps/api`: Fastify + Prisma API
- `docker-compose.yml`: local orchestration
