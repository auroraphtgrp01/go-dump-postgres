FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package manager files and install dependencies
COPY frontend/package.json frontend/yarn.lock frontend/.yarnrc.yml ./
RUN corepack enable && corepack prepare yarn@3.6.1 --activate && yarn install

# Copy frontend source code and build
COPY frontend/ ./
RUN yarn build

FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

# Copy Go package manager files and install dependencies
COPY go-backup/go.mod go-backup/go.sum ./
RUN go mod download

# Copy backend source code and build
COPY go-backup/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o app ./cmd/backup/main.go

FROM alpine:latest

WORKDIR /app

# Install required tools and Docker client
RUN apk add --no-cache ca-certificates curl postgresql-client shadow tzdata \
    && curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.5.tgz -o docker.tgz \
    && tar --extract --file docker.tgz --strip-components 1 --directory /usr/local/bin/ \
    && rm docker.tgz

# Create necessary directories
RUN mkdir -p /app/data /app/backups /app/backup

# Copy built files from previous stages
COPY --from=backend-builder /app/app /app/
COPY --from=frontend-builder /app/frontend/dist /app/public

# Copy environment files
COPY .env /app/.env
COPY go-backup/.env /app/.env

# Set environment variables
ENV WEBAPP_PORT=8080 \
    GIN_MODE=release \
    DB_SOURCE=/app/data/app.db \
    BACKUP_DIR=/app/backup

# Expose port
EXPOSE 8080

# Start the application
CMD ["/app/app", "-web"]
