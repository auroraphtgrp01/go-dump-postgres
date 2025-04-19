package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/backup-cronjob/internal/auth"
	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/dbdump"
	"github.com/backup-cronjob/internal/drive"
	"github.com/backup-cronjob/internal/handlers"
	"github.com/backup-cronjob/internal/scheduler"
	"github.com/gin-gonic/gin"
)

func main() {
	// Thiết lập các flag dòng lệnh
	var (
		dumpOnly   = flag.Bool("dump", false, "Chỉ thực hiện dump database")
		uploadLast = flag.Bool("upload-last", false, "Upload file backup mới nhất")
		uploadAll  = flag.Bool("upload-all", false, "Upload tất cả các file backup")
		webMode    = flag.Bool("web", false, "Khởi động ứng dụng web")
		port       = flag.String("port", "8080", "Port cho ứng dụng web")
	)
	flag.Parse()

	// Khởi tạo cấu hình với giá trị mặc định
	cfg, err := config.InitConfig()
	if err != nil {
		log.Fatalf("Không thể khởi tạo cấu hình: %v", err)
	}

	// Khởi tạo database
	err = database.InitDB(cfg)
	if err != nil {
		log.Fatalf("Không thể khởi tạo database: %v", err)
	}
	defer database.Close()

	// Nạp cấu hình từ database
	err = cfg.LoadConfigFromDB(database.GetConfigValue)
	if err != nil {
		log.Printf("Không thể nạp cấu hình từ database: %v", err)
		log.Println("Tiếp tục với cấu hình mặc định...")
	}

	// Khởi tạo module xác thực
	auth.Init(cfg)

	// Khởi tạo các đối tượng
	dumper := dbdump.NewDatabaseDumper(cfg)
	uploader := drive.NewDriveUploader(cfg)

	// Thực hiện theo flag
	if *dumpOnly || (!*uploadLast && !*uploadAll && !*webMode) {
		// Nếu chỉ có flag dump hoặc không có flag nào, thực hiện dump
		fmt.Println("Đang thực hiện dump database...")
		result, err := dumper.DumpDatabase(0) // Sử dụng profile đang hoạt động
		if err != nil {
			log.Fatalf("Lỗi khi dump database: %v", err)
		}
		fmt.Printf("Dump thành công: %s\n", result.FilePath)
	}

	if *uploadLast {
		// Upload file mới nhất
		fmt.Println("Đang tìm file backup mới nhất...")
		latestFile := findLatestBackup(cfg.BackupDir)
		if latestFile == "" {
			log.Fatalf("Không tìm thấy file backup nào")
		}

		fmt.Printf("Đang upload file %s lên Google Drive...\n", filepath.Base(latestFile))
		result := uploader.UploadFile(latestFile)
		if !result.Success {
			log.Fatalf("Lỗi khi upload file: %v", result.Message)
		}
		fmt.Println("Upload thành công!")
	}

	if *uploadAll {
		// Upload tất cả file
		fmt.Println("Đang upload tất cả file backup lên Google Drive...")
		err := uploader.UploadAllBackups()
		if err != nil {
			log.Fatalf("Lỗi khi upload tất cả file: %v", err)
		}
		fmt.Println("Upload thành công!")
	}

	if *webMode {
		// Khởi động ứng dụng web
		fmt.Printf("Đang khởi động ứng dụng web trên port %s...\n", *port)
		startWebApp(cfg, *port)
	}
}

