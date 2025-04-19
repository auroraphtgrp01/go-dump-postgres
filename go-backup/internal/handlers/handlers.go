package handlers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/backup-cronjob/internal/auth"
	"github.com/backup-cronjob/internal/backupdb"
	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/dbdump"
	"github.com/backup-cronjob/internal/drive"
	"github.com/backup-cronjob/internal/models"
	"github.com/backup-cronjob/internal/scheduler"
	"github.com/gin-gonic/gin"
)

// Handler quản lý tất cả các xử lý HTTP
type Handler struct {
	Config         *config.Config
	DatabaseDumper *dbdump.DatabaseDumper
	DriveUploader  *drive.DriveUploader
	Scheduler      *scheduler.Scheduler
}

// NewHandler tạo instance mới của Handler
func NewHandler(cfg *config.Config, scheduler *scheduler.Scheduler) *Handler {
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
		Scheduler:      scheduler,
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

	// Thay vì trả về JSON, trả về HTML với script tự đóng cửa sổ
	htmlResponse := `
	<!DOCTYPE html>
	<html>
	<head>
		<title>Xác thực thành công</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				text-align: center;
				margin-top: 50px;
				background-color: #f0f2f5;
			}
			.container {
				background-color: white;
				border-radius: 8px;
				box-shadow: 0 2px 10px rgba(0,0,0,0.1);
				padding: 30px;
				max-width: 500px;
				margin: 0 auto;
			}
			.success-icon {
				color: #52c41a;
				font-size: 48px;
				margin-bottom: 20px;
			}
			h2 {
				color: #333;
				margin-bottom: 15px;
			}
			p {
				color: #666;
				margin-bottom: 20px;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="success-icon">✓</div>
			<h2>Xác thực Google Drive thành công!</h2>
			<p>Token sẽ hết hạn vào: ` + token.Expiry.Format("02/01/2006 15:04:05") + `</p>
			<p>Bạn có thể đóng cửa sổ này và quay lại ứng dụng.</p>
		</div>
		<script>
			// Thông báo cho cửa sổ chính rằng xác thực đã hoàn tất
			if (window.opener && !window.opener.closed) {
				window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', success: true }, "*");
			}
			
			// Tự động đóng cửa sổ sau 3 giây
			setTimeout(function() {
				window.close();
			}, 3000);
		</script>
	</body>
	</html>
	`

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, htmlResponse)
}

// DumpHandler xử lý yêu cầu dump database
func (h *Handler) DumpHandler(c *gin.Context) {
	// Lấy profile ID từ query hoặc JSON body
	var profileId int64 = 0

	// Thử lấy từ form data hoặc JSON
	type DumpRequest struct {
		ProfileID int64 `json:"profile_id" form:"profile_id"`
	}

	var req DumpRequest
	if err := c.ShouldBind(&req); err == nil && req.ProfileID > 0 {
		profileId = req.ProfileID
	}

	// Nếu không có trong JSON, thử lấy từ query string
	if profileId == 0 {
		if idStr := c.Query("profile_id"); idStr != "" {
			if id, err := strconv.ParseInt(idStr, 10, 64); err == nil {
				profileId = id
			}
		}
	}

	// Thực hiện dump database với profile đã chọn
	result, err := h.DatabaseDumper.DumpDatabase(profileId)
	if err != nil {
		log.Printf("Lỗi khi dump database: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Lỗi khi dump database: %v", err),
		})
		return
	}

	// Trả về kết quả thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã dump database thành công. File: %s", filepath.Base(result.FilePath)),
		"result": gin.H{
			"filePath": result.FilePath,
			"fileName": filepath.Base(result.FilePath),
			"fileSize": result.FileSize,
		},
	})
}

