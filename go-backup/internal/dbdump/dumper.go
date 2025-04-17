package dbdump

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/backup-cronjob/internal/backupdb"
	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
)

// DumpResult chứa thông tin kết quả dump
type DumpResult struct {
	FilePath string
	FileSize int64
	Success  bool
	Message  string
}

// DatabaseDumper là struct quản lý việc dump database
type DatabaseDumper struct {
	Config *config.Config
}

// NewDatabaseDumper tạo instance mới của DatabaseDumper
func NewDatabaseDumper(cfg *config.Config) *DatabaseDumper {
	return &DatabaseDumper{
		Config: cfg,
	}
}

// DumpDatabase thực hiện việc dump database từ container Docker
func (d *DatabaseDumper) DumpDatabase() (*DumpResult, error) {
	result := &DumpResult{
		Success: false,
	}

	// Lấy thông tin database từ database thay vì config
	dbUser, err := database.GetConfigValue("DB_USER")
	if err != nil || dbUser == "" {
		errMsg := "Không thể dump database: Thiếu thông tin tên người dùng database (DB_USER)"
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	dbPassword, err := database.GetConfigValue("DB_PASSWORD")
	if err != nil || dbPassword == "" {
		errMsg := "Không thể dump database: Thiếu thông tin mật khẩu database (DB_PASSWORD)"
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Lấy host từ database, nếu không có thì dùng localhost
	/*
		dbHost, err := database.GetConfigValue("DB_HOST")
		if err != nil || dbHost == "" {
			dbHost = "localhost" // giá trị mặc định
			fmt.Println("Sử dụng host mặc định: localhost")
		}
	*/

	dbName, err := database.GetConfigValue("DB_NAME")
	if err != nil || dbName == "" {
		errMsg := "Không thể dump database: Thiếu thông tin tên database (DB_NAME)"
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Kiểm tra nếu cần dùng Docker, phải có tên container
	containerName, err := database.GetConfigValue("CONTAINER_NAME")
	if err != nil || containerName == "" {
		errMsg := "Không thể dump database: Thiếu thông tin tên container (CONTAINER_NAME)"
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Tạo thư mục backup theo ngày
	now := time.Now()
	dateFolder := now.Format("2006-01-02")
	timestamp := now.Format("20060102_150405")

	backupDir := filepath.Join(d.Config.BackupDir, dateFolder)
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		errMsg := fmt.Sprintf("Không thể tạo thư mục backup: %v", err)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	fmt.Printf("Đã tạo thư mục backup: %s\n", backupDir)

	// Tạo tên file output
	outputFile := filepath.Join(backupDir, fmt.Sprintf("%s_%s_data.sql", dbName, timestamp))

	// Tạo lệnh dump database
	cmd := exec.Command(
		"docker", "exec",
		"-e", fmt.Sprintf("PGPASSWORD=%s", dbPassword),
		containerName,
		"pg_dump",
		"-v",
		"--data-only",
		"--column-inserts",
		"--disable-triggers",
		"-U", dbUser,
		"-d", dbName,
	)

	fmt.Println("Đang thực hiện lệnh dump...")

	// Tạo file output
	outFile, err := os.Create(outputFile)
	if err != nil {
		errMsg := fmt.Sprintf("Không thể tạo file output: %v", err)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}
	defer outFile.Close()

	// Thiết lập output, stderr
	cmd.Stdout = outFile
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		errMsg := fmt.Sprintf("Không thể thiết lập stderr pipe: %v", err)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Thực thi lệnh
	if err := cmd.Start(); err != nil {
		// Kiểm tra lỗi docker không khả dụng
		if strings.Contains(err.Error(), "executable file not found") {
			errMsg := "Docker không được cài đặt hoặc không khả dụng, vui lòng kiểm tra cài đặt Docker"
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}

		errMsg := fmt.Sprintf("Không thể khởi động lệnh: %v", err)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Đọc stderr
	stderrBytes, _ := io.ReadAll(stderrPipe)
	stderrOutput := string(stderrBytes)

	// Đợi lệnh hoàn thành
	if err := cmd.Wait(); err != nil {
		// Phân tích lỗi để cung cấp thông báo hữu ích hơn
		if strings.Contains(stderrOutput, "No such container") {
			errMsg := fmt.Sprintf("Container '%s' không tồn tại, vui lòng kiểm tra lại tên container", containerName)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		} else if strings.Contains(stderrOutput, "authentication failed") {
			errMsg := "Xác thực database thất bại, vui lòng kiểm tra tên người dùng và mật khẩu"
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		} else if strings.Contains(stderrOutput, "database") && strings.Contains(stderrOutput, "does not exist") {
			errMsg := fmt.Sprintf("Database '%s' không tồn tại, vui lòng kiểm tra lại tên database", dbName)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		} else if strings.Contains(stderrOutput, "connection refused") || strings.Contains(stderrOutput, "could not connect to server") {
			errMsg := fmt.Sprintf("Không thể kết nối đến server database, vui lòng kiểm tra lại thông tin kết nối")
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}

		fmt.Printf("Lỗi trong stderr: %s\n", stderrOutput)
		errMsg := fmt.Sprintf("Lệnh thất bại với mã lỗi: %v", err)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	if stderrOutput != "" {
		fmt.Printf("Thông báo từ stderr: %s\n", stderrOutput)
	}

	// Kiểm tra file có tồn tại không
	fileInfo, err := os.Stat(outputFile)
	if err != nil {
		errMsg := fmt.Sprintf("File không được tạo tại %s: %v", outputFile, err)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Kiểm tra kích thước file
	fileSize := fileInfo.Size()
	if fileSize == 0 {
		errMsg := "File dump được tạo nhưng rỗng, có thể database không có dữ liệu"
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Lưu thông tin backup vào database
	backupId, err := backupdb.AddBackup(
		filepath.Base(outputFile),
		outputFile,
		fileSize,
		now,
	)
	if err != nil {
		fmt.Printf("Cảnh báo: Không thể lưu thông tin backup vào database: %v\n", err)
	} else {
		fmt.Printf("Đã lưu thông tin backup vào database với ID: %d\n", backupId)
	}

	fmt.Println("Dump dữ liệu thành công.")
	fmt.Printf("Vị trí file: %s\n", outputFile)
	fmt.Printf("Kích thước file: %.2f MB\n", float64(fileSize)/(1024*1024))

	result.FilePath = outputFile
	result.FileSize = fileSize
	result.Success = true
	result.Message = "Dump dữ liệu thành công"

	return result, nil
}
