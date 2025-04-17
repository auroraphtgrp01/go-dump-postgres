package handlers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/backup-cronjob/internal/auth"
	"github.com/backup-cronjob/internal/backupdb"
	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/dbdump"
	"github.com/backup-cronjob/internal/drive"
	"github.com/backup-cronjob/internal/models"
	"github.com/gin-gonic/gin"
)

// Handler quản lý tất cả các xử lý HTTP
type Handler struct {
	Config         *config.Config
	DatabaseDumper *dbdump.DatabaseDumper
	DriveUploader  *drive.DriveUploader
}

// NewHandler tạo instance mới của Handler
func NewHandler(cfg *config.Config) *Handler {
	// Khởi tạo authentication
	auth.Init(cfg)

	// Khởi tạo database
	if err := database.InitDB(cfg); err != nil {
		panic(fmt.Sprintf("Failed to initialize database: %v", err))
	}

	return &Handler{
		Config:         cfg,
		DatabaseDumper: dbdump.NewDatabaseDumper(cfg),
		DriveUploader:  drive.NewDriveUploader(cfg),
	}
}

// OperationResult chứa kết quả của một thao tác
type OperationResult struct {
	Success bool
	Message string
}

// IndexHandler xử lý trang chủ
func (h *Handler) IndexHandler(c *gin.Context) {
	log.Printf("IndexHandler - Đang xử lý request từ %s", c.Request.RemoteAddr)

	// Kiểm tra các phương thức xác thực khác nhau
	cookieValue, _ := c.Cookie("logged_in")
	authToken, _ := c.Cookie("auth_token")
	authHeader := c.GetHeader("Authorization")

	log.Printf("Auth check: logged_in cookie=[%s], auth_token cookie exists=[%v], auth header exists=[%v]",
		cookieValue, authToken != "", authHeader != "")

	// Kiểm tra nghiêm ngặt các phương thức xác thực
	var isAuthenticated bool

	// Kiểm tra authToken có hợp lệ hay không
	if authToken != "" {
		// Xác thực JWT token
		claims, err := auth.ValidateJWT(authToken)
		if err == nil && claims != nil {
			isAuthenticated = true
			log.Printf("✅ User authenticated via auth_token: %s", claims.Username)
		} else {
			// Token không hợp lệ, xóa cookie
			log.Printf("❌ Invalid auth_token: %v", err)
			c.SetCookie("auth_token", "", -1, "/", "", false, true)
			authToken = ""
		}
	}

	// Kiểm tra header Authorization
	if !isAuthenticated && authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token := authHeader[7:]
		claims, err := auth.ValidateJWT(token)
		if err == nil && claims != nil {
			isAuthenticated = true
			log.Printf("✅ User authenticated via Authorization header: %s", claims.Username)
		}
	}

	// Kiểm tra cookie logged_in chỉ khi có auth_token hợp lệ
	if !isAuthenticated && cookieValue == "true" && authToken != "" {
		isAuthenticated = true
		log.Printf("✅ User authenticated via logged_in cookie")
	}

	// Nếu đã xác thực thành công
	if isAuthenticated {
		// Đảm bảo có cookie logged_in
		if cookieValue != "true" {
			log.Printf("Setting logged_in cookie")
			c.SetCookie("logged_in", "true", 3600*24*30, "/", "", false, false)
			c.SetSameSite(http.SameSiteLaxMode)
		}

		// Hiển thị trang chính
		// Kiểm tra đã xác thực Google Drive chưa
		isGoogleAuthenticated := h.DriveUploader.CheckAuth()

		// In ra thông tin xác thực Google Drive
		log.Printf("Google Drive authentication: %v", isGoogleAuthenticated)

		// Lấy danh sách các file backup
		log.Printf("Đang lấy danh sách backup từ database...")
		backups, err := backupdb.GetAllBackups()
		if err != nil {
			log.Printf("Lỗi khi lấy danh sách backup: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   fmt.Sprintf("Không thể lấy danh sách backup: %v", err),
			})
			return
		}

		log.Printf("Đã lấy được %d files backup", len(backups))

		c.JSON(http.StatusOK, gin.H{
			"success":            true,
			"backups":            backups,
			"driveAuthenticated": isGoogleAuthenticated,
		})
		return
	}

	// Chưa xác thực
	c.JSON(http.StatusUnauthorized, gin.H{
		"success": false,
		"error":   "Vui lòng đăng nhập để sử dụng API",
	})
}

// getAuthMethod trả về phương thức xác thực được sử dụng
func getAuthMethod(cookieValue, authToken, authHeader string) string {
	methods := []string{}

	if cookieValue == "true" {
		methods = append(methods, "logged_in cookie")
	}

	if authToken != "" {
		methods = append(methods, "auth_token cookie")
	}

	if authHeader != "" {
		methods = append(methods, "Authorization header")
	}

	if len(methods) == 0 {
		return "unknown"
	}

	return strings.Join(methods, ", ")
}