// UploadLastHandler xử lý yêu cầu upload file mới nhất
func (h *Handler) UploadLastHandler(c *gin.Context) {
	// Kiểm tra xác thực Google Drive
	if !h.DriveUploader.CheckAuth() {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":  false,
			"message":  "Chưa xác thực với Google Drive. Vui lòng thực hiện xác thực trước.",
			"redirect": "/auth",
		})
		return
	}

	// Kiểm tra vấn đề cấu hình
	configIssues := h.DriveUploader.CheckDriveConfig()
	if len(configIssues) > 0 {
		errorMessages := []string{}
		for key, issue := range configIssues {
			errorMessages = append(errorMessages, fmt.Sprintf("%s: %s", key, issue))
		}
		errorMsg := fmt.Sprintf("Có vấn đề với cấu hình Google Drive: %s", strings.Join(errorMessages, "; "))

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": errorMsg,
			"issues":  configIssues,
		})
		return
	}

	// Tìm file mới nhất
	latestBackup, err := backupdb.FindLatestBackup()
	if err != nil || latestBackup == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Không tìm thấy file backup mới nhất",
		})
		return
	}

	// Kiểm tra file có tồn tại không
	if _, err := os.Stat(latestBackup.Path); os.IsNotExist(err) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("File không tồn tại: %s", latestBackup.Path),
		})
		return
	}

	// Upload file
	result := h.DriveUploader.UploadFile(latestBackup.Path)
	if !result.Success {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Lỗi khi upload file: %s", result.Message),
		})
		return
	}

	// Cập nhật trạng thái đã upload
	backupID, err := strconv.ParseInt(latestBackup.ID, 10, 64)
	if err != nil {
		log.Printf("Cảnh báo: Không thể chuyển đổi ID backup: %v", err)
	} else {
		if err := database.UpdateBackupUploadStatus(backupID, true, result.WebLink); err != nil {
			log.Printf("Cảnh báo: Không thể cập nhật trạng thái upload: %v", err)
		} else {
			log.Printf("Đã cập nhật trạng thái upload thành công cho file ID: %d, link: %s", backupID, result.WebLink)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã upload file %s thành công", latestBackup.Name),
		"result": gin.H{
			"fileId":   result.FileID,
			"fileName": latestBackup.Name,
			"webLink":  result.WebLink,
		},
	})
}

// UploadAllHandler xử lý yêu cầu upload tất cả file
func (h *Handler) UploadAllHandler(c *gin.Context) {
	// Kiểm tra xác thực Google Drive
	if !h.DriveUploader.CheckAuth() {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":  false,
			"message":  "Chưa xác thực với Google Drive. Vui lòng thực hiện xác thực trước.",
			"redirect": "/auth",
		})
		return
	}

	// Kiểm tra vấn đề cấu hình
	configIssues := h.DriveUploader.CheckDriveConfig()
	if len(configIssues) > 0 {
		errorMessages := []string{}
		for key, issue := range configIssues {
			errorMessages = append(errorMessages, fmt.Sprintf("%s: %s", key, issue))
		}
		errorMsg := fmt.Sprintf("Có vấn đề với cấu hình Google Drive: %s", strings.Join(errorMessages, "; "))

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": errorMsg,
			"issues":  configIssues,
		})
		return
	}

	// Upload tất cả file
	err := h.DriveUploader.UploadAllBackups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Lỗi khi upload tất cả file: %v", err),
		})
		return
	}

	// Lấy thông tin các file đã upload
	backups, err := backupdb.GetAllBackups()
	if err != nil {
		log.Printf("Cảnh báo: Không thể lấy thông tin backups: %v", err)
	}

	// Đếm số file đã upload thành công
	successCount := 0
	for _, backup := range backups {
		if backup.Uploaded {
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã upload các file thành công (%d file)", successCount),
		"results": backups,
	})
}

