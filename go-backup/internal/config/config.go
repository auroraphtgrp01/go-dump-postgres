package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config chứa thông tin cấu hình ứng dụng
type Config struct {
	DBDriver            string
	DBSource            string
	DBUsername          string
	DBPassword          string
	DBHost              string
	DBPort              string
	DBName              string
	WebAppPort          string
	ServerAddress       string
	TokenSymmetricKey   string
	AccessTokenDuration time.Duration
	JWTSecret           string
	AdminUsername       string
	AdminPassword       string
	BackupDir           string
	GoogleClientID      string
	GoogleClientSecret  string
	TokenDir            string
	FolderDrive         string
}

// ConfigLoader định nghĩa interface để nạp cấu hình từ database
type ConfigLoader func(key string) (string, error)

// ConfigSaver định nghĩa interface để lưu cấu hình vào database
type ConfigSaver func(key, value string) error

// InitConfig khởi tạo cấu hình ứng dụng
func InitConfig() (cfg *Config, err error) {
	// Load .env
	err = godotenv.Load()
	if err != nil {
		log.Printf("Warning: .env file không tồn tại: %v", err)
	}

	// Khởi tạo config với giá trị mặc định
	cfg = &Config{
		DBDriver:            "sqlite3",
		DBSource:            "./data/app.db",
		WebAppPort:          "8080",
		ServerAddress:       "0.0.0.0:8080",
		TokenSymmetricKey:   "12345678901234567890123456789012",
		AccessTokenDuration: time.Hour * 24,
		JWTSecret:           "jwt-secret-key",
		AdminUsername:       getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:       getEnv("ADMIN_PASSWORD", "admin123"),
		BackupDir:           getEnv("BACKUP_DIR", "./backup/"),
		GoogleClientID:      getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:  getEnv("GOOGLE_CLIENT_SECRET", ""),
		TokenDir:            getEnv("TOKEN_DIR", "./data/token/"),
		FolderDrive:         getEnv("GOOGLE_FOLDER", "Backups"),
	}

	// Chỉ chuyển đổi đường dẫn tuyệt đối nếu không bắt đầu bằng ./
	if !strings.HasPrefix(cfg.BackupDir, "./") && !filepath.IsAbs(cfg.BackupDir) {
		absBackupDir, err := filepath.Abs(cfg.BackupDir)
		if err != nil {
			log.Printf("Warning: Không thể chuyển đổi đường dẫn backup thành đường dẫn tuyệt đối: %v, giữ nguyên đường dẫn tương đối", err)
		} else {
			cfg.BackupDir = absBackupDir
			log.Printf("Đã chuyển đổi đường dẫn backup thành đường dẫn tuyệt đối: %s", cfg.BackupDir)
		}
	} else {
		log.Printf("Giữ nguyên đường dẫn backup: %s", cfg.BackupDir)
	}

	// Đảm bảo BackupDir có dấu separator cuối cùng
	if !strings.HasSuffix(cfg.BackupDir, string(filepath.Separator)) {
		cfg.BackupDir = cfg.BackupDir + string(filepath.Separator)
	}

	// Đảm bảo thư mục backup tồn tại
	backupDirClean := filepath.Clean(cfg.BackupDir)
	log.Printf("Đang tạo thư mục backup tại: %s", backupDirClean)
	err = os.MkdirAll(backupDirClean, 0755)
	if err != nil {
		return nil, fmt.Errorf("không thể tạo thư mục backup: %v", err)
	}

	// Kiểm tra xem thư mục đã được tạo thành công
	if _, err := os.Stat(backupDirClean); os.IsNotExist(err) {
		return nil, fmt.Errorf("không thể xác minh thư mục backup đã tạo: %v", err)
	}

	log.Printf("Đã tạo thư mục backup thành công: %s", backupDirClean)

	// Đảm bảo thư mục data tồn tại
	dataDir := filepath.Dir(cfg.DBSource)
	err = os.MkdirAll(dataDir, 0755)
	if err != nil {
		return nil, fmt.Errorf("không thể tạo thư mục data: %v", err)
	}

	// Đảm bảo thư mục token tồn tại
	err = os.MkdirAll(cfg.TokenDir, 0755)
	if err != nil {
		return nil, fmt.Errorf("không thể tạo thư mục token: %v", err)
	}

	// Log thông tin cấu hình
	log.Printf("Cấu hình ứng dụng: AdminUsername=%s, BackupDir=%s",
		cfg.AdminUsername, cfg.BackupDir)

	return cfg, nil
}

