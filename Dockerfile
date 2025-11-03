# Dockerfile
FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.18.2

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code and migrations
COPY src/ ./src/
COPY knexfile.cjs ./
COPY ssl/ ./ssl/

# Copy entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