// UploadSingleHandler xử lý yêu cầu upload một file cụ thể
func (h *Handler) UploadSingleHandler(c *gin.Context) {
	// Kiểm tra các phương thức xác thực
	cookieValue, _ := c.Cookie("logged_in")
	authToken, _ := c.Cookie("auth_token")
	authHeader := c.GetHeader("Authorization")

	// Biến để theo dõi trạng thái xác thực
	isAuthenticated := false

	// Kiểm tra cookie logged_in và auth_token
	if cookieValue == "true" && authToken != "" {
		// Xác thực JWT token trong cookie
		_, err := auth.ValidateJWT(authToken)
		if err == nil {
			isAuthenticated = true
		}
	}

	// Kiểm tra Authorization header nếu chưa xác thực
	if !isAuthenticated && authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token := authHeader[7:]
		// Xác thực JWT token trong header
		_, err := auth.ValidateJWT(token)
		if err == nil {
			isAuthenticated = true
		}
	}

	// Nếu không xác thực được bằng bất kỳ phương thức nào
	if !isAuthenticated {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Vui lòng đăng nhập để thực hiện thao tác này",
		})
		return
	}

	// Kiểm tra xác thực Google Drive
	if !h.DriveUploader.CheckAuth() {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":  false,
			"message":  "Chưa xác thực với Google Drive. Vui lòng thực hiện xác thực trước.",
			"redirect": "/auth",
		})
		return
	}

	// Kiểm tra vấn đề cấu hình
	configIssues := h.DriveUploader.CheckDriveConfig()
	if len(configIssues) > 0 {
		errorMessages := []string{}
		for key, issue := range configIssues {
			errorMessages = append(errorMessages, fmt.Sprintf("%s: %s", key, issue))
		}
		errorMsg := fmt.Sprintf("Có vấn đề với cấu hình Google Drive: %s", strings.Join(errorMessages, "; "))

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": errorMsg,
			"issues":  configIssues,
		})
		return
	}

	fileID := c.Param("id")
	backups, err := backupdb.GetAllBackups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Không thể lấy danh sách backup: %v", err),
		})
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
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": fmt.Sprintf("Không tìm thấy file backup có ID: %s", fileID),
		})
		return
	}

	// Kiểm tra file có tồn tại không
	if _, err := os.Stat(targetBackup.Path); os.IsNotExist(err) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("File không tồn tại trên hệ thống: %s", targetBackup.Path),
		})
		return
	}

	// Upload file lên Drive
	result := h.DriveUploader.UploadFile(targetBackup.Path)
	if !result.Success {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Lỗi khi upload file: %v", result.Message),
		})
		return
	}

	// Cập nhật trạng thái đã upload
	backupID, err := strconv.ParseInt(targetBackup.ID, 10, 64)
	if err != nil {
		log.Printf("Cảnh báo: Không thể chuyển đổi ID backup: %v", err)
	} else {
		if err := backupdb.UpdateBackupUploadStatus(backupID, true, result.WebLink); err != nil {
			log.Printf("Cảnh báo: Không thể cập nhật trạng thái upload: %v", err)
		} else {
			log.Printf("Đã cập nhật trạng thái upload thành công cho file ID: %d, link: %s", backupID, result.WebLink)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã upload file %s lên Google Drive", targetBackup.Name),
		"result": gin.H{
			"fileId":   result.FileID,
			"fileName": targetBackup.Name,
			"webLink":  result.WebLink,
		},
	})
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

// CheckDriveStatusHandler xử lý kiểm tra trạng thái và cấu hình Google Drive
func (h *Handler) CheckDriveStatusHandler(c *gin.Context) {
	// Kiểm tra và thu thập thông tin về Google Drive
	isAuthenticated := h.DriveUploader.CheckAuth()
	configIssues := h.DriveUploader.CheckDriveConfig()

	// Kiểm tra thông tin cấu hình
	clientIDStatus := "OK"
	clientSecretStatus := "OK"
	tokenStatus := "OK"
	folderStatus := "OK"

	if issue, exists := configIssues["GoogleClientID"]; exists {
		clientIDStatus = issue
	}

	if issue, exists := configIssues["GoogleClientSecret"]; exists {
		clientSecretStatus = issue
	}

	if issue, exists := configIssues["AuthToken"]; exists {
		tokenStatus = issue
	}

	if issue, exists := configIssues["FolderDrive"]; exists {
		folderStatus = issue
	}

	// Kiểm tra token info
	var tokenInfo map[string]interface{}
	tokenFile := filepath.Join(h.Config.TokenDir, "token.json")
	if _, err := os.Stat(tokenFile); err == nil {
		token, err := h.DriveUploader.TokenFromFile(tokenFile)
		if err == nil {
			tokenInfo = map[string]interface{}{
				"expires_at":        token.Expiry.Format("02/01/2006 15:04:05"),
				"has_refresh_token": token.RefreshToken != "",
				"expired":           token.Expiry.Before(time.Now()),
			}
		}
	}

	// Trả về tất cả thông tin
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"drive_status": map[string]interface{}{
			"is_authenticated":     isAuthenticated,
			"has_issues":           len(configIssues) > 0,
			"config_issues":        configIssues,
			"client_id_status":     clientIDStatus,
			"client_secret_status": clientSecretStatus,
			"token_status":         tokenStatus,
			"folder_status":        folderStatus,
			"token_info":           tokenInfo,
		},
	})
}

