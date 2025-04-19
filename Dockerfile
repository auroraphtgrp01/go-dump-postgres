FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Sao chép các file cần thiết cho frontend
COPY frontend/package.json frontend/yarn.lock ./
COPY frontend/.yarnrc.yml ./

# Cài đặt yarn
RUN corepack enable && corepack prepare yarn@3.6.1 --activate

# Cài đặt dependencies
RUN yarn install

# Sao chép source code của frontend
COPY frontend/ ./

# Build frontend
RUN yarn build

# Giai đoạn build Go backend
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

# Sao chép các file cần thiết cho Go
COPY go-backup/go.mod go-backup/go.sum ./
RUN go mod download

# Sao chép source code của Go
COPY go-backup/ ./

# Build Go backend
RUN CGO_ENABLED=0 GOOS=linux go build -o app ./cmd/backup/main.go

# Giai đoạn cuối cùng - image chạy
FROM alpine:latest

WORKDIR /app

# Cài đặt các công cụ cần thiết và Docker client
RUN apk add --no-cache postgresql-client tzdata ca-certificates curl shadow
# Cài đặt Docker client
RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.5.tgz -o docker.tgz \
    && tar --extract --file docker.tgz --strip-components 1 --directory /usr/local/bin/ \
    && rm docker.tgz

# Tạo các thư mục cần thiết
RUN mkdir -p /app/data /app/backups /app/backup

# Sao chép các file xây dựng từ các giai đoạn trước
COPY --from=backend-builder /app/app /app/
COPY --from=frontend-builder /app/frontend/dist /app/public

# Sao chép file .env (thử cả .env1 và .env)
COPY .env /app/.env
COPY go-backup/.env1 /app/.env1

# Thiết lập biến môi trường
ENV WEBAPP_PORT=8080
ENV GIN_MODE=release
ENV DB_SOURCE=/app/data/app.db
ENV BACKUP_DIR=/app/backup

# Expose cổng
EXPOSE 8080

# Khởi chạy ứng dụng
CMD ["/app/app", "-web"] 