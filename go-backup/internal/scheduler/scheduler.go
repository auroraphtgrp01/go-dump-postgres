package scheduler

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/dbdump"
	"github.com/backup-cronjob/internal/drive"
	"github.com/robfig/cron/v3"
)

// Scheduler quản lý các công việc cron
type Scheduler struct {
	cron           *cron.Cron
	jobs           map[string]cron.EntryID
	config         *config.Config
	driveUploader  *drive.DriveUploader
	databaseDumper *dbdump.DatabaseDumper
	jobInProgress  bool
	mu             sync.Mutex
	profileBackups map[int64]cron.EntryID // Lưu EntryID theo profile ID
	jobStatus      map[int64]string       // Lưu trạng thái job theo profile ID: "running", "stopped"
}

// NewScheduler tạo một scheduler mới
func NewScheduler(cfg *config.Config, driveUploader *drive.DriveUploader) *Scheduler {
	// Sử dụng cron.New với tùy chọn cron.WithSeconds() để hỗ trợ đầy đủ biểu thức cron
	c := cron.New(cron.WithParser(cron.NewParser(
		cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor,
	)))

	return &Scheduler{
		cron:           c,
		jobs:           make(map[string]cron.EntryID),
		config:         cfg,
		driveUploader:  driveUploader,
		databaseDumper: dbdump.NewDatabaseDumper(cfg),
		jobInProgress:  false,
		profileBackups: make(map[int64]cron.EntryID),
		jobStatus:      make(map[int64]string),
	}
}

// Start khởi động scheduler
func (s *Scheduler) Start() {
	log.Println("Đang khởi động scheduler...")
	s.cron.Start()
	// Tải lịch backup từ tất cả các profile
	s.LoadAllProfiles()
	log.Println("Scheduler đã khởi động thành công")
}

// Stop dừng scheduler
func (s *Scheduler) Stop() {
	log.Println("Đang dừng scheduler...")
	s.cron.Stop()
	log.Println("Scheduler đã dừng")
}

// AddJob thêm một công việc backup mới
func (s *Scheduler) AddJob(profileID int64, schedule string, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Kiểm tra nếu đã có job cho profile này, xóa job cũ
	if oldEntryID, exists := s.profileBackups[profileID]; exists {
		s.cron.Remove(oldEntryID)
		delete(s.profileBackups, profileID)
		log.Printf("Đã xóa job cũ cho profile ID %d", profileID)
	}

	// Nếu schedule rỗng, không thêm job mới
	if schedule == "" {
		log.Printf("Schedule rỗng cho profile ID %d, không thêm job", profileID)
		delete(s.jobStatus, profileID)
		return nil
	}

	// Thêm công việc backup mới
	jobID, err := s.cron.AddFunc(schedule, func() {
		s.mu.Lock()
		// Kiểm tra nếu có công việc đang chạy
		if s.jobInProgress {
			log.Printf("Đã có công việc đang chạy, bỏ qua backup cho profile '%s'", name)
			s.mu.Unlock()
			return
		}
		s.jobInProgress = true
		s.mu.Unlock()

		log.Printf("Đang thực hiện backup tự động cho profile '%s'", name)

		// Ghi log bắt đầu
		startTime := time.Now()
		logID, logErr := database.CreateJobLog(profileID, "running", startTime)
		if logErr != nil {
			log.Printf("Lỗi khi tạo log job: %v", logErr)
		}

		// Đảm bảo luôn cập nhật trạng thái job khi kết thúc
		defer func() {
			s.mu.Lock()
			s.jobInProgress = false
			s.mu.Unlock()
		}()

		// Thực hiện backup
		profile, err := database.GetProfileByID(profileID)
		if err != nil {
			log.Printf("Lỗi khi lấy thông tin profile %d: %v", profileID, err)
			if logID > 0 {
				database.UpdateJobLog(logID, "failed", time.Now(), "", fmt.Sprintf("Lỗi khi lấy thông tin profile: %v", err))
			}
			return
		}

		// Thực hiện dump database
		result, err := s.databaseDumper.DumpDatabase(profile.ID)
		if err != nil {
			log.Printf("Lỗi khi backup profile '%s': %v", profile.Name, err)
			if logID > 0 {
				database.UpdateJobLog(logID, "failed", time.Now(), "", fmt.Sprintf("Lỗi khi backup: %v", err))
			}
			return
		}
		backupFilePath := result.FilePath

		log.Printf("Đã tạo backup: %s", backupFilePath)
		uploadSuccess := true
		uploadMessage := ""

		// Upload lên Google Drive nếu được cấu hình
		if profile.UploadToDrive && s.driveUploader != nil {
			log.Printf("Đang upload backup lên Google Drive...")
			uploadResult := s.driveUploader.UploadFile(backupFilePath)
			if uploadResult.Success {
				log.Printf("Upload thành công: %s", uploadResult.WebLink)
				uploadMessage = fmt.Sprintf("Upload thành công: %s", uploadResult.WebLink)
			} else {
				log.Printf("Lỗi khi upload: %s", uploadResult.Message)
				uploadSuccess = false
				uploadMessage = fmt.Sprintf("Lỗi khi upload: %s", uploadResult.Message)
			}
		}

		// Cập nhật log hoàn thành
		if logID > 0 {
			endTime := time.Now()
			status := "success"
			message := "Backup thành công"

			if !uploadSuccess {
				message = uploadMessage
			}

			database.UpdateJobLog(logID, status, endTime, backupFilePath, message)
		}

		log.Printf("Hoàn thành backup tự động cho profile '%s'", name)
	})

	if err != nil {
		return fmt.Errorf("lỗi khi thêm job: %v", err)
	}

	// Lưu ID của job theo profile ID
	s.profileBackups[profileID] = jobID
	s.jobStatus[profileID] = "running"
	log.Printf("Đã thêm lịch backup '%s' cho profile ID %d", schedule, profileID)

	return nil
}

