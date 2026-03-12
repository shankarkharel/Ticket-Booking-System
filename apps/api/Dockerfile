FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]
