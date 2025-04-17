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

	// Đảm bảo BackupDir có dấu / cuối cùng
	if !strings.HasSuffix(cfg.BackupDir, "/") {
		cfg.BackupDir = cfg.BackupDir + "/"
	}

	// Đảm bảo thư mục backup tồn tại
	err = os.MkdirAll(cfg.BackupDir, 0755)
	if err != nil {
		return nil, fmt.Errorf("không thể tạo thư mục backup: %v", err)
	}

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
		"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_FOLDER",
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
		case "GOOGLE_FOLDER":
			cfg.FolderDrive = value
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
		case "GOOGLE_FOLDER":
			cfg.FolderDrive = value
		case "BACKUP_DIR":
			// Đảm bảo BackupDir có dấu / cuối cùng
			if !strings.HasSuffix(value, "/") {
				value = value + "/"
			}
			cfg.BackupDir = value
			// Đảm bảo thư mục backup tồn tại
			err := os.MkdirAll(cfg.BackupDir, 0755)
			if err != nil {
				log.Printf("Warning: không thể tạo thư mục backup: %v", err)
			}
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
