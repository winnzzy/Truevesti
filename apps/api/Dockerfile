FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl

# Copy root package files and all workspace package.json files
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# Install ALL dependencies including devDependencies (needed for tsc @types/*).
# Use --include=dev to override NODE_ENV=production set by Render at build time.
RUN npm install --include=dev

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate --workspace apps/api
RUN npm run build --workspace apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm", "run", "start"]