// findLatestBackup tìm file backup mới nhất
func findLatestBackup(backupDir string) string {
	var (
		latestFile  string
		latestMTime int64
	)

	// Kiểm tra và xử lý đường dẫn backup
	if strings.HasPrefix(backupDir, "./") {
		// Đường dẫn tương đối so với thư mục hiện tại, giữ nguyên
		fmt.Printf("Sử dụng đường dẫn tương đối: %s\n", backupDir)
	} else if !filepath.IsAbs(backupDir) {
		// Đường dẫn tương đối không bắt đầu bằng './', chuyển thành tuyệt đối
		absPath, err := filepath.Abs(backupDir)
		if err != nil {
			fmt.Printf("Warning: Không thể chuyển đổi đường dẫn tương đối thành tuyệt đối: %v\n", err)
		} else {
			fmt.Printf("Đã chuyển đổi đường dẫn từ '%s' thành '%s'\n", backupDir, absPath)
			backupDir = absPath
		}
	} else {
		fmt.Printf("Sử dụng đường dẫn tuyệt đối: %s\n", backupDir)
	}

	// Đảm bảo đường dẫn là đường dẫn hợp lệ và tồn tại
	backupDir = filepath.Clean(backupDir)
	fmt.Printf("Đường dẫn sau khi làm sạch: %s\n", backupDir)

	if _, err := os.Stat(backupDir); os.IsNotExist(err) {
		fmt.Printf("Thư mục backup không tồn tại: %s\n", backupDir)
		return ""
	}

	fmt.Printf("Đang tìm backup mới nhất trong thư mục: %s\n", backupDir)

	// Duyệt qua tất cả thư mục ngày
	dateDirs, err := os.ReadDir(backupDir)
	if err != nil {
		fmt.Printf("Lỗi khi đọc thư mục backup: %v\n", err)
		return ""
	}

	for _, dateDir := range dateDirs {
		if dateDir.IsDir() {
			datePath := filepath.Join(backupDir, dateDir.Name())
			fmt.Printf("Kiểm tra thư mục ngày: %s\n", datePath)

			files, err := filepath.Glob(filepath.Join(datePath, "*.sql"))
			if err != nil {
				fmt.Printf("Lỗi khi tìm file SQL trong thư mục %s: %v\n", datePath, err)
				continue
			}

			fmt.Printf("Tìm thấy %d file SQL trong thư mục %s\n", len(files), datePath)

			for _, file := range files {
				info, err := os.Stat(file)
				if err != nil {
					fmt.Printf("Lỗi khi đọc thông tin file %s: %v\n", file, err)
					continue
				}

				modTime := info.ModTime().Unix()
				if modTime > latestMTime {
					latestMTime = modTime
					latestFile = file
					fmt.Printf("Đã tìm thấy file mới hơn: %s (mtime: %d)\n", file, modTime)
				}
			}
		}
	}

	if latestFile != "" {
		fmt.Printf("File backup mới nhất: %s\n", latestFile)
	} else {
		fmt.Println("Không tìm thấy file backup nào")
	}

	return latestFile
}

