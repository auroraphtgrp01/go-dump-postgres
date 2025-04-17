# Backup Cronjob React

Ứng dụng quản lý backup, tự động tạo backup và upload lên Google Drive. Được phát triển bằng React, Vite, Tailwind CSS và Ant Design.

## Tính năng

- Tạo bản sao lưu dữ liệu cơ sở dữ liệu
- Upload bản sao lưu lên Google Drive
- Quản lý danh sách bản sao lưu
- Lập lịch tự động tạo bản sao lưu
- Xác thực và quản lý người dùng

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Ant Design 5
- React Router 6

## Cài đặt

1. Clone repository
```bash
git clone <repository-url>
cd backup-cronjob-react
```

2. Cài đặt dependencies
```bash
npm install
```

3. Khởi chạy ứng dụng ở chế độ development
```bash
npm run dev
```

4. Build ứng dụng cho production
```bash
npm run build
```

## Cấu trúc dự án

```
backup-cronjob-react/
├── public/                  # Static files
├── src/                     # Source code
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Main App component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── README.md                # Project documentation
```

## API Endpoints

Các API endpoint được dùng trong ứng dụng:

- `/api/backups` - GET: Lấy danh sách backup
- `/dump` - POST: Tạo backup mới
- `/upload/{id}` - POST: Upload một backup lên Google Drive
- `/upload-last` - POST: Upload backup mới nhất
- `/upload-all` - POST: Upload tất cả backup
- `/download/{id}` - GET: Tải về một file backup
- `/login` - POST: Đăng nhập
- `/logout` - POST: Đăng xuất
- `/me` - GET: Lấy thông tin người dùng hiện tại
- `/configs` - GET/POST: Lấy/cập nhật cấu hình
- `/auth/google/login` - GET: Xác thực với Google

## Cấu hình

Ứng dụng sử dụng proxy API để chuyển tiếp các request từ frontend đến backend. Cấu hình này có thể được tìm thấy trong `vite.config.ts`.

## Tác giả

Dự án được phát triển bởi [Tên tác giả].
