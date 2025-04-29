package models

import (
	"time"
)

// DatabaseProfile đại diện cho một profile cấu hình database
type DatabaseProfile struct {
	ID                 int64     `json:"id"`
	Name               string    `json:"name"`                 // Tên profile
	Description        string    `json:"description"`          // Mô tả
	DBUser             string    `json:"db_user"`              // Tên đăng nhập Database
	DBPassword         string    `json:"db_password"`          // Mật khẩu Database
	ContainerName      string    `json:"container_name"`       // Tên container Docker
	DBName             string    `json:"db_name"`              // Tên Database
	IsActive           bool      `json:"is_active"`            // Trạng thái hoạt động
	GoogleClientID     string    `json:"google_client_id"`     // Google Client ID
	GoogleClientSecret string    `json:"google_client_secret"` // Google Client Secret
	BackupDir          string    `json:"backup_dir"`           // Thư mục lưu backup
	CronSchedule       string    `json:"cron_schedule"`        // Lịch backup tự động
	BackupRetention    int       `json:"backup_retention"`     // Số ngày giữ file backup
	UploadToDrive      bool      `json:"upload_to_drive"`      // Tự động upload lên Google Drive
	FolderDrive        string    `json:"folder_drive"`         // Tên thư mục trên Google Drive
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// NewDatabaseProfile tạo một profile mới với các giá trị mặc định
func NewDatabaseProfile(name, description string) DatabaseProfile {
	now := time.Now()
	return DatabaseProfile{
		Name:            name,
		Description:     description,
		IsActive:        true,
		BackupRetention: 0,     // Mặc định không thiết lập
		CronSchedule:    "",    // Mặc định không thiết lập
		UploadToDrive:   false, // Mặc định không upload lên Drive
		FolderDrive:     "",    // Mặc định không thiết lập tên thư mục
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}
