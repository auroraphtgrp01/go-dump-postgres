package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/backup-cronjob/internal/auth"
	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/dbdump"
	"github.com/backup-cronjob/internal/drive"
	"github.com/backup-cronjob/internal/handlers"
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
		result, err := dumper.DumpDatabase()
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

	// Duyệt qua tất cả thư mục ngày
	dateDirs, err := os.ReadDir(backupDir)
	if err != nil {
		return ""
	}

	for _, dateDir := range dateDirs {
		if dateDir.IsDir() {
			datePath := filepath.Join(backupDir, dateDir.Name())
			files, err := filepath.Glob(filepath.Join(datePath, "*.sql"))
			if err != nil {
				continue
			}

			for _, file := range files {
				info, err := os.Stat(file)
				if err != nil {
					continue
				}

				modTime := info.ModTime().Unix()
				if modTime > latestMTime {
					latestMTime = modTime
					latestFile = file
				}
			}
		}
	}

	return latestFile
}

// startWebApp khởi động ứng dụng web
func startWebApp(cfg *config.Config, port string) {
	// Thiết lập Gin
	router := gin.Default()

	// Tạo handler
	h := handlers.NewHandler(cfg)

	// Cấu hình static files
	router.Static("/static", "./ui/static")

	// Các route xác thực API
	router.POST("/login", h.LoginHandler)
	router.POST("/logout", h.LogoutHandler)

	// Thêm các route xác thực Google
	router.GET("/auth", h.AuthHandler)
	router.GET("/callback", h.AuthCallbackHandler)

	// API routes - Các route cần xác thực
	protected := router.Group("/api")
	protected.Use(auth.AuthMiddleware())
	{
		protected.GET("/me", h.MeHandler)
		protected.GET("/backups", h.GetBackupsHandler)
		protected.GET("/configs", h.GetConfigsHandler)
		protected.POST("/configs", h.UpdateConfigsHandler)
		protected.GET("/configs/:group", h.GetConfigsByGroupHandler)
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
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Không thể khởi động server web: %v", err)
	}
}
