package handlers

import (
	"net/http"

	"log"

	"github.com/backup-cronjob/internal/auth"
	"github.com/backup-cronjob/internal/models"
	"github.com/gin-gonic/gin"
)

// LoginHandler xử lý đăng nhập
func (h *Handler) LoginHandler(c *gin.Context) {
	// Parse the request body
	var loginData struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&loginData); err != nil {
		log.Printf("Lỗi decode JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu đăng nhập không hợp lệ",
		})
		return
	}

	// Authenticate using the AuthenticateUser function which checks both database and config
	user, err := auth.AuthenticateUser(&models.Auth{
		Username: loginData.Username,
		Password: loginData.Password,
	})

	if err != nil {
		log.Printf("Đăng nhập thất bại: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Tên đăng nhập hoặc mật khẩu không chính xác",
		})
		return
	}

	// Generate a JWT token
	token, err := auth.GenerateJWT(user)
	if err != nil {
		log.Printf("Lỗi tạo JWT: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi xác thực",
		})
		return
	}

	// Set the auth_token cookie
	c.SetCookie(
		"auth_token",
		token,
		3600*24, // 1 day in seconds
		"/",
		"",
		false,
		true,
	)
	c.SetSameSite(http.SameSiteLaxMode)
	log.Printf("Set auth_token cookie for user: %s", user.Username)

	// Set the logged_in cookie
	c.SetCookie(
		"logged_in",
		"true",
		3600*24, // 1 day in seconds
		"/",
		"",
		false,
		false,
	)
	c.SetSameSite(http.SameSiteLaxMode)
	log.Printf("Set logged_in cookie for user: %s", user.Username)

	// Return the token in the response body
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đăng nhập thành công",
		"token":   token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
		},
	})
	log.Printf("User logged in successfully: %s", user.Username)
}

// MeHandler trả về thông tin người dùng hiện tại
func (h *Handler) MeHandler(c *gin.Context) {
	// Lấy thông tin người dùng đã được lưu trong middleware
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Trả về thông tin người dùng
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":       userID,
			"username": username,
		},
	})
}

// LogoutHandler xử lý đăng xuất
func (h *Handler) LogoutHandler(c *gin.Context) {
	// Lấy thông tin về người dùng đang đăng xuất để ghi log
	authHeader := c.GetHeader("Authorization")
	var username string
	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token := authHeader[7:]
		claims, err := auth.ValidateJWT(token)
		if err == nil && claims != nil {
			username = claims.Username
		}
	}

	// Xóa cả hai cookie đăng nhập với cùng các tham số như khi tạo
	// Xóa cookie logged_in
	c.SetCookie(
		"logged_in", // Tên cookie
		"",          // Giá trị rỗng
		-1,          // Thời gian âm = xóa cookie
		"/",         // Path
		"",          // Domain
		false,       // Secure
		false,       // HttpOnly
	)

	// Xóa cookie auth_token
	c.SetCookie(
		"auth_token", // Tên cookie
		"",           // Giá trị rỗng
		-1,           // Thời gian âm = xóa cookie
		"/",          // Path
		"",           // Domain
		false,        // Secure
		true,         // HttpOnly
	)

	// Đảm bảo thuộc tính SameSite khớp với khi tạo cookie
	c.SetSameSite(http.SameSiteLaxMode)

	// Ghi log đăng xuất
	log.Printf("User %s logged out, all cookies deleted", username)

	// Phản hồi thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đăng xuất thành công",
	})
}
