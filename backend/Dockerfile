FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source
COPY src ./src

# Build TypeScript (assumes "build": "tsc")
RUN npm run build

# Expose the backend port
EXPOSE 8000

# Start server (assumes "start": "node dist/server.js")
CMD ["npm", "run", "start"]