// getEnv lấy giá trị từ biến môi trường, nếu không có thì dùng giá trị mặc định
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// LoadConfigFromDB nạp cấu hình từ database
func (cfg *Config) LoadConfigFromDB(getConfigFn ConfigLoader) error {
	// Duyệt qua các key cần thiết
	keys := []string{
		"ADMIN_USERNAME", "ADMIN_PASSWORD", "JWT_SECRET",
		"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "FOLDER_DRIVE",
		"DB_USER", "DB_PASSWORD", "CONTAINER_NAME", "DB_NAME",
		"BACKUP_DIR", "BACKUP_RETENTION_DAYS", "CRON_SCHEDULE",
	}

	// Nạp từng giá trị
	for _, key := range keys {
		value, err := getConfigFn(key)
		if err != nil || value == "" {
			log.Printf("Không thể nạp cấu hình '%s' từ database, sử dụng giá trị mặc định", key)
			continue
		}

		// Cập nhật cấu hình tương ứng
		switch key {
		case "ADMIN_USERNAME":
			log.Printf("Nạp ADMIN_USERNAME từ database: %s", value)
			cfg.AdminUsername = value
		case "ADMIN_PASSWORD":
			log.Printf("Nạp ADMIN_PASSWORD từ database")
			cfg.AdminPassword = value
		case "JWT_SECRET":
			cfg.JWTSecret = value
		case "GOOGLE_CLIENT_ID":
			cfg.GoogleClientID = value
		case "GOOGLE_CLIENT_SECRET":
			cfg.GoogleClientSecret = value
		case "FOLDER_DRIVE":
			cfg.FolderDrive = value
		case "BACKUP_DIR":
			// Đảm bảo đường dẫn hợp lệ cho hệ điều hành hiện tại
			// Chỉ chuyển đổi sang tuyệt đối nếu không bắt đầu bằng ./
			if !strings.HasPrefix(value, "./") && !filepath.IsAbs(value) {
				absValue, absErr := filepath.Abs(value)
				if absErr != nil {
					log.Printf("Warning: Không thể chuyển đổi đường dẫn backup thành đường dẫn tuyệt đối: %v, giữ nguyên đường dẫn gốc", absErr)
				} else {
					value = absValue
					log.Printf("Đã chuyển đổi đường dẫn backup thành đường dẫn tuyệt đối: %s", value)
				}
			} else {
				log.Printf("Giữ nguyên đường dẫn backup: %s", value)
			}

			// Thêm dấu phân cách ở cuối
			oldDir := cfg.BackupDir
			if !strings.HasSuffix(value, string(filepath.Separator)) {
				value = value + string(filepath.Separator)
			}
			cfg.BackupDir = value

			log.Printf("Thay đổi BACKUP_DIR từ '%s' thành '%s'", oldDir, value)

			// Đảm bảo thư mục backup tồn tại
			cleanPath := filepath.Clean(value)
			log.Printf("Đang tạo thư mục backup tại: %s", cleanPath)
			err := os.MkdirAll(cleanPath, 0755)
			if err != nil {
				log.Printf("Warning: không thể tạo thư mục backup: %v", err)
			} else {
				// Kiểm tra lại xem thư mục đã được tạo chưa
				if _, statErr := os.Stat(cleanPath); statErr != nil && os.IsNotExist(statErr) {
					log.Printf("Warning: thư mục được báo là đã tạo nhưng không tồn tại: %s", cleanPath)
				} else {
					log.Printf("Đã tạo thư mục backup thành công: %s", cleanPath)
				}
			}
		case "DB_USER":
			cfg.DBUsername = value
		case "DB_PASSWORD":
			cfg.DBPassword = value
		case "DB_NAME":
			cfg.DBName = value
		case "CONTAINER_NAME":
			log.Printf("Nạp CONTAINER_NAME từ database: %s", value)
		}
	}

	return nil
}

