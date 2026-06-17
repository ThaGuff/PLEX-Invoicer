# ── Invoice King — Multi-stage Dockerfile ────────────────────────
# Fixes all 7 Railway nixpacks security warnings:
#   SecretsUsedInArgOrEnv → secrets are RUNTIME env vars, not build-time
#   UndefinedVar $NIXPACKS_PATH → replaced by explicit Dockerfile
#
# Build-time: only VITE_* public values (safe — anon Supabase keys)
# Runtime: all secrets injected by Railway as environment variables
#          NEVER baked into image layers

# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for Vite build)
RUN npm ci --include=dev --legacy-peer-deps

# Copy source code
COPY . .

# VITE_ vars are PUBLIC Supabase anon keys — safe to include in frontend bundle
# Supabase anon key is designed to be public; Row Level Security protects data
# Railway passes these as build-time variables (not secrets)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the frontend (Vite bakes VITE_* into the bundle)
RUN npm run build

# ── Stage 2: Production runtime ───────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S plex -u 1001 -G nodejs

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built frontend and server code from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/serve.json ./serve.json

# server/utils/pdf.js (Feature Request 2 — AI-drafted email PDF attachment)
# imports the shared PDF-rendering core from src/utils/exportPDF.js, which
# also depends on src/data/services.js. The runtime stage otherwise never
# copies anything from src/ at all (it only exists pre-build in the builder
# stage, compiled into dist/ for the frontend) — without these two explicit
# copies, the server crashes on startup with ERR_MODULE_NOT_FOUND the
# instant any route imports server/utils/pdf.js, since that file does not
# exist in the runtime container. Copying only these two specific files
# (not all of src/) keeps the production image as small as the multi-stage
# build intends.
COPY --from=builder /app/src/utils/exportPDF.js ./src/utils/exportPDF.js
COPY --from=builder /app/src/data/services.js   ./src/data/services.js

# Create data directory for SQLite fallback (if Supabase not configured)
RUN mkdir -p /app/data && chown -R plex:nodejs /app/data

# Switch to non-root user
USER plex

# Expose port
EXPOSE 4173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:4173/',r=>{process.exit(r.statusCode<500?0:1)}).on('error',()=>process.exit(1))"

# Start server
# ALL secrets (STRIPE, OPENAI, SUPABASE_SERVICE_KEY, SMTP, etc.) are
# injected at RUNTIME by Railway — never baked into this image.
CMD ["node", "server.js"]
