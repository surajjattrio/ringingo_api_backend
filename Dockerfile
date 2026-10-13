# -------------------------
# 1. BUILD STAGE
# -------------------------
FROM node:24.11.1-alpine AS builder

WORKDIR /app

# Copy package.json first
COPY package*.json ./

# Install dependencies
RUN npm install --force

# COPY FULL SOURCE (THIS WAS THE MISSING STEP!)
COPY . .
RUN ls -la /app
# Build NestJS → generates /app/dist
RUN npm run build
RUN ls -la /app/build


# -------------------------
# 2. PRODUCTION STAGE
# -------------------------
FROM node:24.11.1-alpine

WORKDIR /app

RUN apk add --no-cache tzdata

ENV TZ=Asia/Kolkata

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

ENV NODE_ENV=production
RUN ls -la /app
# Copy build output
COPY --from=builder /app/build ./build
RUN ls -la /app/build
# Copy dependencies
# Copy package.json + package-lock.json
COPY --from=builder /app/package*.json ./

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy NON-TS assets that backend needs (your real folders)
COPY --from=builder /app/caching ./caching
COPY --from=builder /app/certs ./certs
COPY --from=builder /app/upload ./upload
COPY --from=builder /app/src ./src

# Copy config files needed at runtime
COPY --from=builder /app/tsconfig.json .
COPY --from=builder /app/tsconfig.build.json .
COPY --from=builder /app/nest-cli.json .

#USER node

EXPOSE 80

CMD ["npm", "start"]
