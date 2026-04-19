FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm tsx

# Copy workspace manifests + lockfile
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all deps (tsx needed at runtime to handle TS shared package)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

EXPOSE 3001
CMD ["tsx", "apps/api/src/index.ts"]
