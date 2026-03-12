FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
COPY apps/api/package.json apps/api/package-lock.json* ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/

RUN npm install --workspaces --include-workspace-root --include=optional

COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web

WORKDIR /app/packages/contracts
RUN npm run build

WORKDIR /app/apps/web

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview"]
