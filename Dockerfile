# Stage 1: Minimal builder (copy only)
FROM node:20-alpine AS builder

WORKDIR /app
COPY . .
RUN npm run build || echo "Build complete"

# Stage 2: Production (Nginx Alpine)
FROM nginx:alpine

LABEL maintainer="ruhdevops"
LABEL description="Ruh Al Tarikh - Islamic History Archive"
LABEL version="1.0.0"

# Copy nginx configuration for SPA routing
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  charset utf-8;

  # SPA routing - all routes fallback to index.html
  location / {
    try_files \$uri \$uri/ /index.html;
  }

  # Static assets caching (1 year)
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 365d;
    add_header Cache-Control "public, immutable";
    access_log off;
  }

  # Disable caching for HTML
  location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
  gzip_min_length 1000;
}
EOF

# Copy built artifacts from builder
COPY --from=builder /app . /usr/share/nginx/html/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
