package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/models"
	_ "modernc.org/sqlite"
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

// DB là đối tượng database chung cho ứng dụng
var DB *sql.DB

// InitDB khởi tạo kết nối database
func InitDB(cfg *config.Config) error {
	var err error

	// Kết nối đến database SQLite
	DB, err = sql.Open("sqlite", cfg.DBSource)
	if err != nil {
		return fmt.Errorf("error connecting to SQLite database: %w", err)
	}

	// Kiểm tra kết nối
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("error pinging SQLite database: %w", err)
	}

	// Tạo schema
	if err = createSchema(); err != nil {
		return fmt.Errorf("error creating database schema: %w", err)
	}

	// Kiểm tra và tạo tài khoản admin nếu chưa tồn tại
	if err = ensureAdminExists(cfg); err != nil {
		return fmt.Errorf("error ensuring admin user exists: %w", err)
	}

	// Kiểm tra và tạo cấu hình mặc định nếu chưa tồn tại
	if err = ensureConfigsExist(); err != nil {
		return fmt.Errorf("error ensuring default configs exist: %w", err)
	}

	// Đảm bảo có ít nhất một profile mặc định
	if err = EnsureDefaultProfile(); err != nil {
		return fmt.Errorf("error ensuring default profile: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

// createSchema tạo cấu trúc cơ sở dữ liệu nếu chưa tồn tại
func createSchema() error {
	// Tạo bảng users
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)
	`)
	if err != nil {
		return err
	}

	// Tạo bảng configs
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS configs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			key TEXT NOT NULL UNIQUE,
			value TEXT NOT NULL,
			group_name TEXT NOT NULL,
			label TEXT NOT NULL,
			type TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)
	`)
	if err != nil {
		return err
	}

	// Tạo bảng backups
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS backups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			filename TEXT NOT NULL,
			filepath TEXT NOT NULL UNIQUE,
			filesize INTEGER NOT NULL,
			created_at DATETIME NOT NULL,
			uploaded BOOLEAN DEFAULT 0,
			uploaded_at DATETIME,
			drive_link TEXT
		)
	`)
	if err != nil {
		return err
	}

	// Tạo bảng profiles
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			description TEXT,
			db_user TEXT NOT NULL,
			db_password TEXT NOT NULL,
			container_name TEXT NOT NULL,
			db_name TEXT NOT NULL,
			is_active BOOLEAN DEFAULT 1,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)
	`)

	return err
}

// ensureAdminExists đảm bảo tài khoản admin tồn tại trong hệ thống
func ensureAdminExists(cfg *config.Config) error {
	// Kiểm tra xem admin đã tồn tại chưa
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", cfg.AdminUsername).Scan(&count)
	if err != nil {
		return err
	}

	// Nếu admin chưa tồn tại, tạo mới
	if count == 0 {
		// Hash mật khẩu
		hashedPassword, err := models.HashPassword(cfg.AdminPassword)
		if err != nil {
			return err
		}

		// Tạo admin
		now := time.Now()
		_, err = DB.Exec(
			"INSERT INTO users (username, password, created_at, updated_at) VALUES (?, ?, ?, ?)",
			cfg.AdminUsername, hashedPassword, now, now,
		)
		if err != nil {
			return err
		}

		log.Printf("Admin user '%s' created successfully", cfg.AdminUsername)
	}

	return nil
}

// ensureConfigsExist đảm bảo các cấu hình mặc định tồn tại trong database
func ensureConfigsExist() error {
	// Kiểm tra xem đã có cấu hình nào chưa
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM configs").Scan(&count)
	if err != nil {
		return err
	}

	// Nếu chưa có cấu hình nào, thêm cấu hình mặc định
	if count == 0 {
		defaultConfigs := models.DefaultConfigs()

		// Bắt đầu transaction
		tx, err := DB.Begin()
		if err != nil {
			return err
		}

		// Chuẩn bị câu lệnh SQL
		stmt, err := tx.Prepare(`
			INSERT INTO configs (key, value, group_name, label, type, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`)
		if err != nil {
			tx.Rollback()
			return err
		}
		defer stmt.Close()

		// Thêm từng cấu hình
		for _, cfg := range defaultConfigs {
			_, err = stmt.Exec(cfg.Key, cfg.Value, cfg.Group, cfg.Label, cfg.Type, cfg.CreatedAt, cfg.UpdatedAt)
			if err != nil {
				tx.Rollback()
				return err
			}
		}

		// Commit transaction
		if err := tx.Commit(); err != nil {
			return err
		}

		log.Println("Default configurations added successfully")
	}

	return nil
}