// GetAuthURLHandler trả về URL xác thực Google Drive
func (h *Handler) GetAuthURLHandler(c *gin.Context) {
	// Tạo URL xác thực
	authURL := h.DriveUploader.GetAuthURL()
	log.Printf("URL xác thực Google Drive: %s\n", authURL)

	// Trả về URL xác thực
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"auth_url": authURL,
	})
}

// ExchangeAuthCodeHandler nhận mã xác thực và đổi lấy token
func (h *Handler) ExchangeAuthCodeHandler(c *gin.Context) {
	// Lấy mã xác thực từ request body
	var request struct {
		Code string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Printf("❌ Lỗi khi đọc mã xác thực: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Không nhận được mã xác thực. Vui lòng thử lại.",
		})
		return
	}

	// Kiểm tra mã xác thực có trống không
	if request.Code == "" {
		log.Printf("❌ Mã xác thực trống")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Mã xác thực không được để trống. Vui lòng thử lại.",
		})
		return
	}

	log.Printf("✅ Đã nhận mã xác thực từ Google, độ dài: %d", len(request.Code))

	// Đổi mã xác thực lấy token
	log.Printf("Bắt đầu đổi mã xác thực lấy token...")
	token, err := h.DriveUploader.ExchangeAuthCode(request.Code)
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

// DeleteBackupHandler xử lý yêu cầu xóa file backup
func (h *Handler) DeleteBackupHandler(c *gin.Context) {
	fileID := c.Param("id")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID của file backup không được để trống",
		})
		return
	}

	// Chuyển đổi ID từ string sang int64
	backupID, err := strconv.ParseInt(fileID, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("ID không hợp lệ: %v", err),
		})
		return
	}

	// Lấy thông tin backup trước khi xóa
	backups, err := backupdb.GetAllBackups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Không thể lấy thông tin backup: %v", err),
		})
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
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": fmt.Sprintf("Không tìm thấy file backup có ID: %s", fileID),
		})
		return
	}

	// Xóa file backup từ hệ thống file nếu tồn tại
	if targetBackup.FileExists {
		if err := os.Remove(targetBackup.Path); err != nil {
			log.Printf("Lỗi khi xóa file backup %s: %v", targetBackup.Path, err)
			// Tiếp tục xóa bản ghi trong database ngay cả khi không thể xóa file
		}
	}

	// Xóa bản ghi từ database
	if err := database.DeleteBackup(backupID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Lỗi khi xóa bản ghi backup: %v", err),
		})
		return
	}

	// Trả về kết quả thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã xóa backup %s thành công", targetBackup.Name),
	})
}

// GetScheduleOptionsHandler trả về các tùy chọn lịch trình
func (h *Handler) GetScheduleOptionsHandler(c *gin.Context) {
	options := models.GetScheduleOptions()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"options": options,
	})
}

// GetActiveJobsHandler trả về danh sách các công việc backup đang chạy
func (h *Handler) GetActiveJobsHandler(c *gin.Context) {
	jobs := h.Scheduler.GetActiveJobs()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"jobs":    jobs,
	})
}

