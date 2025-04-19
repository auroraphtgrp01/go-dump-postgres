# Go-Dump-Postgres

Dự án backup PostgreSQL tự động với giao diện web React. Chạy trong Docker container để dễ dàng triển khai.

## Mô tả

Dự án này bao gồm:
- **Backend**: Ứng dụng Go để dump cơ sở dữ liệu PostgreSQL và sao lưu lên Google Drive
- **Frontend**: Ứng dụng React/Vite để quản lý và theo dõi các bản sao lưu

## Yêu cầu

- Docker
- Docker Compose

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd go-dump-postgres
```

2. Cấu hình file .env (đã được tạo sẵn với giá trị mặc định):
```bash
# Chỉnh sửa file .env nếu cần
nano .env
```

3. Xây dựng và khởi chạy container:
```bash
docker-compose up -d
```

## Cấu hình

Bạn có thể tùy chỉnh các cài đặt trong file `.env`:

```properties
# Web application configuration
WEBAPP_PORT=8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=AeNQ9tTNpj6FkE8wM3nP4Dt3X6v2Y78K9Gw5yH3Jj2Ks4Mt7KpW2aPcFmX5R7T

# Google Drive configuration
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
FOLDER_DRIVE=SHMS_Database_Backups

# Backup configuration
CRON_SCHEDULE=*/5 * * * *
```

## Truy cập

- **Web UI và API**: http://localhost:8080 (hoặc cổng bạn đã cấu hình trong WEBAPP_PORT)

## Các lệnh Docker Compose

- Khởi động dịch vụ:
```bash
docker-compose up -d
```

- Xem logs:
```bash
docker-compose logs -f
```

- Dừng dịch vụ:
```bash
docker-compose down
```

- Xây dựng lại sau khi chỉnh sửa:
```bash
docker-compose up -d --build
```

## Cấu trúc thư mục

```
.
├── Dockerfile
├── docker-compose.yml
├── .env
├── go-backup/             # Backend Go
│   ├── cmd/
│   ├── internal/
│   ├── go.mod
│   └── go.sum
├── frontend/              # Frontend React/Vite
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backups/               # Thư mục chứa các bản sao lưu
└── data/                  # Dữ liệu ứng dụng
```

## Cách hoạt động

- Backend Go phục vụ cả API và frontend trên cùng một cổng (8080 mặc định)
- Frontend React được build thành tĩnh và được phục vụ bởi backend Go
- Backup được lưu trong thư mục `./backups` và cũng được đồng bộ lên Google Drive

## Lưu ý

- Đảm bảo thông tin xác thực Google Drive chính xác trong file .env
- Backend sẽ tự động sử dụng PostgreSQL bên ngoài (cần cung cấp thông tin trong config) 