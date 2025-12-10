FROM node:20-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 8000
CMD ["node", "dist/server.js"]