// UpdateScheduleHandler cập nhật lịch backup cho profile
func (h *Handler) UpdateScheduleHandler(c *gin.Context) {
	var req struct {
		ProfileID    int64  `json:"profile_id" binding:"required"`
		CronSchedule string `json:"cron_schedule"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Dữ liệu không hợp lệ: %v", err),
		})
		return
	}

	// Lấy thông tin profile
	profile, err := database.GetProfileByID(req.ProfileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không tìm thấy profile với ID %d: %v", req.ProfileID, err),
		})
		return
	}

	// Cập nhật lịch trình
	profile.CronSchedule = req.CronSchedule
	if err := database.UpdateProfile(*profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể cập nhật profile: %v", err),
		})
		return
	}

	// Cập nhật lịch trình trong scheduler
	if req.CronSchedule == "" {
		// Nếu lịch rỗng, xóa job
		h.Scheduler.RemoveJob(req.ProfileID)
	} else {
		// Thêm hoặc cập nhật job
		if err := h.Scheduler.AddJob(req.ProfileID, req.CronSchedule, profile.Name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   fmt.Sprintf("Không thể thêm lịch backup: %v", err),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã cập nhật lịch backup cho profile %s", profile.Name),
	})
}

// DeleteScheduleHandler xóa lịch backup của profile
func (h *Handler) DeleteScheduleHandler(c *gin.Context) {
	var req struct {
		ProfileID int64 `json:"profile_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Dữ liệu không hợp lệ: %v", err),
		})
		return
	}

	// Lấy thông tin profile
	profile, err := database.GetProfileByID(req.ProfileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không tìm thấy profile với ID %d: %v", req.ProfileID, err),
		})
		return
	}

	// Xóa job từ scheduler
	h.Scheduler.RemoveJob(req.ProfileID)

	// Cập nhật lịch trình trong cơ sở dữ liệu
	profile.CronSchedule = ""
	if err := database.UpdateProfile(*profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể cập nhật profile: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã xóa lịch backup cho profile %s", profile.Name),
	})
}

// PauseScheduleHandler tạm dừng một lịch backup
func (h *Handler) PauseScheduleHandler(c *gin.Context) {
	var req struct {
		ProfileID int64 `json:"profile_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Dữ liệu không hợp lệ: %v", err),
		})
		return
	}

	// Lấy thông tin profile
	profile, err := database.GetProfileByID(req.ProfileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không tìm thấy profile với ID %d: %v", req.ProfileID, err),
		})
		return
	}

	// Tạm dừng job trong scheduler
	if err := h.Scheduler.PauseJob(req.ProfileID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể tạm dừng lịch backup: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã tạm dừng lịch backup cho profile %s", profile.Name),
	})
}

// ResumeScheduleHandler tiếp tục một lịch backup đã tạm dừng
func (h *Handler) ResumeScheduleHandler(c *gin.Context) {
	var req struct {
		ProfileID int64 `json:"profile_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Dữ liệu không hợp lệ: %v", err),
		})
		return
	}

	// Lấy thông tin profile
	profile, err := database.GetProfileByID(req.ProfileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không tìm thấy profile với ID %d: %v", req.ProfileID, err),
		})
		return
	}

	// Tiếp tục chạy job trong scheduler
	if err := h.Scheduler.ResumeJob(req.ProfileID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể tiếp tục lịch backup: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã tiếp tục lịch backup cho profile %s", profile.Name),
	})
}

// GetJobLogsHandler trả về lịch sử chạy job của một profile
func (h *Handler) GetJobLogsHandler(c *gin.Context) {
	profileID := c.Param("id")
	if profileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Thiếu ID profile",
		})
		return
	}

	id, err := strconv.ParseInt(profileID, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("ID profile không hợp lệ: %v", err),
		})
		return
	}

	// Mặc định lấy 20 bản ghi gần nhất
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	logs, err := database.GetJobLogsByProfile(id, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể lấy lịch sử job: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"logs":    logs,
	})
}

// RunBackupNowHandler thực hiện backup ngay lập tức
func (h *Handler) RunBackupNowHandler(c *gin.Context) {
	var req struct {
		ProfileID int64 `json:"profile_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Dữ liệu không hợp lệ: %v", err),
		})
		return
	}

	// Kiểm tra profile tồn tại
	profile, err := database.GetProfileByID(req.ProfileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không tìm thấy profile với ID %d: %v", req.ProfileID, err),
		})
		return
	}

	// Thực hiện backup ngay lập tức
	go func() {
		err := h.Scheduler.RunBackupNow(req.ProfileID)
		if err != nil {
			log.Printf("Lỗi khi thực hiện backup ngay lập tức cho profile %s: %v", profile.Name, err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã bắt đầu thực hiện backup cho profile %s", profile.Name),
	})
}