// startWebApp khởi động ứng dụng web
func startWebApp(cfg *config.Config, port string) {
	// Thiết lập Gin
	router := gin.Default()

	// Khởi tạo DriveUploader
	uploader := drive.NewDriveUploader(cfg)

	// Khởi tạo Scheduler
	backupScheduler := scheduler.NewScheduler(cfg, uploader)
	backupScheduler.Start()
	// Đảm bảo dừng scheduler khi ứng dụng kết thúc
	defer backupScheduler.Stop()

	// Tạo handler, truyền thêm scheduler
	h := handlers.NewHandler(cfg, backupScheduler)

	// Middleware để debug request
	router.Use(func(c *gin.Context) {
		// Log request
		fmt.Printf("Request: %s %s\n", c.Request.Method, c.Request.URL.Path)
		// Tiếp tục xử lý
		c.Next()
		// Log response status
		fmt.Printf("Response status: %d\n", c.Writer.Status())
	})

	// Cấu hình CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Cấu hình phục vụ frontend React
	publicDir := "./public"
	if _, err := os.Stat(publicDir); !os.IsNotExist(err) {
		fmt.Printf("Thư mục public tồn tại: %s, kiểm tra index.html\n", publicDir)
		indexHtmlPath := filepath.Join(publicDir, "index.html")
		if _, err := os.Stat(indexHtmlPath); !os.IsNotExist(err) {
			fmt.Printf("File index.html tồn tại tại: %s\n", indexHtmlPath)
		} else {
			fmt.Printf("ERROR: Không tìm thấy file index.html tại %s\n", indexHtmlPath)
		}

		// Phục vụ các tài nguyên tĩnh (JS, CSS, ảnh)
		router.Static("/assets", filepath.Join(publicDir, "assets"))
		router.StaticFile("/vite.svg", filepath.Join(publicDir, "vite.svg"))
		router.StaticFile("/favicon.ico", filepath.Join(publicDir, "favicon.ico"))

		// Thiết lập route gốc để phục vụ index.html
		router.GET("/", func(c *gin.Context) {
			fmt.Println("Truy cập path / - Phục vụ index.html")
			c.File(indexHtmlPath)
		})

		// Xử lý SPA routing - trả về index.html cho các đường dẫn không tồn tại
		router.NoRoute(func(c *gin.Context) {
			// Chỉ phục vụ index.html nếu đường dẫn không bắt đầu bằng /api
			path := c.Request.URL.Path
			fmt.Printf("NoRoute handler được gọi cho path: %s\n", path)
			if !strings.HasPrefix(path, "/api") {
				fmt.Printf("Phục vụ index.html cho path: %s\n", path)
				c.File(indexHtmlPath)
				return
			}
			// Nếu là API route không tồn tại, trả về 404
			fmt.Printf("Trả về 404 cho API path: %s\n", path)
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
		})

		fmt.Println("Đã cấu hình phục vụ frontend React từ thư mục " + publicDir)
	} else {
		// Sử dụng thư mục cũ nếu không tìm thấy frontend
		router.Static("/static", "./ui/static")
		fmt.Println("Warning: Không tìm thấy thư mục frontend build ở " + publicDir)
	}

	// Các route xác thực API
	router.POST("/login", h.LoginHandler)
	router.POST("/logout", h.LogoutHandler)

	// Thêm các route xác thực Google
	router.GET("/auth", h.AuthHandler)
	router.GET("/callback", h.AuthCallbackHandler)

	// Thêm các route API có tiền tố /api
	router.POST("/api/login", h.LoginHandler)
	router.POST("/api/logout", h.LogoutHandler)
	router.GET("/api/auth", h.AuthHandler)
	router.GET("/api/auth/google/login", h.AuthHandler)
	router.GET("/api/auth/url", h.GetAuthURLHandler)
	router.POST("/api/auth/exchange", h.ExchangeAuthCodeHandler)
	router.GET("/api/callback", h.AuthCallbackHandler)

	// API routes - Các route cần xác thực
	protected := router.Group("/api")
	protected.Use(auth.AuthMiddleware())
	{
		protected.GET("/me", h.MeHandler)
		protected.GET("/backups", h.GetBackupsHandler)
		protected.DELETE("/backups/:id", h.DeleteBackupHandler)
		protected.GET("/configs", h.GetConfigsHandler)
		protected.POST("/configs", h.UpdateConfigsHandler)
		protected.GET("/configs/:group", h.GetConfigsByGroupHandler)
		protected.GET("/drive/status", h.CheckDriveStatusHandler)

		// Quản lý profile database
		protected.GET("/profiles", h.GetProfilesHandler)
		protected.GET("/profiles/active", h.GetActiveProfileHandler)
		protected.GET("/profiles/:id", h.GetProfileHandler)
		protected.POST("/profiles", h.CreateProfileHandler)
		protected.PUT("/profiles/:id", h.UpdateProfileHandler)
		protected.DELETE("/profiles/:id", h.DeleteProfileHandler)
		protected.POST("/profiles/:id/activate", h.SetActiveProfileHandler)

		// Route mới cho tính năng lập lịch backup tự động
		protected.GET("/schedule/options", h.GetScheduleOptionsHandler)
		protected.GET("/schedule/jobs", h.GetActiveJobsHandler)
		protected.POST("/schedule/update", h.UpdateScheduleHandler)
		protected.POST("/schedule/run-now", h.RunBackupNowHandler)
		protected.POST("/schedule/delete", h.DeleteScheduleHandler)
		protected.POST("/schedule/pause", h.PauseScheduleHandler)
		protected.POST("/schedule/resume", h.ResumeScheduleHandler)
		protected.GET("/schedule/logs/:id", h.GetJobLogsHandler)
	}

	// Action routes - Các hành động cần xác thực
	actions := router.Group("/")
	actions.Use(auth.AuthMiddleware())
	{
		actions.POST("/dump", h.DumpHandler)
		actions.POST("/upload-last", h.UploadLastHandler)
		actions.POST("/upload-all", h.UploadAllHandler)
		actions.POST("/upload/:id", h.UploadSingleHandler)
		actions.GET("/download/:id", h.DownloadHandler)
	}

	// Khởi động server
	fmt.Printf("Server đang lắng nghe tại http://localhost:%s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Không thể khởi động server web: %v", err)
	}
}
