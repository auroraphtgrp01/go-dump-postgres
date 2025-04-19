package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/backup-cronjob/internal/models"
)

// CreateProfileTable tạo bảng profiles nếu chưa tồn tại
func CreateProfileTable() error {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			description TEXT,
			db_user TEXT NOT NULL,
			db_password TEXT NOT NULL,
			container_name TEXT NOT NULL,
			db_name TEXT NOT NULL,
			is_active BOOLEAN DEFAULT 1,
			google_client_id TEXT,
			google_client_secret TEXT,
			backup_dir TEXT,
			cron_schedule TEXT DEFAULT '0 0 * * *',
			backup_retention INTEGER DEFAULT 7,
			upload_to_drive BOOLEAN DEFAULT 0,
			folder_drive TEXT,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)
	`)
	return err
}

// EnsureDefaultProfile đảm bảo có ít nhất một profile mặc định
func EnsureDefaultProfile() error {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM profiles").Scan(&count)
	if err != nil {
		return err
	}

	// Nếu chưa có profile nào, tạo profile mặc định từ cấu hình hiện tại
	if count == 0 {
		// Lấy thông tin cấu hình database hiện tại
		dbUser, _ := GetConfigValue("DB_USER")
		dbPassword, _ := GetConfigValue("DB_PASSWORD")
		containerName, _ := GetConfigValue("CONTAINER_NAME")
		dbName, _ := GetConfigValue("DB_NAME")
		googleClientID, _ := GetConfigValue("GOOGLE_CLIENT_ID")
		googleClientSecret, _ := GetConfigValue("GOOGLE_CLIENT_SECRET")
		backupDir, _ := GetConfigValue("BACKUP_DIR")
		folderDrive, _ := GetConfigValue("GOOGLE_FOLDER")
		cronSchedule, _ := GetConfigValue("CRON_SCHEDULE")
		backupRetentionStr, _ := GetConfigValue("BACKUP_RETENTION_DAYS")

		backupRetention := 0
		if backupRetentionStr != "" {
			var err error
			backupRetention, err = parseInt(backupRetentionStr, 0)
			if err != nil {
				log.Printf("Không thể chuyển đổi BACKUP_RETENTION_DAYS thành số: %v", err)
			}
		}

		// Tạo profile mặc định
		now := time.Now()
		_, err = DB.Exec(
			`INSERT INTO profiles (
				name, description, db_user, db_password, container_name, db_name, 
				is_active, google_client_id, google_client_secret, backup_dir, 
				cron_schedule, backup_retention, upload_to_drive, folder_drive, 
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			"Default", "Profile mặc định",
			dbUser, dbPassword, containerName, dbName,
			true, googleClientID, googleClientSecret, backupDir,
			cronSchedule, backupRetention, false, folderDrive,
			now, now,
		)
		if err != nil {
			return err
		}

		log.Println("Đã tạo profile database mặc định")
	}

	return nil
}