// GetAllConfigs lấy tất cả cấu hình từ database
func GetAllConfigs() ([]models.AppConfig, error) {
	rows, err := DB.Query(`
		SELECT id, key, value, group_name, label, type, created_at, updated_at
		FROM configs
		ORDER BY group_name, key
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	configs := []models.AppConfig{}
	for rows.Next() {
		var cfg models.AppConfig
		var groupName string
		err := rows.Scan(&cfg.ID, &cfg.Key, &cfg.Value, &groupName, &cfg.Label, &cfg.Type, &cfg.CreatedAt, &cfg.UpdatedAt)
		if err != nil {
			return nil, err
		}
		cfg.Group = groupName
		configs = append(configs, cfg)
	}

	return configs, nil
}

// GetConfigsByGroup lấy cấu hình theo nhóm
func GetConfigsByGroup(groupName string) ([]models.AppConfig, error) {
	rows, err := DB.Query(`
		SELECT id, key, value, group_name, label, type, created_at, updated_at
		FROM configs
		WHERE group_name = ?
		ORDER BY key
	`, groupName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	configs := []models.AppConfig{}
	for rows.Next() {
		var cfg models.AppConfig
		var groupName string
		err := rows.Scan(&cfg.ID, &cfg.Key, &cfg.Value, &groupName, &cfg.Label, &cfg.Type, &cfg.CreatedAt, &cfg.UpdatedAt)
		if err != nil {
			return nil, err
		}
		cfg.Group = groupName
		configs = append(configs, cfg)
	}

	return configs, nil
}

// GetConfigValue lấy giá trị của một cấu hình
func GetConfigValue(key string) (string, error) {
	var value string
	err := DB.QueryRow("SELECT value FROM configs WHERE key = ?", key).Scan(&value)
	return value, err
}

// UpdateConfig cập nhật giá trị của một cấu hình
func UpdateConfig(key, value string) error {
	now := time.Now()
	_, err := DB.Exec(
		"UPDATE configs SET value = ?, updated_at = ? WHERE key = ?",
		value, now, key,
	)
	return err
}

// SetConfigValue cập nhật giá trị của một cấu hình (alias cho UpdateConfig)
func SetConfigValue(key, value string) error {
	return UpdateConfig(key, value)
}

// UpdateConfigs cập nhật nhiều cấu hình cùng lúc
func UpdateConfigs(keyValues map[string]string) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}

	now := time.Now()
	stmt, err := tx.Prepare("UPDATE configs SET value = ?, updated_at = ? WHERE key = ?")
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	for key, value := range keyValues {
		_, err = stmt.Exec(value, now, key)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// GetUserByUsername lấy thông tin người dùng theo username
func GetUserByUsername(username string) (*models.User, error) {
	user := &models.User{}
	err := DB.QueryRow(
		"SELECT id, username, password, created_at, updated_at FROM users WHERE username = ?",
		username,
	).Scan(&user.ID, &user.Username, &user.Password, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return user, nil
}

// Close đóng kết nối đến database
func Close() {
	if DB != nil {
		DB.Close()
	}
}

// AddBackup thêm thông tin backup mới vào database
func AddBackup(filename, filepath string, filesize int64, createdAt time.Time) (int64, error) {
	// Kiểm tra xem file đã tồn tại trong database chưa
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM backups WHERE filepath = ?", filepath).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("lỗi khi kiểm tra file backup: %w", err)
	}

	// Nếu file đã tồn tại, return id của nó
	if count > 0 {
		var id int64
		err := DB.QueryRow("SELECT id FROM backups WHERE filepath = ?", filepath).Scan(&id)
		if err != nil {
			return 0, fmt.Errorf("lỗi khi lấy id file backup: %w", err)
		}
		return id, nil
	}

	// Thêm thông tin backup vào database
	result, err := DB.Exec(
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

// GetBackupsByFolder lấy danh sách backup từ database thay vì đọc từ thư mục
func GetBackupsByFolder() ([]*models.BackupFile, error) {
	rows, err := DB.Query(`
		SELECT id, filename, filepath, filesize, created_at, uploaded
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
		var backup models.BackupFile
		var createdAt string

		err := rows.Scan(&id, &backup.Name, &backup.Path, &backup.Size, &createdAt, &backup.Uploaded)
		if err != nil {
			return nil, fmt.Errorf("lỗi khi đọc dữ liệu backup: %w", err)
		}

		// Chuyển đổi id thành string
		backup.ID = fmt.Sprintf("%d", id)

		// Chuyển đổi thời gian
		t, err := time.Parse("2006-01-02 15:04:05", createdAt)
		if err != nil {
			// Thử parse với định dạng ISO 8601
			t, err = time.Parse(time.RFC3339, createdAt)
			if err != nil {
				// Nếu không parse được thời gian, dùng thời gian hiện tại
				backup.CreatedAt = time.Now()
				fmt.Printf("Không thể parse thời gian '%s' cho file %s: %v\n", createdAt, backup.Name, err)
			} else {
				backup.CreatedAt = t
			}
		} else {
			backup.CreatedAt = t
		}

		backups = append(backups, &backup)
	}

	return backups, nil
}

// UpdateBackupUploadStatus cập nhật trạng thái upload của file backup
func UpdateBackupUploadStatus(id int64, uploaded bool, driveLink string) error {
	var uploadedAt interface{}
	if uploaded {
		uploadedAt = time.Now()
	} else {
		uploadedAt = nil
	}

	_, err := DB.Exec(
		"UPDATE backups SET uploaded = ?, uploaded_at = ?, drive_link = ? WHERE id = ?",
		uploaded, uploadedAt, driveLink, id,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật trạng thái upload: %w", err)
	}

	return nil
}

// DeleteBackup xóa bản ghi backup từ database
func DeleteBackup(id int64) error {
	_, err := DB.Exec("DELETE FROM backups WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa bản ghi backup: %w", err)
	}

	return nil
}
