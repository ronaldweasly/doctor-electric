# =============================================================================
# SolarCRM Frontend - Production Dockerfile
# =============================================================================
# Multi-stage build:
# Stage 1: Install deps + build the Vite/React app
# Stage 2: Copy build artifacts to a shared volume
#
# WHY multi-stage: The final image is tiny (~5MB) because it only contains
# the compiled static files. Node.js and node_modules are discarded.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better Docker layer caching
# This layer is only rebuilt when dependencies change
COPY package.json package-lock.json ./

# Install dependencies (ci = clean install, reproducible builds)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build arguments become environment variables during build
# These get baked into the static JS bundle
ARG VITE_API_URL
ARG VITE_APP_NAME

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}

# Build the production bundle
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Output
# ---------------------------------------------------------------------------
# WHY busybox: We just need to copy files to a volume. Alpine would work too,
# but busybox is even smaller (~1MB).
FROM busybox:1.36

WORKDIR /app/dist

# Copy the built static files from the builder stage
COPY --from=builder /app/dist .

# This container's only job is to populate the shared volume
# It copies the build output to /app/dist (which is a Docker volume mount)
# and then exits. Nginx reads from this volume.
CMD ["sh", "-c", "echo '✅ Frontend build complete. Files ready for Nginx.' && ls -la /app/dist/"]
