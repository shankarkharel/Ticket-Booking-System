FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package-lock.json* ./apps/api/
COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

RUN npm install --workspaces --include-workspace-root

COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api

WORKDIR /app/packages/contracts
RUN npm run build

WORKDIR /app/apps/api
RUN npm run prisma:generate
RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]