// AuthHandler xử lý trang xác thực
func (h *Handler) AuthHandler(c *gin.Context) {
	// Tạo URL xác thực
	authURL := h.DriveUploader.GetAuthURL()
	fmt.Printf("URL xác thực Google Drive: %s\n", authURL)

	// Hiển thị hướng dẫn trong terminal
	fmt.Println("\n=== HƯỚNG DẪN XÁC THỰC GOOGLE DRIVE ===")
	fmt.Println("1. Sao chép URL sau vào trình duyệt:")
	fmt.Println(authURL)
	fmt.Println("2. Đăng nhập Google và cho phép quyền truy cập")
	fmt.Println("3. Bạn sẽ được chuyển hướng đến trang callback của ứng dụng")
	fmt.Println("4. Xác thực sẽ được hoàn tất tự động\n")

	// Chuyển hướng người dùng đến trang xác thực Google
	c.Redirect(http.StatusFound, authURL)
}

// AuthCallbackHandler xử lý callback từ Google OAuth
func (h *Handler) AuthCallbackHandler(c *gin.Context) {
	// Lấy mã xác thực từ query parameters
	code := c.Query("code")
	if code == "" {
		log.Printf("❌ Callback không có mã xác thực")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Không nhận được mã xác thực từ Google. Vui lòng thử lại.",
		})
		return
	}

	log.Printf("✅ Đã nhận mã xác thực từ Google, độ dài: %d", len(code))

	// Đổi mã xác thực lấy token
	log.Printf("Bắt đầu đổi mã xác thực lấy token...")
	token, err := h.DriveUploader.ExchangeAuthCode(code)
	if err != nil {
		log.Printf("❌ Lỗi khi đổi mã xác thực: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Lỗi xác thực: %v", err),
		})
		return
	}

	log.Printf("✅ Đã lấy token thành công. Token hết hạn vào: %v", token.Expiry)

	// Trả về thông tin token
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xác thực Google Drive thành công!",
		"token_info": map[string]string{
			"expires_at": token.Expiry.Format("02/01/2006 15:04:05"),
		},
	})
}

// DumpHandler xử lý yêu cầu dump database
func (h *Handler) DumpHandler(c *gin.Context) {
	// Kiểm tra các phương thức xác thực
	cookieValue, _ := c.Cookie("logged_in")
	authToken, _ := c.Cookie("auth_token")
	authHeader := c.GetHeader("Authorization")

	// Nếu không có bất kỳ phương thức xác thực nào
	if cookieValue != "true" && authToken == "" && authHeader == "" {
		c.Redirect(http.StatusSeeOther, "/?success=false&message=Vui lòng đăng nhập để thực hiện thao tác này")
		return
	}

	// Thực hiện dump database
	result, err := h.DatabaseDumper.DumpDatabase()
	if err != nil {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Lỗi khi dump database: %v", err))
		return
	}

	c.Redirect(http.StatusSeeOther, "/?success=true&message="+fmt.Sprintf("Đã dump database thành công. File: %s", filepath.Base(result.FilePath)))
}

// UploadLastHandler xử lý yêu cầu upload file mới nhất
func (h *Handler) UploadLastHandler(c *gin.Context) {
	// Kiểm tra các phương thức xác thực
	cookieValue, _ := c.Cookie("logged_in")
	authToken, _ := c.Cookie("auth_token")
	authHeader := c.GetHeader("Authorization")

	// Nếu không có bất kỳ phương thức xác thực nào
	if cookieValue != "true" && authToken == "" && authHeader == "" {
		c.Redirect(http.StatusSeeOther, "/?success=false&message=Vui lòng đăng nhập để thực hiện thao tác này")
		return
	}

	// Kiểm tra xác thực Google Drive
	if !h.DriveUploader.CheckAuth() {
		c.Redirect(http.StatusSeeOther, "/auth")
		return
	}

	// Tìm file backup mới nhất
	latestBackup, err := backupdb.FindLatestBackup()
	if err != nil {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Không tìm thấy file backup: %v", err))
		return
	}

	// Upload file lên Drive
	result := h.DriveUploader.UploadFile(latestBackup.Path)
	if !result.Success {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Lỗi khi upload file: %v", result.Message))
		return
	}

	c.Redirect(http.StatusSeeOther, "/?success=true&message="+fmt.Sprintf("Đã upload file %s lên Google Drive", latestBackup.Name))
}