// SetConfigToDB lưu giá trị cấu hình vào database
func (cfg *Config) SetConfigToDB(setConfigFn ConfigSaver) error {
	// Tạo map chứa cấu hình cần lưu
	configs := map[string]string{
		"ADMIN_USERNAME":       cfg.AdminUsername,
		"ADMIN_PASSWORD":       cfg.AdminPassword,
		"JWT_SECRET":           cfg.JWTSecret,
		"GOOGLE_CLIENT_ID":     cfg.GoogleClientID,
		"GOOGLE_CLIENT_SECRET": cfg.GoogleClientSecret,
		"GOOGLE_FOLDER":        cfg.FolderDrive,
	}

	// Lưu từng giá trị vào database
	for key, value := range configs {
		err := setConfigFn(key, value)
		if err != nil {
			return fmt.Errorf("không thể lưu cấu hình '%s': %v", key, err)
		}
	}

	return nil
}

// UpdateConfig cập nhật cấu hình từ map các giá trị mới
func (cfg *Config) UpdateConfig(newValues map[string]string) {
	for key, value := range newValues {
		switch key {
		case "ADMIN_USERNAME":
			cfg.AdminUsername = value
		case "ADMIN_PASSWORD":
			cfg.AdminPassword = value
		case "JWT_SECRET":
			cfg.JWTSecret = value
		case "GOOGLE_CLIENT_ID":
			cfg.GoogleClientID = value
		case "GOOGLE_CLIENT_SECRET":
			cfg.GoogleClientSecret = value
		case "FOLDER_DRIVE":
			cfg.FolderDrive = value
		case "BACKUP_DIR":
			// Đảm bảo đường dẫn hợp lệ cho hệ điều hành hiện tại
			// Chỉ chuyển đổi sang tuyệt đối nếu không bắt đầu bằng ./
			if !strings.HasPrefix(value, "./") && !filepath.IsAbs(value) {
				absValue, absErr := filepath.Abs(value)
				if absErr != nil {
					log.Printf("Warning: Không thể chuyển đổi đường dẫn backup thành đường dẫn tuyệt đối: %v, giữ nguyên đường dẫn gốc", absErr)
				} else {
					value = absValue
					log.Printf("Đã chuyển đổi đường dẫn backup thành đường dẫn tuyệt đối: %s", value)
				}
			} else {
				log.Printf("Giữ nguyên đường dẫn backup: %s", value)
			}

			// Thêm dấu phân cách ở cuối
			oldDir := cfg.BackupDir
			if !strings.HasSuffix(value, string(filepath.Separator)) {
				value = value + string(filepath.Separator)
			}
			cfg.BackupDir = value

			log.Printf("Thay đổi BACKUP_DIR từ '%s' thành '%s'", oldDir, value)

			// Đảm bảo thư mục backup tồn tại
			cleanPath := filepath.Clean(value)
			log.Printf("Đang tạo thư mục backup tại: %s", cleanPath)
			mkdirErr := os.MkdirAll(cleanPath, 0755)
			if mkdirErr != nil {
				log.Printf("Warning: không thể tạo thư mục backup: %v", mkdirErr)
			} else {
				// Kiểm tra lại xem thư mục đã được tạo chưa
				if _, statErr := os.Stat(cleanPath); statErr != nil && os.IsNotExist(statErr) {
					log.Printf("Warning: thư mục được báo là đã tạo nhưng không tồn tại: %s", cleanPath)
				} else {
					log.Printf("Đã tạo thư mục backup thành công: %s", cleanPath)
				}
			}
		case "DB_USER":
			cfg.DBUsername = value
		case "DB_PASSWORD":
			cfg.DBPassword = value
		case "DB_NAME":
			cfg.DBName = value
		case "CONTAINER_NAME":
			log.Printf("Cập nhật CONTAINER_NAME: %s", value)
		case "CRON_SCHEDULE":
			log.Printf("Cập nhật CRON_SCHEDULE: %s", value)
		}
	}
}

// GetInt lấy giá trị int từ môi trường
func GetInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if value, err := strconv.Atoi(valStr); err == nil {
		return value
	}
	return defaultVal
}
