package models

import (
	"time"
)

// AppConfig đại diện cho cấu hình ứng dụng được lưu trong database
type AppConfig struct {
	ID        int64     `json:"id"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	Group     string    `json:"group"` // Nhóm cấu hình (database, google, backup, system)
	Label     string    `json:"label"` // Nhãn hiển thị trên UI
	Type      string    `json:"type"`  // Loại dữ liệu (text, password, select, etc)
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DefaultConfigs trả về danh sách các cấu hình mặc định
func DefaultConfigs() []AppConfig {
	now := time.Now()
	return []AppConfig{
		// Nhóm Database
		{Key: "DB_USER", Value: "root", Group: "database", Label: "Tên đăng nhập Database", Type: "text", CreatedAt: now, UpdatedAt: now},
		{Key: "DB_PASSWORD", Value: "", Group: "database", Label: "Mật khẩu Database", Type: "password", CreatedAt: now, UpdatedAt: now},
		{Key: "CONTAINER_NAME", Value: "mysql", Group: "database", Label: "Tên container Docker", Type: "text", CreatedAt: now, UpdatedAt: now},
		{Key: "DB_NAME", Value: "wordpress", Group: "database", Label: "Tên Database", Type: "text", CreatedAt: now, UpdatedAt: now},

		// Nhóm Google Drive
		{Key: "GOOGLE_CLIENT_ID", Value: "", Group: "google", Label: "Google Client ID", Type: "text", CreatedAt: now, UpdatedAt: now},
		{Key: "GOOGLE_CLIENT_SECRET", Value: "", Group: "google", Label: "Google Client Secret", Type: "password", CreatedAt: now, UpdatedAt: now},
		{Key: "FOLDER_DRIVE", Value: "", Group: "google", Label: "ID thư mục trên Google Drive", Type: "text", CreatedAt: now, UpdatedAt: now},

		// Nhóm Backup
		{Key: "CRON_SCHEDULE", Value: "0 0 * * *", Group: "backup", Label: "Lịch backup tự động (Cron format)", Type: "text", CreatedAt: now, UpdatedAt: now},

		// Nhóm Hệ thống
		{Key: "ADMIN_USERNAME", Value: "admin", Group: "system", Label: "Tên đăng nhập Admin", Type: "text", CreatedAt: now, UpdatedAt: now},
		{Key: "ADMIN_PASSWORD", Value: "admin123", Group: "system", Label: "Mật khẩu Admin", Type: "password", CreatedAt: now, UpdatedAt: now},
		{Key: "JWT_SECRET", Value: "your_secure_jwt_secret_key_change_this_in_production", Group: "system", Label: "JWT Secret Key", Type: "password", CreatedAt: now, UpdatedAt: now},
		{Key: "WEBAPP_PORT", Value: "8080", Group: "system", Label: "Port cho Web UI", Type: "text", CreatedAt: now, UpdatedAt: now},
	}
}

// ConfigGroups trả về danh sách các nhóm cấu hình
func ConfigGroups() []string {
	return []string{
		"database", // Cấu hình kết nối database
		"google",   // Cấu hình Google Drive API
		"backup",   // Cấu hình backup
		"system",   // Cấu hình hệ thống
	}
}

// ConfigGroupLabels trả về tên hiển thị của các nhóm
func ConfigGroupLabels() map[string]string {
	return map[string]string{
		"database": "Cấu hình Database",
		"google":   "Cấu hình Google Drive",
		"backup":   "Cấu hình Backup",
		"system":   "Cấu hình Hệ thống",
	}
}