// GetAllProfiles lấy tất cả các profile
func GetAllProfiles() ([]models.DatabaseProfile, error) {
	rows, err := DB.Query(`
		SELECT id, name, description, db_user, db_password, container_name, db_name, 
			is_active, google_client_id, google_client_secret, backup_dir, 
			cron_schedule, backup_retention, upload_to_drive, folder_drive, 
			created_at, updated_at
		FROM profiles
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	profiles := []models.DatabaseProfile{}
	for rows.Next() {
		var profile models.DatabaseProfile
		err := rows.Scan(
			&profile.ID, &profile.Name, &profile.Description,
			&profile.DBUser, &profile.DBPassword, &profile.ContainerName, &profile.DBName,
			&profile.IsActive, &profile.GoogleClientID, &profile.GoogleClientSecret, &profile.BackupDir,
			&profile.CronSchedule, &profile.BackupRetention, &profile.UploadToDrive, &profile.FolderDrive,
			&profile.CreatedAt, &profile.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		profiles = append(profiles, profile)
	}

	return profiles, nil
}

// GetProfile lấy thông tin của một profile theo ID
func GetProfile(id int64) (models.DatabaseProfile, error) {
	var profile models.DatabaseProfile
	err := DB.QueryRow(`
		SELECT id, name, description, db_user, db_password, container_name, db_name, 
			is_active, google_client_id, google_client_secret, backup_dir, 
			cron_schedule, backup_retention, upload_to_drive, folder_drive, 
			created_at, updated_at
		FROM profiles
		WHERE id = ?
	`, id).Scan(
		&profile.ID, &profile.Name, &profile.Description,
		&profile.DBUser, &profile.DBPassword, &profile.ContainerName, &profile.DBName,
		&profile.IsActive, &profile.GoogleClientID, &profile.GoogleClientSecret, &profile.BackupDir,
		&profile.CronSchedule, &profile.BackupRetention, &profile.UploadToDrive, &profile.FolderDrive,
		&profile.CreatedAt, &profile.UpdatedAt,
	)
	return profile, err
}

// GetProfileByID lấy thông tin profile theo ID
func GetProfileByID(id int64) (*models.DatabaseProfile, error) {
	var profile models.DatabaseProfile
	err := DB.QueryRow(`
		SELECT id, name, description, db_user, db_password, container_name, db_name, 
			is_active, google_client_id, google_client_secret, backup_dir, 
			cron_schedule, backup_retention, upload_to_drive, folder_drive, 
			created_at, updated_at
		FROM profiles
		WHERE id = ?
	`, id).Scan(
		&profile.ID, &profile.Name, &profile.Description,
		&profile.DBUser, &profile.DBPassword, &profile.ContainerName, &profile.DBName,
		&profile.IsActive, &profile.GoogleClientID, &profile.GoogleClientSecret, &profile.BackupDir,
		&profile.CronSchedule, &profile.BackupRetention, &profile.UploadToDrive, &profile.FolderDrive,
		&profile.CreatedAt, &profile.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("không tìm thấy profile với ID %d", id)
		}
		return nil, err
	}

	return &profile, nil
}

// CreateProfile tạo một profile mới
func CreateProfile(profile models.DatabaseProfile) (int64, error) {
	now := time.Now()
	profile.CreatedAt = now
	profile.UpdatedAt = now

	result, err := DB.Exec(
		`INSERT INTO profiles (
			name, description, db_user, db_password, container_name, db_name, 
			is_active, google_client_id, google_client_secret, backup_dir, 
			cron_schedule, backup_retention, upload_to_drive, folder_drive, 
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		profile.Name, profile.Description, profile.DBUser, profile.DBPassword,
		profile.ContainerName, profile.DBName, profile.IsActive,
		profile.GoogleClientID, profile.GoogleClientSecret, profile.BackupDir,
		profile.CronSchedule, profile.BackupRetention, profile.UploadToDrive, profile.FolderDrive,
		profile.CreatedAt, profile.UpdatedAt,
	)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	return id, err
}

// UpdateProfile cập nhật thông tin của một profile
func UpdateProfile(profile models.DatabaseProfile) error {
	profile.UpdatedAt = time.Now()

	_, err := DB.Exec(
		`UPDATE profiles SET 
			name = ?, description = ?, db_user = ?, db_password = ?, 
			container_name = ?, db_name = ?, is_active = ?, 
			google_client_id = ?, google_client_secret = ?, backup_dir = ?, 
			cron_schedule = ?, backup_retention = ?, upload_to_drive = ?, folder_drive = ?, 
			updated_at = ? 
		WHERE id = ?`,
		profile.Name, profile.Description, profile.DBUser, profile.DBPassword,
		profile.ContainerName, profile.DBName, profile.IsActive,
		profile.GoogleClientID, profile.GoogleClientSecret, profile.BackupDir,
		profile.CronSchedule, profile.BackupRetention, profile.UploadToDrive, profile.FolderDrive,
		profile.UpdatedAt, profile.ID,
	)
	return err
}

// DeleteProfile xóa một profile
func DeleteProfile(id int64) error {
	_, err := DB.Exec("DELETE FROM profiles WHERE id = ?", id)
	return err
}

// GetActiveProfile lấy profile đang được kích hoạt
func GetActiveProfile() (models.DatabaseProfile, error) {
	var profile models.DatabaseProfile
	err := DB.QueryRow(`
		SELECT id, name, description, db_user, db_password, container_name, db_name, 
			is_active, google_client_id, google_client_secret, backup_dir, 
			cron_schedule, backup_retention, upload_to_drive, folder_drive, 
			created_at, updated_at
		FROM profiles
		WHERE is_active = 1
		LIMIT 1
	`).Scan(
		&profile.ID, &profile.Name, &profile.Description,
		&profile.DBUser, &profile.DBPassword, &profile.ContainerName, &profile.DBName,
		&profile.IsActive, &profile.GoogleClientID, &profile.GoogleClientSecret, &profile.BackupDir,
		&profile.CronSchedule, &profile.BackupRetention, &profile.UploadToDrive, &profile.FolderDrive,
		&profile.CreatedAt, &profile.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return profile, fmt.Errorf("không tìm thấy profile nào đang hoạt động")
	}
	return profile, err
}

// SetActiveProfile đặt một profile làm hoạt động và vô hiệu hóa các profile khác
func SetActiveProfile(id int64) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}

	// Vô hiệu hóa tất cả profile
	_, err = tx.Exec("UPDATE profiles SET is_active = 0")
	if err != nil {
		tx.Rollback()
		return err
	}

	// Kích hoạt profile được chọn
	_, err = tx.Exec("UPDATE profiles SET is_active = 1 WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// Hàm tiện ích để chuyển đổi string sang int với giá trị mặc định
func parseInt(s string, defaultValue int) (int, error) {
	if s == "" {
		return defaultValue, nil
	}
	var value int
	_, err := fmt.Sscanf(s, "%d", &value)
	if err != nil {
		return defaultValue, err
	}
	return value, nil
}
