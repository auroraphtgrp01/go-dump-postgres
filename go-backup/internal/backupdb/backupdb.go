package backupdb

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/models"
)

// BackupRecord đại diện cho thông tin về một file backup
type BackupRecord struct {
	ID         int64
	Filename   string
	Filepath   string
	Filesize   int64
	CreatedAt  time.Time
	Uploaded   bool
	UploadedAt sql.NullTime
}

// ToBackupFile chuyển đổi BackupRecord thành BackupFile để sử dụng trong models
func (br *BackupRecord) ToBackupFile() *models.BackupFile {
	return &models.BackupFile{
		ID:        fmt.Sprintf("%d", br.ID),
		Name:      br.Filename,
		Path:      br.Filepath,
		Size:      br.Filesize,
		CreatedAt: br.CreatedAt,
		Uploaded:  br.Uploaded,
	}
}

// AddBackup thêm thông tin backup mới vào database
func AddBackup(filename, filepath string, filesize int64, createdAt time.Time) (int64, error) {
	// Kiểm tra xem file đã tồn tại trong database chưa
	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM backups WHERE filepath = ?", filepath).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("lỗi khi kiểm tra file backup: %w", err)
	}

	// Nếu file đã tồn tại, return id của nó
	if count > 0 {
		var id int64
		err := database.DB.QueryRow("SELECT id FROM backups WHERE filepath = ?", filepath).Scan(&id)
		if err != nil {
			return 0, fmt.Errorf("lỗi khi lấy id file backup: %w", err)
		}
		return id, nil
	}

	// Thêm thông tin backup vào database
	result, err := database.DB.Exec(
		"INSERT INTO backups (filename, filepath, filesize, created_at, uploaded) VALUES (?, ?, ?, ?, ?)",
		filename, filepath, filesize, createdAt, false,
	)
	if err != nil {
		return 0, fmt.Errorf("lỗi khi thêm thông tin backup: %w", err)
	}

	// Lấy ID của bản ghi vừa thêm
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("lỗi khi lấy ID của backup: %w", err)
	}

	return id, nil
}

// GetAllBackups lấy danh sách backup từ database
func GetAllBackups() ([]*models.BackupFile, error) {
	rows, err := database.DB.Query(`
		SELECT id, filename, filepath, filesize, created_at, uploaded, uploaded_at
		FROM backups
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách backup: %w", err)
	}
	defer rows.Close()

	var backups []*models.BackupFile
	for rows.Next() {
		var id int64
		var filename, filepath string
		var filesize int64
		var createdAt string
		var uploaded bool
		var uploadedAt sql.NullString

		err := rows.Scan(&id, &filename, &filepath, &filesize, &createdAt, &uploaded, &uploadedAt)
		if err != nil {
			return nil, fmt.Errorf("lỗi khi đọc dữ liệu backup: %w", err)
		}

		// Chuyển đổi thời gian
		t, err := time.Parse("2006-01-02 15:04:05", createdAt)
		if err != nil {
			// Nếu không parse được thời gian, dùng thời gian hiện tại
			t = time.Now()
			fmt.Printf("Không thể parse thời gian '%s' cho file %s: %v\n", createdAt, filename, err)
		}

		// Kiểm tra nếu file tồn tại trên hệ thống
		fileExists := true
		if _, err := os.Stat(filepath); os.IsNotExist(err) {
			fileExists = false
		}

		backup := &models.BackupFile{
			ID:         fmt.Sprintf("%d", id),
			Name:       filename,
			Path:       filepath,
			Size:       filesize,
			CreatedAt:  t,
			Uploaded:   uploaded,
			FileExists: fileExists,
		}

		// Thêm thông tin thời gian upload nếu có
		if uploaded && uploadedAt.Valid {
			uploadTime, err := time.Parse("2006-01-02 15:04:05", uploadedAt.String)
			if err == nil {
				backup.UploadedAt = &uploadTime
			}
		}

		backups = append(backups, backup)
	}

	// Ghi log số lượng backup đã tìm thấy
	fmt.Printf("Đã tìm thấy %d file backup trong database\n", len(backups))
	return backups, nil
}

// GetAllBackupsFromFolder đọc tất cả các file backup từ thư mục
func GetAllBackupsFromFolder(backupDir string) ([]*models.BackupFile, error) {
	var backups []*models.BackupFile

	// Hàm này cần triển khai lại tương tự như hàm cũ
	// TODO: Triển khai đọc backup từ folder

	return backups, nil
}

// FindLatestBackup tìm file backup mới nhất
func FindLatestBackup() (*models.BackupFile, error) {
	backups, err := GetAllBackups()
	if err != nil {
		return nil, err
	}

	if len(backups) == 0 {
		return nil, fmt.Errorf("không tìm thấy file backup nào")
	}

	// Do đã sắp xếp giảm dần theo thời gian, file đầu tiên là mới nhất
	return backups[0], nil
}

// UpdateBackupUploadStatus cập nhật trạng thái upload của file backup
func UpdateBackupUploadStatus(id int64, uploaded bool) error {
	var uploadedAt interface{}
	if uploaded {
		uploadedAt = time.Now()
	} else {
		uploadedAt = nil
	}

	_, err := database.DB.Exec(
		"UPDATE backups SET uploaded = ?, uploaded_at = ? WHERE id = ?",
		uploaded, uploadedAt, id,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật trạng thái upload: %w", err)
	}

	return nil
}