// UploadAllHandler xử lý yêu cầu upload tất cả file
func (h *Handler) UploadAllHandler(c *gin.Context) {
	// Kiểm tra các phương thức xác thực
	cookieValue, _ := c.Cookie("logged_in")
	authToken, _ := c.Cookie("auth_token")
	authHeader := c.GetHeader("Authorization")

	// Nếu không có bất kỳ phương thức xác thực nào
	if cookieValue != "true" && authToken == "" && authHeader == "" {
		c.Redirect(http.StatusSeeOther, "/?success=false&message=Vui lòng đăng nhập để thực hiện thao tác này")
		return
	}

	// Kiểm tra xác thực Google Drive
	if !h.DriveUploader.CheckAuth() {
		c.Redirect(http.StatusSeeOther, "/auth")
		return
	}

	// Upload tất cả file backup
	err := h.DriveUploader.UploadAllBackups()
	if err != nil {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Lỗi khi upload tất cả file: %v", err))
		return
	}

	c.Redirect(http.StatusSeeOther, "/?success=true&message=Đã upload tất cả file backup lên Google Drive")
}

// UploadSingleHandler xử lý yêu cầu upload một file cụ thể
func (h *Handler) UploadSingleHandler(c *gin.Context) {
	// Kiểm tra các phương thức xác thực
	cookieValue, _ := c.Cookie("logged_in")
	authToken, _ := c.Cookie("auth_token")
	authHeader := c.GetHeader("Authorization")

	// Nếu không có bất kỳ phương thức xác thực nào
	if cookieValue != "true" && authToken == "" && authHeader == "" {
		c.Redirect(http.StatusSeeOther, "/?success=false&message=Vui lòng đăng nhập để thực hiện thao tác này")
		return
	}

	// Kiểm tra xác thực Google Drive
	if !h.DriveUploader.CheckAuth() {
		c.Redirect(http.StatusSeeOther, "/auth")
		return
	}

	fileID := c.Param("id")
	backups, err := backupdb.GetAllBackups()
	if err != nil {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Không thể lấy danh sách backup: %v", err))
		return
	}

	// Tìm file backup theo ID
	var targetBackup *models.BackupFile
	for _, backup := range backups {
		if backup.ID == fileID {
			targetBackup = backup
			break
		}
	}

	if targetBackup == nil {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Không tìm thấy file backup có ID: %s", fileID))
		return
	}

	// Upload file lên Drive
	result := h.DriveUploader.UploadFile(targetBackup.Path)
	if !result.Success {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Lỗi khi upload file: %v", result.Message))
		return
	}

	c.Redirect(http.StatusSeeOther, "/?success=true&message="+fmt.Sprintf("Đã upload file %s lên Google Drive", targetBackup.Name))
}

// DownloadHandler xử lý yêu cầu tải xuống file backup
func (h *Handler) DownloadHandler(c *gin.Context) {
	// Kiểm tra các phương thức xác thực
	cookieValue, _ := c.Cookie("logged_in")
	authToken, _ := c.Cookie("auth_token")
	authHeader := c.GetHeader("Authorization")
	token := c.Query("token")

	// Nếu không có bất kỳ phương thức xác thực nào
	if cookieValue != "true" && authToken == "" && authHeader == "" && token == "" {
		c.Redirect(http.StatusSeeOther, "/?success=false&message=Vui lòng đăng nhập để thực hiện thao tác này")
		return
	}

	// Nếu có token từ query parameter, xác thực token
	if token != "" {
		_, err := auth.ValidateJWT(token)
		if err != nil {
			c.Redirect(http.StatusSeeOther, "/?success=false&message=Phiên đăng nhập không hợp lệ hoặc đã hết hạn")
			return
		}
	}

	fileID := c.Param("id")
	backups, err := backupdb.GetAllBackups()
	if err != nil {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Không thể lấy danh sách backup: %v", err))
		return
	}

	// Tìm file backup theo ID
	var targetBackup *models.BackupFile
	for _, backup := range backups {
		if backup.ID == fileID {
			targetBackup = backup
			break
		}
	}

	if targetBackup == nil {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("Không tìm thấy file backup có ID: %s", fileID))
		return
	}

	// Kiểm tra file có tồn tại không
	if _, err := os.Stat(targetBackup.Path); os.IsNotExist(err) {
		c.Redirect(http.StatusSeeOther, "/?success=false&message="+fmt.Sprintf("File %s không tồn tại", targetBackup.Name))
		return
	}

	// Trả về file để tải xuống
	c.FileAttachment(targetBackup.Path, targetBackup.Name)
}

// GetBackupsHandler xử lý lấy danh sách backup qua API
func (h *Handler) GetBackupsHandler(c *gin.Context) {
	backups, err := backupdb.GetAllBackups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Không thể lấy danh sách backup: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"backups": backups,
	})
}
