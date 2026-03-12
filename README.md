# Single-Concert Ticket Booking System

A production‑minded take‑home implementation for a single concert with three tiers (VIP, Front Row, GA). It emphasizes correctness under concurrency, **seat‑level holds**, idempotent booking, and a clean two‑page UX.

## Quick facts

- **Tiers & pricing**: VIP $100, Front Row $50, GA $10 (USD)
- **Frontend**: React + TypeScript + Vite + Tailwind + React Hook Form + TanStack Query
- **Backend**: Node.js + TypeScript + Fastify + Prisma
- **Database**: Postgres
- **Concurrency**: Atomic conditional updates in DB transactions
- **Idempotency**: Required `Idempotency-Key` header
- **Payment**: Mocked (PayPal/Card)
- **Flow**: Event info → Seat map → Hold (2 min) → Payment confirmation

![alt text](image.png)

## Why this architecture

- Monolith + Postgres: reliable, easy to run, strong transaction semantics.
- Seat‑level inventory: enables a realistic seat map UX and precise availability.
- Shared contracts: API + UI use the same Zod schemas and types.
- Idempotency + rate limiting: protects booking endpoint from retries and abuse.

## Concurrency strategy (no oversell)

The system uses **seat‑level holds** with transactional updates:

1. **Hold seats**: `POST /holds` updates only `AVAILABLE` seats to `HELD`, attaches a `holdToken`, and sets `holdExpiresAt` (2 min).
2. **Book**: `POST /bookings` assigns held seats to a booking only if the `holdToken` matches and hasn’t expired.
3. **Confirm**: On payment success, seats move from `HELD` → `BOOKED`.
4. **Expire holds**: Expired holds are released before listing tiers/seats and before any hold/booking mutation.

This prevents double‑booking even under parallel requests.

## Trade‑offs

- **Seat map added** (beyond tier‑only scope): improves UX and aligns with “no double‑booking” intent but adds schema/logic complexity.
- **Hold‑then‑pay**: avoids long transactions during payment simulation but requires expiry handling.
- Monolith over microservices for clarity and speed.

## Scale & reliability (design intent)

Targets: **1M DAU**, **50k concurrent**, **p95 < 500ms**, **99.99% availability**.

- Stateless API replicas behind a load balancer.
- Postgres primary + read replicas for scale.
- Redis cache for tiers/seats read paths.
- Background workers for hold expiry + retries.
- CDN for static assets.
- Observability: logs, metrics, tracing.
- Rate limiting + idempotency at the edge.

## Project layout

- `apps/web` – UI
- `apps/api` – API
- `packages/contracts` – shared Zod schemas + API types
- `docker-compose.yml` – local orchestration

## Run the project (Docker)

Prereqs: Docker + Docker Compose.

```bash
docker compose up --build
```

Services:

- API: `http://localhost:4000`
- Web: `http://localhost:5173`
- Postgres (host): `localhost:55432`

Seed data is inserted automatically on container start.

### Local install (without Docker)

From repo root (workspaces enabled):

```bash
npm install
```

Then from `apps/api`:

```bash
npx prisma generate
npx prisma db push
npm run dev
```

From `apps/web`:

```bash
npm run dev
```

## View the database (Prisma Studio)

**Preferred (latest UI with Prisma 7):**

```bash
npx prisma studio --url "postgresql://ticket_user:ticket_pass@localhost:55432/ticket_db?schema=public"
```

If your CLI version doesn’t support `--url`, use:

```bash
DATABASE_URL="postgresql://ticket_user:ticket_pass@localhost:55432/ticket_db?schema=public" \
npx prisma studio --schema prisma/schema.prisma
```

## API testing

### Get tiers

```bash
curl http://localhost:4000/tiers
```

### Get seats

```bash
curl http://localhost:4000/seats
```

### Hold seats

```bash
curl -X POST http://localhost:4000/holds \
  -H "Content-Type: application/json" \
  -d '{"seatIds":[1,2,3]}'
```

### Release a hold

```bash
curl -X POST http://localhost:4000/holds/release \
  -H "Content-Type: application/json" \
  -d '{"holdToken":"<token>"}'
```

### Create a booking

```bash
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "name": "Alex Johnson",
    "email": "alex@email.com",
    "holdToken": "<token>",
    "seatIds": [1,2,3]
  }'
```

### Simulate payment failure

```bash
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "x-fail-payment: 1" \
  -d '{
    "name": "Alex Johnson",
    "email": "alex@email.com",
    "holdToken": "<token>",
    "seatIds": [1]
  }'
```

## Concurrency proof

```bash
docker compose exec api npm run test:concurrency
```

Fires 100 parallel requests against GA, verifies holds and bookings never exceed availability.

## Developer tooling

From repo root:

- `npm run lint`
- `npm run format`
- `npm run typecheck`

## Backend structure

- `apps/api/src/app.ts` – app setup + middleware
- `apps/api/src/routes/*` – route handlers
- `apps/api/src/services/*` – business logic
- `apps/api/src/schemas/*` – request validation
- `apps/api/src/http/error.ts` – API error envelope
- `apps/api/src/utils/*` – helpers
- `apps/api/src/db.ts` – Prisma client

## Future improvements

- Reservation expiry worker (currently handled on request paths)
- Queue‑based payment processing
- WebSocket live inventory updates
- Audit logs
- Feature flags

## Screens

Home Page  
![alt text](image-2.png)

Booking Page  
![alt text](image-4.png)