// RemoveJob xóa một công việc backup
func (s *Scheduler) RemoveJob(profileID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.profileBackups[profileID]; exists {
		s.cron.Remove(entryID)
		delete(s.profileBackups, profileID)
		log.Printf("Đã xóa job cho profile ID %d", profileID)
	}
}

// LoadAllProfiles tải tất cả các profile và lịch trình của chúng
func (s *Scheduler) LoadAllProfiles() error {
	profiles, err := database.GetAllProfiles()
	if err != nil {
		return fmt.Errorf("lỗi khi lấy danh sách profile: %v", err)
	}

	for _, profile := range profiles {
		// Chỉ thêm job cho profile đang hoạt động và có lịch
		if profile.IsActive && profile.CronSchedule != "" {
			err := s.AddJob(profile.ID, profile.CronSchedule, profile.Name)
			if err != nil {
				log.Printf("Lỗi khi thêm job cho profile '%s': %v", profile.Name, err)
				continue
			}
		}
	}

	return nil
}

// RunBackupNow chạy backup ngay lập tức
func (s *Scheduler) RunBackupNow(profileID int64) error {
	s.mu.Lock()
	// Kiểm tra nếu đang có công việc backup đang chạy
	if s.jobInProgress {
		s.mu.Unlock()
		return fmt.Errorf("đã có công việc backup đang chạy, vui lòng thử lại sau")
	}
	s.jobInProgress = true
	s.mu.Unlock()

	// Đảm bảo luôn đặt jobInProgress về false khi kết thúc
	defer func() {
		s.mu.Lock()
		s.jobInProgress = false
		s.mu.Unlock()
	}()

	// Lấy thông tin profile
	profile, err := database.GetProfileByID(profileID)
	if err != nil {
		return fmt.Errorf("lỗi khi lấy thông tin profile: %v", err)
	}

	log.Printf("Đang thực hiện backup ngay lập tức cho profile '%s'", profile.Name)

	// Ghi log bắt đầu
	startTime := time.Now()
	logID, logErr := database.CreateJobLog(profileID, "manual", startTime)
	if logErr != nil {
		log.Printf("Lỗi khi tạo log job manual: %v", logErr)
	}

	// Thực hiện dump database
	result, err := s.databaseDumper.DumpDatabase(profile.ID)
	if err != nil {
		if logID > 0 {
			database.UpdateJobLog(logID, "failed", time.Now(), "", fmt.Sprintf("Lỗi khi backup: %v", err))
		}
		return fmt.Errorf("lỗi khi backup: %v", err)
	}
	backupFilePath := result.FilePath

	log.Printf("Đã tạo backup: %s", backupFilePath)
	uploadSuccess := true
	uploadMessage := ""

	// Upload lên Google Drive nếu được cấu hình
	if profile.UploadToDrive && s.driveUploader != nil {
		log.Printf("Đang upload backup lên Google Drive...")
		uploadResult := s.driveUploader.UploadFile(backupFilePath)
		if uploadResult.Success {
			log.Printf("Upload thành công: %s", uploadResult.WebLink)
			uploadMessage = fmt.Sprintf("Upload thành công: %s", uploadResult.WebLink)
		} else {
			log.Printf("Lỗi khi upload: %s", uploadResult.Message)
			uploadSuccess = false
			uploadMessage = fmt.Sprintf("Lỗi khi upload: %s", uploadResult.Message)
		}
	}

	// Cập nhật log hoàn thành
	if logID > 0 {
		endTime := time.Now()
		status := "success"
		message := "Backup thủ công thành công"

		if !uploadSuccess {
			message = uploadMessage
		}

		database.UpdateJobLog(logID, status, endTime, backupFilePath, message)
	}

	log.Printf("Hoàn thành backup ngay lập tức cho profile '%s'", profile.Name)
	return nil
}

