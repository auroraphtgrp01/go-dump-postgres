package dbdump

import (
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/backup-cronjob/internal/backupdb"
	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/models"
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
func (d *DatabaseDumper) DumpDatabase(profileId int64) (*DumpResult, error) {
	// Tạo đối tượng result mặc định
	result := &DumpResult{
		Success: false,
	}

	// Kiểm tra thư mục backup
	backupBaseDir := d.Config.BackupDir
	if backupBaseDir == "" {
		errMsg := "Không thể dump database: Thiếu thông tin đường dẫn lưu backup (BACKUP_DIR)"
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Lấy thông tin profile từ database
	var profile models.DatabaseProfile
	var err error

	if profileId > 0 {
		// Lấy profile theo ID
		profile, err = database.GetProfile(profileId)
		if err != nil {
			errMsg := fmt.Sprintf("Không thể tìm thấy profile với ID=%d: %v", profileId, err)
			log.Printf(errMsg)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}
	} else {
		// Lấy profile đang hoạt động
		profile, err = database.GetActiveProfile()
		if err != nil {
			// Thử lấy thông tin cấu hình từ database/config hoặc từ file .env
			var dbConfigErrors []string

			// Kiểm tra DB_USER
			dbUser, err := database.GetConfigValue("DB_USER")
			if err != nil || dbUser == "" {
				dbUser = d.Config.DBUsername
				if dbUser == "" {
					errMsg := "Thiếu thông tin tên người dùng database (DB_USER)"
					dbConfigErrors = append(dbConfigErrors, errMsg)
				}
			}

			// Kiểm tra DB_PASSWORD
			dbPassword, err := database.GetConfigValue("DB_PASSWORD")
			if err != nil || dbPassword == "" {
				dbPassword = d.Config.DBPassword
				if dbPassword == "" {
					errMsg := "Thiếu thông tin mật khẩu database (DB_PASSWORD)"
					dbConfigErrors = append(dbConfigErrors, errMsg)
				}
			}

			// Kiểm tra DB_NAME
			dbName, err := database.GetConfigValue("DB_NAME")
			if err != nil || dbName == "" {
				dbName = d.Config.DBName
				if dbName == "" {
					errMsg := "Thiếu thông tin tên database (DB_NAME)"
					dbConfigErrors = append(dbConfigErrors, errMsg)
				}
			}

			// Kiểm tra CONTAINER_NAME
			containerName, err := database.GetConfigValue("CONTAINER_NAME")
			if err != nil || containerName == "" {
				errMsg := "Thiếu thông tin tên container (CONTAINER_NAME)"
				dbConfigErrors = append(dbConfigErrors, errMsg)
			}

			// Nếu có lỗi cấu hình, trả về ngay
			if len(dbConfigErrors) > 0 {
				errMsg := fmt.Sprintf("Không thể dump database: %s", strings.Join(dbConfigErrors, "; "))
				log.Printf(errMsg)
				result.Message = errMsg
				return result, fmt.Errorf(errMsg)
			}

			// Tạo profile tạm thời từ cấu hình hiện tại
			now := time.Now()
			profile = models.DatabaseProfile{
				Name:          "Temporary",
				Description:   "Tạm thời từ cấu hình có sẵn",
				DBUser:        dbUser,
				DBPassword:    dbPassword,
				ContainerName: containerName,
				DBName:        dbName,
				IsActive:      true,
				CreatedAt:     now,
				UpdatedAt:     now,
			}
		}
	}

	// Ghi thông tin dump
	log.Printf("Thực hiện dump với profile: %s", profile.Name)
	log.Printf("Thông tin kết nối: DBUser=%s, DBName=%s, ContainerName=%s",
		profile.DBUser, profile.DBName, profile.ContainerName)

	// Tạo thư mục backup theo ngày
	now := time.Now()
	dateFolder := now.Format("2006-01-02")
	timestamp := now.Format("20060102_150405")

	backupDir := filepath.Join(backupBaseDir, dateFolder)
	log.Printf("Đang tạo thư mục backup theo ngày: %s", backupDir)

	if err := os.MkdirAll(backupDir, 0755); err != nil {
		errMsg := fmt.Sprintf("Không thể tạo thư mục backup: %v", err)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Kiểm tra xem thư mục đã được tạo hay chưa
	if _, err := os.Stat(backupDir); os.IsNotExist(err) {
		errMsg := fmt.Sprintf("Thư mục backup đã được tạo nhưng không thể truy cập: %s", backupDir)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	log.Printf("Đã tạo thư mục backup theo ngày: %s", backupDir)

	// Tạo tên file output
	outputFile := filepath.Join(backupDir, fmt.Sprintf("%s_%s_data.sql", profile.DBName, timestamp))
	log.Printf("Tên file output: %s", outputFile)

	// Kiểm tra Docker có sẵn không
	dockerCheck := exec.Command("docker", "--version")
	dockerOut, dockerErr := dockerCheck.CombinedOutput()
	if dockerErr != nil {
		errMsg := fmt.Sprintf("Docker không có sẵn: %v\nOutput: %s", dockerErr, string(dockerOut))
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}
	log.Printf("Docker có sẵn: %s", strings.TrimSpace(string(dockerOut)))

	// Kiểm tra container có tồn tại không
	containerCheck := exec.Command("docker", "container", "inspect", profile.ContainerName)
	containerOut, containerErr := containerCheck.CombinedOutput()
	if containerErr != nil {
		errMsg := fmt.Sprintf("Container '%s' không tồn tại hoặc không thể truy cập: %v\nOutput: %s",
			profile.ContainerName, containerErr, string(containerOut))
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}
	log.Printf("Container '%s' tồn tại và có thể truy cập", profile.ContainerName)

	// Kiểm tra container có chạy PostgreSQL không
	// Thực hiện kiểm tra cơ bản xem container có postgres hay không
	pgVersionCmd := exec.Command(
		"docker", "exec",
		profile.ContainerName,
		"sh", "-c", "command -v psql && psql --version || echo 'PostgreSQL not found'",
	)
	pgVersionOut, pgVersionErr := pgVersionCmd.CombinedOutput()
	pgVersionOutput := string(pgVersionOut)

	if pgVersionErr != nil || strings.Contains(pgVersionOutput, "not found") {
		errMsg := fmt.Sprintf("Container không chứa PostgreSQL hoặc PostgreSQL không thể truy cập: %v\nOutput: %s",
			pgVersionErr, pgVersionOutput)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}
	log.Printf("PostgreSQL được tìm thấy trong container: %s", strings.TrimSpace(pgVersionOutput))

	cmd := exec.Command(
		"docker", "exec",
		"-e", fmt.Sprintf("PGPASSWORD=%s", profile.DBPassword),
		profile.ContainerName,
		"pg_dump",
		"-v",
		"-d", profile.DBName,
		"-U", profile.DBUser,
		"--inserts",
		"--no-owner",
		"--no-privileges",
		"--data-only",
		"--column-inserts",
		"--disable-triggers",
	)

	log.Printf("Lệnh dump đầy đủ: docker exec -e PGPASSWORD=*** %s pg_dump -v -d %s -U %s --inserts --no-owner --no-privileges --data-only --column-inserts --disable-triggers",
		profile.ContainerName, profile.DBName, profile.DBUser)

	// Tạo file output
	outFile, err := os.Create(outputFile)
	if err != nil {
		errMsg := fmt.Sprintf("Không thể tạo file output: %v", err)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}
	defer outFile.Close()

	// Thiết lập output, stderr
	cmd.Stdout = outFile
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		errMsg := fmt.Sprintf("Không thể thiết lập stderr pipe: %v", err)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Thực thi lệnh
	log.Printf("Đang thực hiện lệnh dump...")
	if err := cmd.Start(); err != nil {
		// Kiểm tra lỗi docker không khả dụng
		if strings.Contains(err.Error(), "executable file not found") {
			errMsg := "Docker không được cài đặt hoặc không khả dụng, vui lòng kiểm tra cài đặt Docker"
			log.Printf(errMsg)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}

		errMsg := fmt.Sprintf("Không thể khởi động lệnh: %v", err)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	// Đọc stderr
	stderrBytes, _ := io.ReadAll(stderrPipe)
	stderrOutput := string(stderrBytes)

	// Đợi lệnh hoàn thành
	err = cmd.Wait()
	if err != nil {
		// Kiểm tra lỗi PostgreSQL không khả dụng
		if strings.Contains(stderrOutput, "could not connect to server") {
			errMsg := fmt.Sprintf("Không thể kết nối đến PostgreSQL server: %v\nOutput: %s", err, stderrOutput)
			log.Printf(errMsg)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}

		// Kiểm tra lỗi truy cập bị từ chối
		if strings.Contains(stderrOutput, "permission denied") || strings.Contains(stderrOutput, "authentication failed") {
			errMsg := fmt.Sprintf("Truy cập đến PostgreSQL bị từ chối (sai username/password): %v\nOutput: %s", err, stderrOutput)
			log.Printf(errMsg)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}

		// Các lỗi khác
		errMsg := fmt.Sprintf("Lỗi khi thực hiện dump: %v\nOutput: %s", err, stderrOutput)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	log.Printf("Lệnh dump đã hoàn thành thành công")

	// Kiểm tra file output
	fileInfo, err := os.Stat(outputFile)
	if err != nil {
		errMsg := fmt.Sprintf("Lỗi khi kiểm tra file output: %v", err)
		log.Printf(errMsg)
		result.Message = errMsg
		return result, fmt.Errorf(errMsg)
	}

	fileSize := fileInfo.Size()
	log.Printf("Kích thước file output: %d bytes", fileSize)

	if fileSize == 0 {
		// Thử dùng lệnh pg_dump đơn giản hơn nếu file có kích thước 0
		log.Printf("File dump rỗng, thử lại với cách khác...")

		// Đóng file cũ
		outFile.Close()

		// Xóa file rỗng
		os.Remove(outputFile)

		// Tạo lại file output
		outFile, err = os.Create(outputFile)
		if err != nil {
			errMsg := fmt.Sprintf("Không thể tạo lại file output: %v", err)
			log.Printf(errMsg)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}
		defer outFile.Close()

		// Tạo lệnh dump đơn giản hơn
		simpleDumpCmd := exec.Command(
			"docker", "exec",
			"-e", fmt.Sprintf("PGPASSWORD=%s", profile.DBPassword),
			profile.ContainerName,
			"pg_dump",
			"-U", profile.DBUser,
			profile.DBName,
		)

		log.Printf("Thử lại với lệnh đơn giản hơn: docker exec -e PGPASSWORD=*** %s pg_dump -U %s %s",
			profile.ContainerName, profile.DBUser, profile.DBName)

		// Thiết lập output
		simpleDumpCmd.Stdout = outFile
		simpleDumpCmd.Stderr = os.Stderr

		// Thực thi lệnh
		if err := simpleDumpCmd.Run(); err != nil {
			errMsg := fmt.Sprintf("Lệnh dump đơn giản cũng thất bại: %v", err)
			log.Printf(errMsg)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}

		// Kiểm tra lại kích thước file
		fileInfo, _ = os.Stat(outputFile)
		fileSize = fileInfo.Size()

		if fileSize == 0 {
			errMsg := "Không thể tạo file dump có dữ liệu, có thể database không có dữ liệu hoặc không thể truy cập đến nó"
			log.Printf(errMsg)
			result.Message = errMsg
			return result, fmt.Errorf(errMsg)
		}
	}

	// Lưu thông tin backup vào database
	log.Printf("Đang lưu thông tin backup vào database...")
	backupId, err := backupdb.AddBackup(
		filepath.Base(outputFile),
		outputFile,
		fileSize,
		now,
	)
	if err != nil {
		log.Printf("Cảnh báo: Không thể lưu thông tin backup vào database: %v", err)
	} else {
		log.Printf("Đã lưu thông tin backup vào database với ID: %d", backupId)
	}

	// Trả về kết quả thành công
	result.Success = true
	result.FilePath = outputFile
	result.FileSize = fileSize
	result.Message = fmt.Sprintf("Dump database thành công, đã lưu tại: %s", outputFile)

	return result, nil
}
