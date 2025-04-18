package models

import (
	"time"
)

// DatabaseProfile đại diện cho một profile cấu hình database
type DatabaseProfile struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`           // Tên profile
	Description   string    `json:"description"`    // Mô tả
	DBUser        string    `json:"db_user"`        // Tên đăng nhập Database
	DBPassword    string    `json:"db_password"`    // Mật khẩu Database
	ContainerName string    `json:"container_name"` // Tên container Docker
	DBName        string    `json:"db_name"`        // Tên Database
	IsActive      bool      `json:"is_active"`      // Trạng thái hoạt động
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// NewDatabaseProfile tạo một profile mới với các giá trị mặc định
func NewDatabaseProfile(name, description string) DatabaseProfile {
	now := time.Now()
	return DatabaseProfile{
		Name:        name,
		Description: description,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}