// GetActiveJobs trả về thông tin tất cả các job đang chạy
func (s *Scheduler) GetActiveJobs() []map[string]interface{} {
	entries := s.cron.Entries()
	jobs := make([]map[string]interface{}, 0, len(entries))

	for _, entry := range entries {
		for profileID, entryID := range s.profileBackups {
			if entry.ID == entryID {
				// Lấy thông tin profile
				profile, err := database.GetProfileByID(profileID)
				if err != nil {
					log.Printf("Lỗi khi lấy thông tin profile %d: %v", profileID, err)
					continue
				}

				// Lấy số lần đã chạy
				counts, err := database.CountJobRunsByProfile(profileID)
				var successCount, failedCount int
				if err == nil {
					successCount = counts["success"]
					failedCount = counts["failed"]
				}

				// Tính thời gian chạy tiếp theo
				nextRun := entry.Next
				duration := time.Until(nextRun)

				// Lấy trạng thái job
				status := s.jobStatus[profileID]
				if status == "" {
					status = "running" // Mặc định là running
				}

				jobs = append(jobs, map[string]interface{}{
					"profile_id":    profileID,
					"profile_name":  profile.Name,
					"schedule":      profile.CronSchedule,
					"next_run":      nextRun.Format("02/01/2006 15:04:05"),
					"duration":      formatDuration(duration),
					"status":        status,
					"success_count": successCount,
					"failed_count":  failedCount,
				})
				break
			}
		}
	}

	return jobs
}

// formatDuration định dạng thời gian còn lại thành chuỗi dễ đọc
func formatDuration(d time.Duration) string {
	d = d.Round(time.Minute)
	h := d / time.Hour
	d -= h * time.Hour
	m := d / time.Minute

	if h > 0 {
		return fmt.Sprintf("%d giờ %d phút", h, m)
	}
	return fmt.Sprintf("%d phút", m)
}

// PauseJob tạm dừng một job
func (s *Scheduler) PauseJob(profileID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.profileBackups[profileID]; !exists {
		return fmt.Errorf("không tìm thấy job cho profile ID %d", profileID)
	}

	s.jobStatus[profileID] = "paused"
	log.Printf("Đã tạm dừng job cho profile ID %d", profileID)
	return nil
}

// ResumeJob tiếp tục chạy một job đã tạm dừng
func (s *Scheduler) ResumeJob(profileID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.profileBackups[profileID]; !exists {
		return fmt.Errorf("không tìm thấy job cho profile ID %d", profileID)
	}

	s.jobStatus[profileID] = "running"
	log.Printf("Đã tiếp tục chạy job cho profile ID %d", profileID)
	return nil
}

// GetJobStatus lấy trạng thái hiện tại của job
func (s *Scheduler) GetJobStatus(profileID int64) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	if status, exists := s.jobStatus[profileID]; exists {
		return status
	}
	return "unknown"
}
