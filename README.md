# Single-Concert Ticket Booking System

A production‑minded take‑home implementation for a single concert with three tiers (VIP, Front Row, GA). It emphasizes correctness under concurrency, idempotent booking, and clean UX.

## Quick facts

- **Tiers & pricing**: VIP $100, Front Row $50, GA $10 (USD)
- **Frontend**: React + TypeScript + Vite + Tailwind + React Hook Form + TanStack Query
- **Backend**: Node.js + TypeScript + Fastify + Prisma
- **Database**: Postgres
  ![alt text](image-1.png)
- **Concurrency**: Atomic conditional updates in a DB transaction
- **Idempotency**: Required `Idempotency-Key` header
- **Payment**: Mocked (PayPal/Card)
- **Two pages**: Event info → Booking flow

![alt text](image.png)

## Why this architecture

- Monolith + Postgres: reliable, easy to run, strong transaction semantics.
- Inventory per tier: matches requirements without seat‑level complexity.
- Shared contracts: API + UI use the same Zod schemas and types.
- Idempotency + rate limiting: protects booking endpoint from retries and abuse.

## Concurrency strategy (no oversell)

The booking transaction uses an atomic conditional update per tier:

- Requests are sorted by `tierId` to reduce deadlocks.
- `UPDATE ticket_tiers SET remaining_quantity = remaining_quantity - $qty WHERE remaining_quantity >= $qty RETURNING *`.
- If any update fails, the transaction aborts and inventory remains consistent.

## Trade‑offs

- Tier inventory (not seat numbers) to keep scope aligned.
- Monolith over microservices for clarity and speed.
- Payment simulation happens after inventory reservation to avoid long‑held locks.

## Scale & reliability (design intent)

Targets: **1M DAU**, **50k concurrent**, **p95 < 500ms**, **99.99% availability**.

- Stateless API replicas behind a load balancer.
- Postgres primary + read replicas for scale.
- Redis cache for tier catalog.
- CDN for static assets.
- Background workers for retries + reservation expiry.
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

### Create a booking

```bash
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "name": "Alex Johnson",
    "email": "alex@email.com",
    "items": [{"tierId": 1, "quantity": 2}]
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
    "items": [{"tierId": 1, "quantity": 1}]
  }'
```

## Concurrency proof

```bash
docker compose exec api npm run test:concurrency
```

Fires 100 parallel requests against GA and asserts no oversell.

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

- Reservation expiry worker
- Queue‑based payment processing
- WebSocket live inventory updates
- Audit logs
- Feature flags

Build & Run

```bash
docker compose down
docker compose up --build
```

Open http://localhost:5173 and complete a booking.
API sanity

curl http://localhost:4000/health
curl http://localhost:4000/tiers

## Concurrency proof

```bash
 npm run -w apps/api test:concurrency
```

`Confirm “confirmed tickets ≤ available”.`

## Quality gates

```bash
npm run lint
npm run typecheck
```

OUTPUT:
Home Page
![alt text](image-2.png)

Booking Page
![alt text](image-4.png)
