package models

import (
	"fmt"
	"time"
)

// BackupFile đại diện cho một file backup
type BackupFile struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Path       string     `json:"path,omitempty"`
	Size       int64      `json:"size"`
	CreatedAt  time.Time  `json:"createdAt"`
	Uploaded   bool       `json:"uploaded"`
	FileExists bool       `json:"fileExists,omitempty"`
	UploadedAt *time.Time `json:"uploadedAt,omitempty"`
}

// FormatSize trả về kích thước file đã được format
func (b *BackupFile) FormatSize() string {
	const (
		KB = 1024
		MB = 1024 * KB
		GB = 1024 * MB
	)

	size := float64(b.Size)

	switch {
	case b.Size >= GB:
		return fmt.Sprintf("%.2f GB", size/GB)
	case b.Size >= MB:
		return fmt.Sprintf("%.2f MB", size/MB)
	case b.Size >= KB:
		return fmt.Sprintf("%.2f KB", size/KB)
	default:
		return fmt.Sprintf("%d B", b.Size)
	}
}

// FormatCreatedAt định dạng thời gian tạo
func (b *BackupFile) FormatCreatedAt() string {
	return b.CreatedAt.Format("02/01/2006 15:04:05")
}
