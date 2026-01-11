# Dockerfile
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy lockfiles first (max cache)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build Vite frontend
RUN bun run build

# Production stage
FROM oven/bun:1
WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Install production deps only
RUN bun install --production

# Expose ports — NO COMMENTS ON SAME LINE!
EXPOSE 3000
EXPOSE 8080

# Start server
CMD ["bun", "run", "src/server/http/server.ts"]
