# Multi-stage build for production-ready TradePrivate dApp

# ===== Build Stage =====
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# ===== Production Stage =====
FROM nginx:alpine AS production

# Install security updates
RUN apk update && apk upgrade

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Copy static assets
COPY --from=builder /app/public /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tradeprivate -u 1001

# Set proper permissions
RUN chown -R tradeprivate:nodejs /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Security: Remove default nginx user
RUN deluser nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Labels for metadata
LABEL maintainer="TradePrivate Team <dev@tradeprivate.finance>"
LABEL version="1.0.0"
LABEL description="TradePrivate dApp - Privacy-First Perpetual DEX"

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 